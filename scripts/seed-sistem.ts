import { seedSistem } from '../src/db/seed/sistem';
import { createSeedClient } from './seed-client';

async function main() {
  const { database, sql } = createSeedClient();

  try {
    await seedSistem(database);
    process.stdout.write('Seed sistem selesai\n');
  } finally {
    await sql.end();
  }
}

void main();
