import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../src/db/schema';

config({ path: '.env.local' });

export function createSeedClient() {
  const databaseUrl = process.env.DATABASE_URL_DIRECT;
  if (!databaseUrl) throw new Error('DATABASE_URL_DIRECT belum diisi di .env.local');

  const sql = postgres(databaseUrl, { prepare: false, max: 1 });
  const database = drizzle({ client: sql, schema, casing: 'snake_case' });

  return { database, sql };
}
