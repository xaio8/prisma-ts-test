import fs from 'node:fs';
import path from 'node:path';
import { createLogger, format, transports } from 'winston';

const LOG_DIR = path.join(process.cwd(), 'log');

// Ensure `log/` exists so Winston file transports don't fail at runtime.
fs.mkdirSync(LOG_DIR, { recursive: true });

const baseFormat = format.combine(
  format.timestamp(),
  format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
);

export const appLogger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: baseFormat,
  defaultMeta: {},
  transports: [
    new transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      level: 'info',
    }),
    new transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
    }),
    new transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
    }),
  ],
  exitOnError: false,
});

export const httpLogger = createLogger({
  level: 'info',
  format: baseFormat,
  transports: [
    new transports.File({
      filename: path.join(LOG_DIR, 'http.log'),
      level: 'info',
    }),
  ],
  exitOnError: false,
});

