import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/client';

import { NAMA_TOKO_DEFAULT, getIdentitasToko } from './toko';

vi.mock('@/db/client', () => ({ db: { select: vi.fn() } }));

function setHasil(hasil: Promise<unknown[]>) {
  const query = { from: () => query, where: () => query, limit: () => hasil };
  vi.mocked(db.select).mockReturnValue(query as never);
}

beforeEach(() => {
  vi.mocked(db.select).mockReset();
});

describe('getIdentitasToko', () => {
  it('memakai pengaturan toko dari database', async () => {
    setHasil(Promise.resolve([{ namaToko: 'Kue Bunda', logoUrl: '/logo.png' }]));
    await expect(getIdentitasToko()).resolves.toEqual({
      namaToko: 'Kue Bunda',
      logoUrl: '/logo.png',
    });
  });

  it('memakai nama default bila belum di-seed atau database gagal', async () => {
    setHasil(Promise.resolve([]));
    await expect(getIdentitasToko()).resolves.toEqual({
      namaToko: NAMA_TOKO_DEFAULT,
      logoUrl: null,
    });

    setHasil(Promise.reject(new Error('koneksi gagal')));
    await expect(getIdentitasToko()).resolves.toEqual({
      namaToko: NAMA_TOKO_DEFAULT,
      logoUrl: null,
    });
  });
});
