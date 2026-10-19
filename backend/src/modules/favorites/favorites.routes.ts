import { Router } from 'express';
import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { getUserId } from '../../middleware/auth.js';
import { parseInput } from '../../middleware/validate.js';
import * as favoritesService from './favorites.service.js';

const idParamSchema = z.object({ productId: z.uuid({ error: 'Identificador inválido.' }) });

export function favoritesRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = parseInput(paginationQuerySchema, req.query);
    res.json(await favoritesService.listFavorites(getUserId(req), query.page, query.pageSize));
  });

  router.get('/:productId', async (req, res) => {
    const { productId } = parseInput(idParamSchema, req.params);
    res.json(await favoritesService.getFavoriteStatus(getUserId(req), productId));
  });

  router.put('/:productId', async (req, res) => {
    const { productId } = parseInput(idParamSchema, req.params);
    res.status(200).json(await favoritesService.addFavorite(getUserId(req), productId));
  });

  router.delete('/:productId', async (req, res) => {
    const { productId } = parseInput(idParamSchema, req.params);
    await favoritesService.removeFavorite(getUserId(req), productId);
    res.status(204).end();
  });

  return router;
}
