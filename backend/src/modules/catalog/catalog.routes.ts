import { Router } from 'express';
import { parseInput } from '../../middleware/validate.js';
import {
  publicIngredientIdSchema,
  publicIngredientListQuerySchema,
  publicProductListQuerySchema,
  publicProductSlugSchema,
} from './catalog.schemas.js';
import * as catalogService from './catalog.service.js';

export function catalogRouter(): Router {
  const router = Router();

  router.get('/products', async (req, res) => {
    const query = parseInput(publicProductListQuerySchema, req.query);
    res.json(await catalogService.listPublicProducts(query));
  });

  router.get('/products/:slug', async (req, res) => {
    const { slug } = parseInput(publicProductSlugSchema, req.params);
    res.json(await catalogService.getPublicProduct(slug));
  });

  router.get('/ingredients', async (req, res) => {
    const query = parseInput(publicIngredientListQuerySchema, req.query);
    res.json(await catalogService.listPublicIngredients(query));
  });

  router.get('/ingredients/functions', async (_req, res) => {
    res.json(await catalogService.listPublicIngredientFunctions());
  });

  router.get('/ingredients/:id', async (req, res) => {
    const { id } = parseInput(publicIngredientIdSchema, req.params);
    res.json(await catalogService.getPublicIngredient(id));
  });

  return router;
}
