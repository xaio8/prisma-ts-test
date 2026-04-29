import type { NextFunction, Request, Response } from 'express';
import { appLogger } from '../logger';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Keep error responses safe and predictable for a sample project.
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const status = err instanceof HttpError ? err.statusCode : 500;

  appLogger.error(`HTTP ${status}: ${message}`);
  if (err instanceof Error && err.stack) {
    appLogger.error(err.stack);
  }

  res.status(status).json({
    error: {
      message
    }
  });
}

export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

