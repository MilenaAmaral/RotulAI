import { Router } from 'express';
import { getUserId } from '../../middleware/auth.js';
import { parseInput } from '../../middleware/validate.js';
import { idParamSchema, productInputSchema, productListQuerySchema } from './products.schemas.js';
import * as productsService from './products.service.js';

export function productsRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = parseInput(productListQuerySchema, req.query);
    res.json(await productsService.listProducts(getUserId(req), query));
  });

  router.post('/', async (req, res) => {
    const input = parseInput(productInputSchema, req.body);
    res.status(201).json(await productsService.createProduct(getUserId(req), input));
  });

  router.get('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    res.json(await productsService.getProduct(getUserId(req), id));
  });

  router.put('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    const input = parseInput(productInputSchema, req.body);
    res.json(await productsService.updateProduct(getUserId(req), id, input));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await productsService.deleteProduct(getUserId(req), id);
    res.status(204).end();
  });

  return router;
}
