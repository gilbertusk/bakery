import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

config({ path: '.env.test' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL untuk test belum diisi di .env.test');

export const testSql = postgres(databaseUrl, { max: 1 });
export const testDb = drizzle({ client: testSql, casing: 'snake_case' });

const SYSTEM_SEED_TABLES = new Set(['kategori_kas', 'pengaturan_toko']);

export async function resetData() {
  const tables = await testSql<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;

  const tablesToReset = tables
    .map(({ tablename }) => tablename)
    .filter((tableName) => !SYSTEM_SEED_TABLES.has(tableName));

  if (tablesToReset.length === 0) return;

  const quotedTables = tablesToReset
    .map((tableName) => `"${tableName.replaceAll('"', '""')}"`)
    .join(', ');

  await testSql.unsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`);
}
