import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import { env } from '@/env';

import * as schema from './schema';

function createDatabaseClient() {
  const queryClient = postgres(env.DATABASE_URL, { prepare: false });
  const database = drizzle({ client: queryClient, schema, casing: 'snake_case' });

  return { database, queryClient };
}

type DatabaseClient = ReturnType<typeof createDatabaseClient>;

const globalForDatabase = globalThis as typeof globalThis & {
  tokokueDatabase?: DatabaseClient;
};

const databaseClient = globalForDatabase.tokokueDatabase ?? createDatabaseClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.tokokueDatabase = databaseClient;
}

export const db = databaseClient.database;
export const sqlClient: Sql = databaseClient.queryClient;

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
