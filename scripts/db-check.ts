import { config } from 'dotenv';
import postgres from 'postgres';

import { validateServerEnv } from '../src/env-schema';

config({ path: '.env.local' });

async function checkDatabase() {
  const env = validateServerEnv(process.env);
  const sql = postgres(env.DATABASE_URL, { prepare: false, max: 1 });

  try {
    await sql`select 1`;
    process.stdout.write('Koneksi database OK\n');
  } finally {
    await sql.end();
  }
}

await checkDatabase();
