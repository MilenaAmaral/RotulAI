import { Router } from 'express';
import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { getUserId } from '../../middleware/auth.js';
import { createAiLimiter } from '../../middleware/rate-limit.js';
import { parseInput } from '../../middleware/validate.js';
import type { AiService } from '../ai/ai.service.js';
import { idParamSchema } from '../products/products.schemas.js';
import * as comparisonsService from './comparisons.service.js';

export const createComparisonSchema = z.object({
  productAId: z.uuid({ error: 'Selecione o primeiro produto.' }),
  productBId: z.uuid({ error: 'Selecione o segundo produto.' }),
});

export function comparisonsRouter(ai: AiService): Router {
  const router = Router();
  const aiLimiter = createAiLimiter();

  router.get('/', async (req, res) => {
    const { page, pageSize } = parseInput(paginationQuerySchema, req.query);
    res.json(await comparisonsService.listComparisons(getUserId(req), page, pageSize));
  });

  router.post('/', async (req, res) => {
    const { productAId, productBId } = parseInput(createComparisonSchema, req.body);
    res.status(201).json(await comparisonsService.createComparison(getUserId(req), productAId, productBId));
  });

  router.delete('/', async (req, res) => {
    res.json({ deleted: await comparisonsService.clearComparisons(getUserId(req)) });
  });

  router.get('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    res.json(await comparisonsService.getComparison(getUserId(req), id));
  });

  router.post('/:id/explanation', aiLimiter, async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    res.json(await comparisonsService.explainComparison(getUserId(req), id, ai));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await comparisonsService.deleteComparison(getUserId(req), id);
    res.status(204).end();
  });

  return router;
}
