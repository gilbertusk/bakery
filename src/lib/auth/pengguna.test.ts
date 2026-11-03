import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { getPengguna } from './pengguna';

vi.mock('react', async (asli) => ({
  ...(await asli<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/db/client', () => ({ db: { select: vi.fn() } }));

function setUser(hasil: { user: { id: string } | null; error?: unknown }) {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: hasil.user }, error: hasil.error ?? null }),
    },
  } as never);
}

function setBaris(baris: unknown[]) {
  const query = {
    from: () => query,
    where: () => query,
    limit: () => Promise.resolve(baris),
  };
  vi.mocked(db.select).mockReturnValue(query as never);
}

const BARIS = { id: 'u1', nama: 'Khansa', email: 'k@contoh.test', peran: 'pemilik', aktif: true };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getPengguna', () => {
  it('null bila sesi Supabase tidak ada atau error', async () => {
    setUser({ user: null });
    await expect(getPengguna()).resolves.toBeNull();

    setUser({ user: { id: 'u1' }, error: new Error('jwt') });
    await expect(getPengguna()).resolves.toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });

  it('null bila baris pengguna tidak ada atau nonaktif', async () => {
    setUser({ user: { id: 'u1' } });
    setBaris([]);
    await expect(getPengguna()).resolves.toBeNull();

    setBaris([{ ...BARIS, aktif: false }]);
    await expect(getPengguna()).resolves.toBeNull();
  });

  it('mengembalikan data pengguna aktif tanpa kolom aktif', async () => {
    setUser({ user: { id: 'u1' } });
    setBaris([BARIS]);
    await expect(getPengguna()).resolves.toEqual({
      id: 'u1',
      nama: 'Khansa',
      email: 'k@contoh.test',
      peran: 'pemilik',
    });
  });
});
