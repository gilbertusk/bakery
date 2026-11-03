import { randomUUID } from 'node:crypto';

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '@/db/schema';

config({ path: '.env.test' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL untuk test belum diisi di .env.test');

// Drizzle mengganti serializer JSON pada client-nya, jadi SQL mentah memakai client terpisah.
export const testSql = postgres(databaseUrl, { max: 1 });
export const testDb = drizzle({
  client: postgres(databaseUrl, { max: 1 }),
  schema,
  casing: 'snake_case',
});

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
  await testSql`DELETE FROM auth.users`;
}

export async function buatPenggunaTest(
  peran: 'pemilik' | 'kasir' = 'pemilik',
  nama = 'Pemilik Test',
): Promise<string> {
  const id = randomUUID();
  await testSql`
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (${id}, ${`${id}@contoh.test`}, ${testSql.json({ nama, peran })})
  `;
  return id;
}
