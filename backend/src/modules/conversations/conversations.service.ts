import { env } from '../../config/env.js';
import { AppError, notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import type { AiService } from '../ai/ai.service.js';
import type { LlmMessage } from '../ai/llm-provider.js';
import { asUntrustedData, CHAT_GUIDANCE } from '../ai/prompts.js';
import { findCatalogProductById } from '../catalog/catalog.service.js';

const messageSelect = { id: true, role: true, content: true, model: true, createdAt: true } as const;

function buildTitle(message: string): string {
  const clean = message.replace(/\s+/g, ' ').trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean;
}

/** Monta o contexto dos produtos do catálogo público escolhidos pelo usuário. */
async function buildProductContext(productIds: string[]): Promise<string | null> {
  if (productIds.length === 0) return null;
  const products = await Promise.all(productIds.map((id) => findCatalogProductById(id)));
  const text = products
    .map(
      (product) =>
        `Produto: ${product.name} | Marca: ${product.brand} | Categoria: ${product.category}\n` +
        `Ingredientes (ordem do rótulo): ${product.ingredients.map((item) => item.ingredient.name).join(', ')}`,
    )
    .join('\n\n');
  return asUntrustedData('produtos_selecionados', text);
}

async function generateReply(params: {
  userId: string;
  ai: AiService;
  history: LlmMessage[];
  message: string;
  productIds: string[];
}) {
  if (params.message.length > params.ai.maxInputChars) {
    throw new AppError(400, 'VALIDATION_ERROR', `A mensagem deve ter no máximo ${params.ai.maxInputChars} caracteres.`);
  }
  const productContext = await buildProductContext(params.productIds);
  const guidance = productContext
    ? `${CHAT_GUIDANCE}\n\nContexto fornecido pelo usuário:\n${productContext}`
    : CHAT_GUIDANCE;
  return params.ai.generate({
    userId: params.userId,
    feature: 'CHAT',
    guidance,
    messages: [...params.history, { role: 'user', content: params.message }],
  });
}

/**
 * Cria uma conversa somente se a IA responder com sucesso, para não deixar
 * conversas órfãs sem resposta no histórico.
 */
export async function startConversation(userId: string, message: string, productIds: string[], ai: AiService) {
  const reply = await generateReply({ userId, ai, history: [], message, productIds });
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: buildTitle(message),
      messages: {
        create: [
          { role: 'USER', content: message },
          { role: 'ASSISTANT', content: reply.text, model: reply.model },
        ],
      },
    },
    include: { messages: { orderBy: { createdAt: 'asc' }, select: messageSelect } },
  });
  return conversation;
}

async function findOwnedConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
  if (!conversation) throw notFound('Conversa');
  return conversation;
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  message: string,
  productIds: string[],
  ai: AiService,
) {
  const conversation = await findOwnedConversation(userId, conversationId);
  const recent = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: env.AI_HISTORY_MESSAGES,
    select: { role: true, content: true },
  });
  const history: LlmMessage[] = recent.reverse().map((item) => ({
    role: item.role === 'USER' ? 'user' : 'assistant',
    content: item.content,
  }));
  // A API de mensagens exige que o histórico comece com uma mensagem do usuário.
  while (history[0]?.role === 'assistant') history.shift();

  const reply = await generateReply({ userId, ai, history, message, productIds });

  const now = Date.now();
  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, role: 'USER', content: message, createdAt: new Date(now) },
      select: messageSelect,
    }),
    prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: reply.text,
        model: reply.model,
        createdAt: new Date(now + 1),
      },
      select: messageSelect,
    }),
    prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
  ]);
  return { userMessage, assistantMessage };
}

export async function listConversations(userId: string, page: number, pageSize: number) {
  const [rows, total] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, title: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } },
    }),
    prisma.conversation.count({ where: { userId } }),
  ]);
  const items = rows.map(({ _count, ...conversation }) => ({ ...conversation, messageCount: _count.messages }));
  return buildPage(items, total, page, pageSize);
}

export async function getConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' }, select: messageSelect } },
  });
  if (!conversation) throw notFound('Conversa');
  return conversation;
}

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const result = await prisma.conversation.deleteMany({ where: { id: conversationId, userId } });
  if (result.count === 0) throw notFound('Conversa');
}

export async function clearConversations(userId: string): Promise<number> {
  return (await prisma.conversation.deleteMany({ where: { userId } })).count;
}
