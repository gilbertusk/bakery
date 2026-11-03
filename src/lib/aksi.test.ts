import { redirect } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { TidakBerwenangError } from '@/lib/auth';
import { getPengguna } from '@/lib/auth/pengguna';

import { PesanError, aksi } from './aksi';
import { log } from './log';
import { StokTidakCukupError } from './stok/error';

vi.mock('@/lib/auth/pengguna', () => ({ getPengguna: vi.fn() }));

const getPenggunaMock = vi.mocked(getPengguna);

const PEMILIK = {
  id: '11111111-1111-4111-8111-111111111111',
  nama: 'Khansa',
  email: 'khansa@contoh.test',
  peran: 'pemilik' as const,
};
const KASIR = { ...PEMILIK, nama: 'Kasir', peran: 'kasir' as const };

const schema = z.object({ nama: z.string().min(1), harga: z.number().int().positive() });

function errorPostgres(code: string) {
  return Object.assign(new Error(`postgres ${code}`), { code });
}

beforeEach(() => {
  getPenggunaMock.mockReset();
  getPenggunaMock.mockResolvedValue(PEMILIK);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('aksi', () => {
  it('menjalankan fungsi dengan input hasil parse dan pengguna aktif', async () => {
    const jalankan = vi.fn(async (input: z.infer<typeof schema>, pengguna: { nama: string }) => ({
      ringkas: `${input.nama}:${input.harga}:${pengguna.nama}`,
    }));
    const simpan = aksi({ schema, peran: ['pemilik'], jalankan });

    await expect(simpan({ nama: 'Brownies', harga: 15000, lebih: 'dibuang' })).resolves.toEqual({
      ok: true,
      data: { ringkas: 'Brownies:15000:Khansa' },
    });
    expect(jalankan.mock.calls[0]?.[0]).toEqual({ nama: 'Brownies', harga: 15000 });
  });

  it('mengembalikan fieldErrors berbahasa Indonesia tanpa menjalankan fungsi', async () => {
    const jalankan = vi.fn();
    const simpan = aksi({ schema, jalankan });

    const hasil = await simpan({ nama: '', harga: 1.5 });

    expect(hasil).toEqual({
      ok: false,
      error: 'Periksa kembali isian yang ditandai',
      fieldErrors: { nama: ['Wajib diisi'], harga: ['Harus bilangan bulat'] },
    });
    expect(jalankan).not.toHaveBeenCalled();
  });

  it('error validasi tingkat form masuk ke kunci _form', async () => {
    const simpan = aksi({
      schema: z.object({ a: z.number(), b: z.number() }).refine((v) => v.a < v.b, 'A harus < B'),
      jalankan: async () => null,
    });
    await expect(simpan({ a: 2, b: 1 })).resolves.toMatchObject({
      ok: false,
      fieldErrors: { _form: ['A harus < B'] },
    });
  });

  it('menolak bila belum login', async () => {
    getPenggunaMock.mockResolvedValue(null);
    const jalankan = vi.fn();

    await expect(aksi({ schema, jalankan })({ nama: 'x', harga: 1 })).resolves.toEqual({
      ok: false,
      error: 'Sesi berakhir, silakan masuk lagi',
    });
    expect(jalankan).not.toHaveBeenCalled();
  });

  it('menolak peran yang tidak diizinkan sebelum validasi input', async () => {
    getPenggunaMock.mockResolvedValue(KASIR);
    const jalankan = vi.fn();

    await expect(aksi({ schema, peran: ['pemilik'], jalankan })({})).resolves.toEqual({
      ok: false,
      error: 'Anda tidak berwenang melakukan aksi ini',
    });
    expect(jalankan).not.toHaveBeenCalled();
  });

  it('tanpa peran berarti semua pengguna login boleh', async () => {
    getPenggunaMock.mockResolvedValue(KASIR);
    await expect(
      aksi({ schema, jalankan: async (_input, p) => p.peran })({ nama: 'x', harga: 1 }),
    ).resolves.toEqual({ ok: true, data: 'kasir' });
  });

  it.each([
    [
      'stok tidak cukup',
      new StokTidakCukupError({ nama: 'Brownies Cup', stok: '2', diminta: '5' }),
      'Stok Brownies Cup tidak cukup (tersisa 2, diminta 5)',
    ],
    ['tidak berwenang', new TidakBerwenangError(), 'Anda tidak berwenang melakukan aksi ini'],
    ['pesan bisnis', new PesanError('Pre-order sudah lunas'), 'Pre-order sudah lunas'],
    ['unique violation', errorPostgres('23505'), 'Data dengan nama ini sudah ada'],
    ['FK violation', errorPostgres('23503'), 'Data masih dipakai di tempat lain'],
    [
      'error postgres yang dibungkus drizzle',
      new Error('Failed query', { cause: errorPostgres('23505') }),
      'Data dengan nama ini sudah ada',
    ],
  ])('memetakan %s ke pesan ramah', async (_nama, galat, pesan) => {
    const errorLog = vi.spyOn(log, 'error').mockImplementation(() => undefined);
    const simpan = aksi({
      schema,
      jalankan: async () => {
        throw galat;
      },
    });

    await expect(simpan({ nama: 'x', harga: 1 })).resolves.toEqual({ ok: false, error: pesan });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('error tak dikenal dicatat ke logger dan pesan umum dikembalikan', async () => {
    const errorLog = vi.spyOn(log, 'error').mockImplementation(() => undefined);
    const galat = new Error('detail internal yang tidak boleh bocor');

    const hasil = await aksi({
      schema,
      jalankan: async () => {
        throw galat;
      },
    })({ nama: 'x', harga: 1 });

    expect(hasil).toEqual({ ok: false, error: 'Terjadi kesalahan, coba lagi' });
    expect(errorLog).toHaveBeenCalledWith(
      'Server action gagal',
      expect.objectContaining({ error: galat, penggunaId: PEMILIK.id }),
    );
  });

  it('redirect dari next tetap diteruskan, bukan dijadikan error', async () => {
    const simpan = aksi({
      schema,
      jalankan: async () => {
        redirect('/dashboard');
      },
    });

    await expect(simpan({ nama: 'x', harga: 1 })).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT'),
    });
  });
});
