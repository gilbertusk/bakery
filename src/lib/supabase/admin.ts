import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/env';
import { clientEnv } from '@/env-client';

export function createSupabaseAdminClient() {
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
