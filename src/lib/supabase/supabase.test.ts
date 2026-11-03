import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseAdminClient } from './admin';
import { createSupabaseBrowserClient } from './client';
import { createSupabaseServerClient } from './server';

vi.mock('@supabase/ssr', () => ({ createBrowserClient: vi.fn(), createServerClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/env-client', () => ({
  clientEnv: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://contoh.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  },
}));
vi.mock('@/env', () => ({ env: { SUPABASE_SERVICE_ROLE_KEY: 'service' } }));

type OpsiCookie = {
  cookies: {
    getAll: () => unknown;
    setAll: (daftar: { name: string; value: string; options: object }[]) => void;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('client Supabase', () => {
  it('browser client memakai URL dan anon key', () => {
    createSupabaseBrowserClient();
    expect(createBrowserClient).toHaveBeenCalledWith('https://contoh.supabase.co', 'anon');
  });

  it('admin client memakai service role tanpa menyimpan sesi', () => {
    createSupabaseAdminClient();
    expect(createClient).toHaveBeenCalledWith('https://contoh.supabase.co', 'service', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  it('server client membaca dan menulis cookie Next', async () => {
    const store = { getAll: vi.fn(() => [{ name: 'a', value: '1' }]), set: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(store as never);

    await createSupabaseServerClient();
    const opsi = vi.mocked(createServerClient).mock.calls[0]?.[2] as unknown as OpsiCookie;

    expect(opsi.cookies.getAll()).toEqual([{ name: 'a', value: '1' }]);
    opsi.cookies.setAll([{ name: 'b', value: '2', options: { path: '/' } }]);
    expect(store.set).toHaveBeenCalledWith('b', '2', { path: '/' });
  });

  it('menulis cookie dari Server Component tidak melempar error', async () => {
    const store = {
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error('Cookies can only be modified in a Server Action');
      }),
    };
    vi.mocked(cookies).mockResolvedValue(store as never);

    await createSupabaseServerClient();
    const opsi = vi.mocked(createServerClient).mock.calls[0]?.[2] as unknown as OpsiCookie;

    expect(() => opsi.cookies.setAll([{ name: 'b', value: '2', options: {} }])).not.toThrow();
  });
});
