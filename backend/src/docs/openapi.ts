import { z } from 'zod';
import { deleteAccountSchema, loginSchema, registerSchema } from '../modules/auth/auth.schemas.js';
import { createComparisonSchema } from '../modules/comparisons/comparisons.routes.js';
import { chatMessageSchema } from '../modules/conversations/conversations.routes.js';
import { ingredientLookupSchema } from '../modules/ingredients/ingredients.schemas.js';
import { PRODUCT_CATEGORIES, productInputSchema } from '../modules/products/products.schemas.js';

/** Converte um schema Zod de entrada em JSON Schema, mantendo uma única fonte de verdade. */
const toSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });

const jsonBody = (schema: z.ZodType) => ({
  required: true,
  content: { 'application/json': { schema: toSchema(schema) } },
});

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (description: string, schema?: object) => ({
  description,
  ...(schema ? { content: { 'application/json': { schema } } } : {}),
});

const errors = {
  400: json('Dados inválidos', ref('Error')),
  401: json('Não autenticado', ref('Error')),
  404: json('Recurso não encontrado ou pertencente a outro usuário', ref('Error')),
  429: json('Limite de requisições atingido', ref('Error')),
};
const aiErrors = {
  502: json('Resposta inválida da IA', ref('Error')),
  503: json('IA não configurada ou indisponível', ref('Error')),
  504: json('Tempo limite da IA excedido', ref('Error')),
};

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 12 } },
];
const secured = [{ bearerAuth: [] }];
const csrfHeader = {
  name: 'X-Requested-With',
  in: 'header',
  required: true,
  schema: { type: 'string', enum: ['SkinAI'] },
};

function crudHistory(tag: string, resource: string, extra: Record<string, object> = {}) {
  return {
    list: {
      tags: [tag],
      summary: `Lista ${resource}`,
      security: secured,
      parameters: pageParams,
      responses: { 200: json('Lista paginada', ref('Page')), 401: errors[401] },
    },
    clear: {
      tags: [tag],
      summary: `Exclui todos os registros de ${resource}`,
      security: secured,
      responses: { 200: json('Quantidade excluída'), 401: errors[401] },
    },
    get: {
      tags: [tag],
      summary: `Detalha um registro de ${resource}`,
      security: secured,
      parameters: [idParam],
      responses: { 200: json('Registro'), 401: errors[401], 404: errors[404] },
    },
    remove: {
      tags: [tag],
      summary: `Exclui um registro de ${resource}`,
      security: secured,
      parameters: [idParam],
      responses: { 204: json('Excluído'), 401: errors[401], 404: errors[404] },
    },
    ...extra,
  };
}

export function buildOpenApiDocument() {
  const analyses = crudHistory('Ingredientes', 'consultas de ingredientes');
  const comparisons = crudHistory('Comparador', 'comparações');
  const conversations = crudHistory('Assistente', 'conversas');

  return {
    openapi: '3.1.0',
    info: {
      title: 'SkinAI API',
      version: '1.0.0',
      description:
        'API REST do SkinAI. Autenticação via access token JWT (Bearer, curta duração) e refresh token em cookie httpOnly. Conteúdo educacional: não substitui orientação dermatológica.',
    },
    servers: [{ url: '/api' }],
    tags: [
      { name: 'Sistema' },
      { name: 'Autenticação' },
      { name: 'Dashboard' },
      { name: 'Produtos' },
      { name: 'Ingredientes' },
      { name: 'Comparador' },
      { name: 'Assistente' },
      { name: 'Histórico' },
    ],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {
                  type: 'array',
                  items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
                },
              },
              required: ['code', 'message'],
            },
          },
        },
        Page: {
          type: 'object',
          properties: {
            items: { type: 'array', items: {} },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        Session: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            accessToken: { type: 'string' },
          },
        },
        ProductCategory: { type: 'string', enum: PRODUCT_CATEGORIES },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Health check da API e do banco',
          responses: { 200: json('Serviço saudável'), 503: json('Banco indisponível') },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Autenticação'],
          summary: 'Cria uma conta',
          requestBody: jsonBody(registerSchema),
          responses: {
            201: json('Conta criada; refresh token enviado em cookie', ref('Session')),
            400: errors[400],
            409: json('E-mail já cadastrado', ref('Error')),
            429: errors[429],
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Autenticação'],
          summary: 'Autentica com e-mail e senha',
          requestBody: jsonBody(loginSchema),
          responses: { 200: json('Sessão criada', ref('Session')), 401: errors[401], 429: errors[429] },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Autenticação'],
          summary: 'Renova o access token usando o cookie (com rotação)',
          parameters: [csrfHeader],
          responses: { 200: json('Nova sessão', ref('Session')), 401: errors[401] },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Autenticação'],
          summary: 'Encerra a sessão e revoga o refresh token',
          parameters: [csrfHeader],
          responses: { 204: json('Sessão encerrada') },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Autenticação'],
          summary: 'Usuário autenticado',
          security: secured,
          responses: { 200: json('Usuário'), 401: errors[401] },
        },
        delete: {
          tags: ['Autenticação'],
          summary: 'Exclui a conta e todos os dados do usuário',
          security: secured,
          requestBody: jsonBody(deleteAccountSchema),
          responses: { 204: json('Conta excluída'), 403: json('Senha incorreta', ref('Error')) },
        },
      },
      '/dashboard': {
        get: {
          tags: ['Dashboard'],
          summary: 'Indicadores reais e atividades recentes',
          security: secured,
          responses: { 200: json('Dashboard'), 401: errors[401] },
        },
      },
      '/products': {
        get: {
          tags: ['Produtos'],
          summary: 'Lista produtos do usuário',
          security: secured,
          parameters: [
            ...pageParams,
            { name: 'q', in: 'query', description: 'Busca por nome ou marca', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: ref('ProductCategory') },
          ],
          responses: { 200: json('Lista paginada', ref('Page')), 401: errors[401] },
        },
        post: {
          tags: ['Produtos'],
          summary: 'Cadastra produto',
          security: secured,
          requestBody: jsonBody(productInputSchema),
          responses: { 201: json('Produto criado'), 400: errors[400], 401: errors[401] },
        },
      },
      '/products/{id}': {
        get: {
          tags: ['Produtos'],
          summary: 'Detalha produto',
          security: secured,
          parameters: [idParam],
          responses: { 200: json('Produto'), 404: errors[404] },
        },
        put: {
          tags: ['Produtos'],
          summary: 'Atualiza produto',
          security: secured,
          parameters: [idParam],
          requestBody: jsonBody(productInputSchema),
          responses: { 200: json('Produto atualizado'), 400: errors[400], 404: errors[404] },
        },
        delete: {
          tags: ['Produtos'],
          summary: 'Exclui produto',
          security: secured,
          parameters: [idParam],
          responses: { 204: json('Excluído'), 404: errors[404] },
        },
      },
      '/ingredients': {
        get: {
          tags: ['Ingredientes'],
          summary: 'Pesquisa o catálogo de ingredientes',
          security: secured,
          parameters: [
            ...pageParams,
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'curatedOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          ],
          responses: { 200: json('Lista paginada', ref('Page')) },
        },
      },
      '/ingredients/{id}': {
        get: {
          tags: ['Ingredientes'],
          summary: 'Detalha ingrediente, fontes e produtos do usuário que o contêm',
          security: secured,
          parameters: [idParam],
          responses: { 200: json('Ingrediente'), 404: errors[404] },
        },
      },
      '/ingredient-analyses': {
        get: analyses.list,
        post: {
          tags: ['Ingredientes'],
          summary: 'Consulta um ingrediente e registra no histórico',
          security: secured,
          requestBody: jsonBody(ingredientLookupSchema),
          responses: { 201: json('Consulta registrada'), 400: errors[400] },
        },
        delete: analyses.clear,
      },
      '/ingredient-analyses/{id}': { get: analyses.get, delete: analyses.remove },
      '/ingredient-analyses/{id}/explanation': {
        post: {
          tags: ['Ingredientes'],
          summary: 'Gera explicação por IA (separada da base de referência)',
          security: secured,
          parameters: [idParam],
          responses: { 200: json('Consulta com explicação'), 404: errors[404], 429: errors[429], ...aiErrors },
        },
      },
      '/comparisons': {
        get: comparisons.list,
        post: {
          tags: ['Comparador'],
          summary: 'Compara dois produtos com regras determinísticas',
          security: secured,
          requestBody: jsonBody(createComparisonSchema),
          responses: { 201: json('Comparação'), 400: errors[400], 404: errors[404] },
        },
        delete: comparisons.clear,
      },
      '/comparisons/{id}': { get: comparisons.get, delete: comparisons.remove },
      '/comparisons/{id}/explanation': {
        post: {
          tags: ['Comparador'],
          summary: 'Gera explicação por IA das diferenças',
          security: secured,
          parameters: [idParam],
          responses: { 200: json('Comparação com explicação'), 404: errors[404], 429: errors[429], ...aiErrors },
        },
      },
      '/ai/status': {
        get: {
          tags: ['Assistente'],
          summary: 'Indica se a IA está habilitada e como configurá-la',
          security: secured,
          responses: { 200: json('Status') },
        },
      },
      '/conversations': {
        get: conversations.list,
        post: {
          tags: ['Assistente'],
          summary: 'Inicia conversa com a IA',
          security: secured,
          requestBody: jsonBody(chatMessageSchema),
          responses: { 201: json('Conversa criada'), 400: errors[400], 429: errors[429], ...aiErrors },
        },
        delete: conversations.clear,
      },
      '/conversations/{id}': { get: conversations.get, delete: conversations.remove },
      '/conversations/{id}/messages': {
        post: {
          tags: ['Assistente'],
          summary: 'Envia mensagem em uma conversa',
          security: secured,
          parameters: [idParam],
          requestBody: jsonBody(chatMessageSchema),
          responses: { 201: json('Mensagens criadas'), 404: errors[404], 429: errors[429], ...aiErrors },
        },
      },
      '/history/policy': {
        get: {
          tags: ['Histórico'],
          summary: 'Regras de retenção e exclusão de dados',
          security: secured,
          responses: { 200: json('Política') },
        },
      },
    },
  };
}
