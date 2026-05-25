import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { httpLogger } from './logger';

export function createServer() {
  const app = express();

  app.use(helmet());

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : undefined;

  app.use(
    cors(
      allowedOrigins
        ? { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'] }
        : undefined
    )
  );

  app.use(express.json({ limit: '1mb' }));

  app.use(
    morgan('combined', {
      stream: {
        write: (message) => {
          httpLogger.info(message.trim());
        }
      }
    })
  );

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}
