import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BelumLoginError, TidakBerwenangError, requirePeranAksi } from '@/lib/auth';
import { getPengguna } from '@/lib/auth/pengguna';

vi.mock('@/lib/auth/pengguna', () => ({
  getPengguna: vi.fn(),
}));

const getPenggunaMock = vi.mocked(getPengguna);

describe('otorisasi server action', () => {
  beforeEach(() => {
    getPenggunaMock.mockReset();
  });

  it('melempar TidakBerwenangError ketika kasir membutuhkan peran pemilik', async () => {
    getPenggunaMock.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      nama: 'Kasir',
      email: 'kasir@contoh.test',
      peran: 'kasir',
    });

    await expect(requirePeranAksi('pemilik')).rejects.toBeInstanceOf(TidakBerwenangError);
  });

  it('melempar BelumLoginError ketika tidak ada pengguna aktif', async () => {
    getPenggunaMock.mockResolvedValue(null);

    await expect(requirePeranAksi('kasir')).rejects.toBeInstanceOf(BelumLoginError);
  });

  it('mengembalikan pengguna jika perannya diizinkan', async () => {
    const pengguna = {
      id: '11111111-1111-4111-8111-111111111111',
      nama: 'Kasir',
      email: 'kasir@contoh.test',
      peran: 'kasir' as const,
    };
    getPenggunaMock.mockResolvedValue(pengguna);

    await expect(requirePeranAksi('pemilik', 'kasir')).resolves.toEqual(pengguna);
  });
});
