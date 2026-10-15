import { Router } from 'express';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { getUserId } from '../../middleware/auth.js';
import { createAiLimiter } from '../../middleware/rate-limit.js';
import { parseInput } from '../../middleware/validate.js';
import type { AiService } from '../ai/ai.service.js';
import { idParamSchema } from '../products/products.schemas.js';
import * as analysesService from './ingredient-analyses.service.js';
import { ingredientLookupSchema, ingredientSearchQuerySchema } from './ingredients.schemas.js';
import * as ingredientsService from './ingredients.service.js';

export function ingredientsRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = parseInput(ingredientSearchQuerySchema, req.query);
    res.json(await ingredientsService.searchIngredients(query));
  });

  router.get('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    res.json(await ingredientsService.getIngredientDetail(getUserId(req), id));
  });

  return router;
}

export function ingredientAnalysesRouter(ai: AiService): Router {
  const router = Router();
  const aiLimiter = createAiLimiter();

  router.get('/', async (req, res) => {
    const { page, pageSize } = parseInput(paginationQuerySchema, req.query);
    res.json(await analysesService.listAnalyses(getUserId(req), page, pageSize));
  });

  router.post('/', async (req, res) => {
    const { query } = parseInput(ingredientLookupSchema, req.body);
    res.status(201).json(await analysesService.lookupIngredient(getUserId(req), query));
  });

  router.delete('/', async (req, res) => {
    const deleted = await analysesService.clearAnalyses(getUserId(req));
    res.json({ deleted });
  });

  router.get('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    res.json(await analysesService.getAnalysis(getUserId(req), id));
  });

  router.post('/:id/explanation', aiLimiter, async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    res.json(await analysesService.explainAnalysis(getUserId(req), id, ai));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await analysesService.deleteAnalysis(getUserId(req), id);
    res.status(204).end();
  });

  return router;
}
