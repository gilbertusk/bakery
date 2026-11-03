import 'server-only';

import { type ServerEnv, validateServerEnv } from '@/env-schema';

const rawServerEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
};

function unvalidatedServerEnv(): ServerEnv {
  return {
    DATABASE_URL: rawServerEnv.DATABASE_URL ?? 'postgresql://skip:skip@localhost:6543/postgres',
    DATABASE_URL_DIRECT:
      rawServerEnv.DATABASE_URL_DIRECT ?? 'postgresql://skip:skip@localhost:5432/postgres',
    SUPABASE_SERVICE_ROLE_KEY: rawServerEnv.SUPABASE_SERVICE_ROLE_KEY ?? 'skip-validation',
    APP_TIMEZONE: rawServerEnv.APP_TIMEZONE ?? 'Asia/Jakarta',
  };
}

export const env =
  process.env.SKIP_ENV_VALIDATION === '1'
    ? unvalidatedServerEnv()
    : validateServerEnv(rawServerEnv);
