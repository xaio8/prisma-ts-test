import cors from 'cors';
import express from 'express';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}

