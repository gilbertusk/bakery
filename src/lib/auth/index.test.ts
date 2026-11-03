import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPengguna } from './pengguna';

import { requirePengguna, requirePeran } from './index';

vi.mock('./pengguna', () => ({ getPengguna: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const KASIR = { id: 'u', nama: 'Kasir', email: 'k@contoh.test', peran: 'kasir' as const };

beforeEach(() => {
  vi.mocked(getPengguna).mockReset();
});

describe('requirePengguna dan requirePeran (halaman)', () => {
  it('belum login diarahkan ke /login', async () => {
    vi.mocked(getPengguna).mockResolvedValue(null);
    await expect(requirePengguna()).rejects.toThrow('REDIRECT:/login');
  });

  it('peran salah diarahkan ke dashboard dengan pesan', async () => {
    vi.mocked(getPengguna).mockResolvedValue(KASIR);
    await expect(requirePeran('pemilik')).rejects.toThrow(
      'REDIRECT:/dashboard?pesan=tidak-berwenang',
    );
  });

  it('peran benar mengembalikan pengguna', async () => {
    vi.mocked(getPengguna).mockResolvedValue(KASIR);
    await expect(requirePeran('pemilik', 'kasir')).resolves.toEqual(KASIR);
  });
});
