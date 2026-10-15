import { Router } from 'express';
import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { getUserId } from '../../middleware/auth.js';
import { createAiLimiter } from '../../middleware/rate-limit.js';
import { parseInput } from '../../middleware/validate.js';
import type { AiService } from '../ai/ai.service.js';
import { idParamSchema } from '../products/products.schemas.js';
import * as conversationsService from './conversations.service.js';

export const chatMessageSchema = z.object({
  message: z
    .string({ error: 'Digite uma mensagem.' })
    .trim()
    .min(1, 'Digite uma mensagem.')
    .max(8000, 'Mensagem muito longa.'),
  productIds: z
    .array(z.uuid({ error: 'Produto inválido.' }))
    .max(2, 'Selecione no máximo 2 produtos como contexto.')
    .default([]),
});

export function conversationsRouter(ai: AiService): Router {
  const router = Router();
  const aiLimiter = createAiLimiter();

  router.get('/', async (req, res) => {
    const { page, pageSize } = parseInput(paginationQuerySchema, req.query);
    res.json(await conversationsService.listConversations(getUserId(req), page, pageSize));
  });

  router.post('/', aiLimiter, async (req, res) => {
    const { message, productIds } = parseInput(chatMessageSchema, req.body);
    res.status(201).json(await conversationsService.startConversation(getUserId(req), message, productIds, ai));
  });

  router.delete('/', async (req, res) => {
    res.json({ deleted: await conversationsService.clearConversations(getUserId(req)) });
  });

  router.get('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    res.json(await conversationsService.getConversation(getUserId(req), id));
  });

  router.post('/:id/messages', aiLimiter, async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    const { message, productIds } = parseInput(chatMessageSchema, req.body);
    res.status(201).json(await conversationsService.sendMessage(getUserId(req), id, message, productIds, ai));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await conversationsService.deleteConversation(getUserId(req), id);
    res.status(204).end();
  });

  return router;
}
