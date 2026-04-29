import 'dotenv/config';
import { createServer } from './app';
import { appLogger } from './logger';

const port = Number(process.env.PORT ?? 3000);

const app = createServer();

app.listen(port, () => {
  const msg = `[server] listening on http://localhost:${port}`;
  appLogger.info(msg);
  // eslint-disable-next-line no-console
  console.log(msg);
});

