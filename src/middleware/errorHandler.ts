import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { appLogger } from '../logger';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: 'Validation failed', details: err.flatten() } });
    return;
  }

  const status = err instanceof HttpError ? err.statusCode : 500;
  const message =
    err instanceof HttpError
      ? err.message
      : 'Internal Server Error';

  appLogger.error(`HTTP ${status}: ${err instanceof Error ? err.message : String(err)}`);
  if (err instanceof Error && err.stack) {
    appLogger.error(err.stack);
  }

  res.status(status).json({ error: { message } });
}

export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
