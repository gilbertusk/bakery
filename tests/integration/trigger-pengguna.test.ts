import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import { testSql } from './setup/db';

type PenggunaRow = {
  nama: string;
  email: string;
  peran: 'pemilik' | 'kasir';
};

async function buatAuthUser(
  email: string,
  metadata: Record<string, unknown> = {},
): Promise<PenggunaRow> {
  const id = randomUUID();
  await testSql`
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (${id}, ${email}, ${testSql.json(metadata)})
  `;

  const [row] = await testSql<PenggunaRow[]>`
    SELECT nama, email, peran
    FROM public.pengguna
    WHERE id = ${id}
  `;
  if (!row) throw new Error('Trigger tidak membuat pengguna');
  return row;
}

describe('trigger pengguna baru', () => {
  beforeEach(async () => {
    await testSql`DELETE FROM auth.users`;
  });

  it('menjadikan pengguna pertama sebagai pemilik dan memakai nama metadata', async () => {
    const result = await buatAuthUser('khansa@contoh.test', { nama: 'Khansa' });

    expect(result).toEqual({
      nama: 'Khansa',
      email: 'khansa@contoh.test',
      peran: 'pemilik',
    });
  });

  it('menjadikan pengguna berikutnya kasir dan memakai bagian email sebagai nama fallback', async () => {
    await buatAuthUser('pemilik@contoh.test');
    const result = await buatAuthUser('kasir.toko@contoh.test');

    expect(result).toEqual({
      nama: 'kasir.toko',
      email: 'kasir.toko@contoh.test',
      peran: 'kasir',
    });
  });

  it('menghormati metadata peran yang valid dan mengabaikan nilai tidak valid', async () => {
    await buatAuthUser('awal@contoh.test');
    const pemilik = await buatAuthUser('pemilik-kedua@contoh.test', { peran: 'pemilik' });
    const fallback = await buatAuthUser('invalid@contoh.test', { peran: 'admin' });

    expect(pemilik.peran).toBe('pemilik');
    expect(fallback.peran).toBe('kasir');
  });
});
