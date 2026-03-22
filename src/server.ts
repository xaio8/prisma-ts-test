import 'dotenv/config';
import { createServer } from './app';

const port = Number(process.env.PORT ?? 3000);

const app = createServer();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${port}`);
});

