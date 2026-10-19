import { Router } from 'express';
import { parseInput } from '../../middleware/validate.js';
import {
  adminIngredientInputSchema,
  adminListQuerySchema,
  adminProductInputSchema,
  adminRecommendationRuleInputSchema,
  adminSearchSynonymInputSchema,
  idParamSchema,
} from './admin.schemas.js';
import * as adminService from './admin.service.js';
import { publicProductListQuerySchema } from '../catalog/catalog.schemas.js';

export function adminRouter(): Router {
  const router = Router();

  router.get('/products', async (req, res) => {
    const query = parseInput(publicProductListQuerySchema, req.query);
    res.json(await adminService.listAdminProducts(query));
  });

  router.post('/products', async (req, res) => {
    const input = parseInput(adminProductInputSchema, req.body);
    res.status(201).json(await adminService.createAdminProduct(input));
  });

  router.get('/products/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    res.json(await adminService.getAdminProduct(id));
  });

  router.put('/products/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    const input = parseInput(adminProductInputSchema, req.body);
    res.json(await adminService.updateAdminProduct(id, input));
  });

  router.delete('/products/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await adminService.deleteAdminProduct(id);
    res.status(204).end();
  });

  router.get('/ingredients', async (req, res) => {
    const query = parseInput(adminListQuerySchema, req.query);
    res.json(await adminService.listAdminIngredients(query));
  });

  router.post('/ingredients', async (req, res) => {
    const input = parseInput(adminIngredientInputSchema, req.body);
    res.status(201).json(await adminService.createAdminIngredient(input));
  });

  router.put('/ingredients/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    const input = parseInput(adminIngredientInputSchema, req.body);
    res.json(await adminService.updateAdminIngredient(id, input));
  });

  router.delete('/ingredients/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await adminService.deleteAdminIngredient(id);
    res.status(204).end();
  });

  router.get('/search-synonyms', async (_req, res) => {
    res.json(await adminService.listAdminSearchSynonyms());
  });

  router.post('/search-synonyms', async (req, res) => {
    const input = parseInput(adminSearchSynonymInputSchema, req.body);
    res.status(201).json(await adminService.createAdminSearchSynonym(input));
  });

  router.put('/search-synonyms/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    const input = parseInput(adminSearchSynonymInputSchema, req.body);
    res.json(await adminService.updateAdminSearchSynonym(id, input));
  });

  router.delete('/search-synonyms/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await adminService.deleteAdminSearchSynonym(id);
    res.status(204).end();
  });

  router.get('/recommendation-rules', async (_req, res) => {
    res.json(await adminService.listAdminRecommendationRules());
  });

  router.post('/recommendation-rules', async (req, res) => {
    const input = parseInput(adminRecommendationRuleInputSchema, req.body);
    res.status(201).json(await adminService.createAdminRecommendationRule(input));
  });

  router.put('/recommendation-rules/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    const input = parseInput(adminRecommendationRuleInputSchema, req.body);
    res.json(await adminService.updateAdminRecommendationRule(id, input));
  });

  router.delete('/recommendation-rules/:id', async (req, res) => {
    const { id } = parseInput(idParamSchema, req.params);
    await adminService.deleteAdminRecommendationRule(id);
    res.status(204).end();
  });

  return router;
}
