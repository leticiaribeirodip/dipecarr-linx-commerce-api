import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env, isProduction } from './config/env';
import { authRoutes } from './routes/auth.routes';
import { productRoutes } from './routes/product.routes';
import { linxRoutes } from './routes/linx.routes';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { ProductService } from './services/product.service';
import { ProductRepository } from './repositories/product.repository';
import { openApiDocument } from './docs/openapi';

export function createApp(repository: ProductRepository) {
  const app = express();
  const service = new ProductService(repository);

  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : allowedOrigins }));
  app.use(express.json({ limit: '2mb' }));

  // Fora de produção o ETag do Express faz o navegador revalidar e receber 304
  // Not Modified; o Swagger UI então mostra a resposta sem body. Em produção o
  // ETag continua ativo porque é uma otimização útil de cache.
  if (!isProduction) {
    app.set('etag', false);
    app.use((_req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    });
  }

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'linx-commerce-test-api',
      environment: env.NODE_ENV,
      dataSource: env.DATA_SOURCE,
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes(service));
  app.use('/api/linx', linxRoutes(service));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
