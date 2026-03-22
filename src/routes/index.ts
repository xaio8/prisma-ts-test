import type { Express } from 'express';
import { productsRouter } from './products';
import { salesRouter } from './sales';
import { usersRouter } from './users';

export function registerRoutes(app: Express) {
  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/users', usersRouter);
  app.use('/products', productsRouter);
  app.use('/sales', salesRouter);
}

