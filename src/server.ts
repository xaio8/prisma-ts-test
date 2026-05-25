import 'dotenv/config';
import { createServer } from './app';
import { appLogger } from './logger';
import { pool } from './db';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isFinite(port) || port <= 0) {
  appLogger.error(`Invalid PORT value: ${process.env.PORT}`);
  process.exit(1);
}

const app = createServer();

const server = app.listen(port, () => {
  const msg = `[server] listening on http://localhost:${port}`;
  appLogger.info(msg);
  // eslint-disable-next-line no-console
  console.log(msg);
});

function shutdown() {
  appLogger.info('[server] shutting down…');
  server.close(() => {
    pool
      .end()
      .then(() => {
        appLogger.info('[server] pool closed');
        process.exit(0);
      })
      .catch((err: unknown) => {
        appLogger.error(`[server] pool close error: ${err}`);
        process.exit(1);
      });
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
