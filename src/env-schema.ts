import { z } from 'zod';

function databaseUrlAtPort(port: string) {
  return (value: string) => {
    try {
      const url = new URL(value);
      return ['postgres:', 'postgresql:'].includes(url.protocol) && url.port === port;
    } catch {
      return false;
    }
  };
}

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .refine(databaseUrlAtPort('6543'), 'harus berupa URL PostgreSQL dengan port 6543'),
  DATABASE_URL_DIRECT: z
    .string()
    .refine(databaseUrlAtPort('5432'), 'harus berupa URL PostgreSQL dengan port 5432'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_TIMEZONE: z.string().min(1).default('Asia/Jakarta'),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

function formatEnvError(error: z.ZodError) {
  const variableNames = [...new Set(error.issues.map((issue) => String(issue.path[0])))]
    .filter(Boolean)
    .join(', ');

  return new Error(`Konfigurasi environment tidak valid: ${variableNames}`);
}

export function validateServerEnv(input: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(input);
  if (!result.success) throw formatEnvError(result.error);
  return result.data;
}

export function validateClientEnv(input: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(input);
  if (!result.success) throw formatEnvError(result.error);
  return result.data;
}
