import { seedContoh } from '../src/db/seed/contoh';
import { createSeedClient } from './seed-client';

async function main() {
  const { database, sql } = createSeedClient();

  try {
    await seedContoh(database);
    process.stdout.write('Seed sistem dan data contoh selesai\n');
  } finally {
    await sql.end();
  }
}

void main();
