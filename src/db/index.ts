import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('FATAL: DATABASE_URL não configurada no ambiente.');
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
