import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL in environment (.env or .env.example).');
}

// In a real app, you'd tune pool size and enable migrations/health checks at startup.
const pool = new Pool({ connectionString });

export const db = drizzle(pool);

