import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { httpLogger } from './logger';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // HTTP request logs -> log/http.log
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

