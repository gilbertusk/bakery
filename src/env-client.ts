import { type ClientEnv, validateClientEnv } from '@/env-schema';

const rawClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

function unvalidatedClientEnv(): ClientEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL:
      rawClientEnv.NEXT_PUBLIC_SUPABASE_URL ?? 'https://skip-validation.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: rawClientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'skip-validation',
  };
}

export const clientEnv =
  process.env.SKIP_ENV_VALIDATION === '1'
    ? unvalidatedClientEnv()
    : validateClientEnv(rawClientEnv);
