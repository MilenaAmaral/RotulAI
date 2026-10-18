import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins, env } from './config/env.js';
import { buildOpenApiDocument } from './docs/openapi.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createApiLimiter } from './middleware/rate-limit.js';
import type { AiService } from './modules/ai/ai.service.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { comparisonsRouter } from './modules/comparisons/comparisons.routes.js';
import { conversationsRouter } from './modules/conversations/conversations.routes.js';
import { ingredientAnalysesRouter, ingredientsRouter } from './modules/ingredients/ingredients.routes.js';
import { miscRouter } from './modules/misc.routes.js';
import { productsRouter } from './modules/products/products.routes.js';

export interface AppDependencies {
  ai: AiService;
}

export function createApp({ ai }: AppDependencies): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  // Documentação interativa (a UI do Swagger exige scripts inline, por isso usa CSP própria).
  const openApiDocument = buildOpenApiDocument();
  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    '/api/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { customSiteTitle: 'Rotulai API' }),
  );

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Requisições sem Origin (curl, health checks) são permitidas; navegadores precisam estar na lista.
        callback(null, !origin || corsOrigins.includes(origin));
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info(
        {
          method: req.method,
          path: req.originalUrl.split('?')[0],
          status: res.statusCode,
          durationMs: Math.round(durationMs),
        },
        'request',
      );
    });
    next();
  });

  const api = Router();
  api.use(createApiLimiter());

  api.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        database: 'ok',
        ai: ai.status().enabled ? 'enabled' : 'disabled',
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable', timestamp: new Date().toISOString() });
    }
  });

  api.use('/auth', authRouter());

  // Todas as rotas abaixo exigem autenticação.
  api.use(requireAuth);
  api.use('/products', productsRouter());
  api.use('/ingredients', ingredientsRouter());
  api.use('/ingredient-analyses', ingredientAnalysesRouter(ai));
  api.use('/comparisons', comparisonsRouter(ai));
  api.use('/conversations', conversationsRouter(ai));
  api.use(miscRouter(ai));

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
