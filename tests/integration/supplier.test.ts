import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bahan, supplier } from '@/db/schema';
import { buatSupplier, setAktifSupplier, ubahSupplier } from '@/features/supplier/actions';
import { daftarSupplier, pilihanSupplier } from '@/features/supplier/queries';
import { getPengguna } from '@/lib/auth/pengguna';

import { buatBahanTest } from './setup/data';
import { resetData, testDb } from './setup/db';

vi.mock('@/lib/auth/pengguna', () => ({ getPengguna: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/db/client', async () => {
  const { testDb: db } = await import('./setup/db');
  return { db };
});

const getPenggunaMock = vi.mocked(getPengguna);

const PEMILIK = {
  id: '11111111-1111-4111-8111-111111111111',
  nama: 'Khansa',
  email: 'khansa@contoh.test',
  peran: 'pemilik' as const,
};
const KASIR = { ...PEMILIK, id: '22222222-2222-4222-8222-222222222222', peran: 'kasir' as const };

async function supplierBaru(nama = 'Toko Bahan Jaya', kontak: string | null = '0812-3456-7890') {
  const hasil = await buatSupplier({ nama, kontak });
  if (!hasil.ok) throw new Error(hasil.error);
  return hasil.data;
}

beforeEach(async () => {
  await resetData();
  getPenggunaMock.mockReset();
  getPenggunaMock.mockResolvedValue(PEMILIK);
});

describe('buatSupplier', () => {
  it('menyimpan supplier dengan nomor HP ternormalisasi', async () => {
    const baru = await supplierBaru();

    const [baris] = await testDb.select().from(supplier).where(eq(supplier.id, baru.id));
    expect(baris).toMatchObject({
      nama: 'Toko Bahan Jaya',
      kontak: '6281234567890',
      catatan: null,
      aktif: true,
    });
  });

  it('input tidak valid mengembalikan fieldErrors', async () => {
    await expect(buatSupplier({ nama: 'A', kontak: '0812' })).resolves.toMatchObject({
      ok: false,
      fieldErrors: { nama: ['Minimal 2 karakter'], kontak: ['Nomor HP tidak valid'] },
    });
    await expect(testDb.select().from(supplier)).resolves.toHaveLength(0);
  });
});

describe('ubahSupplier', () => {
  it('mengubah nama, kontak, dan catatan', async () => {
    const { id } = await supplierBaru();

    const hasil = await ubahSupplier({
      id,
      nama: 'Jaya Abadi',
      kontak: 'jaya@contoh.id',
      catatan: 'Antar Senin',
    });

    expect(hasil).toMatchObject({ ok: true });
    const [baris] = await testDb.select().from(supplier).where(eq(supplier.id, id));
    expect(baris).toMatchObject({
      nama: 'Jaya Abadi',
      kontak: 'jaya@contoh.id',
      catatan: 'Antar Senin',
    });
  });

  it('supplier tidak ada ditolak dengan pesan jelas', async () => {
    await expect(
      ubahSupplier({ id: '33333333-3333-4333-8333-333333333333', nama: 'Jaya' }),
    ).resolves.toEqual({ ok: false, error: 'Supplier tidak ditemukan' });
  });
});

describe('setAktifSupplier', () => {
  it('menonaktifkan lalu mengaktifkan lagi', async () => {
    const { id } = await supplierBaru();

    await expect(setAktifSupplier({ id, aktif: false })).resolves.toMatchObject({ ok: true });
    let [baris] = await testDb.select().from(supplier).where(eq(supplier.id, id));
    expect(baris?.aktif).toBe(false);

    await expect(setAktifSupplier({ id, aktif: true })).resolves.toMatchObject({ ok: true });
    [baris] = await testDb.select().from(supplier).where(eq(supplier.id, id));
    expect(baris?.aktif).toBe(true);
  });

  it('supplier tidak ada ditolak', async () => {
    await expect(
      setAktifSupplier({ id: '33333333-3333-4333-8333-333333333333', aktif: false }),
    ).resolves.toEqual({ ok: false, error: 'Supplier tidak ditemukan' });
  });
});

describe('otorisasi', () => {
  it('kasir ditolak di semua action supplier', async () => {
    const { id } = await supplierBaru();
    getPenggunaMock.mockResolvedValue(KASIR);
    const ditolak = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };

    await expect(buatSupplier({ nama: 'Toko Lain' })).resolves.toEqual(ditolak);
    await expect(ubahSupplier({ id, nama: 'Diubah kasir' })).resolves.toEqual(ditolak);
    await expect(setAktifSupplier({ id, aktif: false })).resolves.toEqual(ditolak);

    const [baris] = await testDb.select().from(supplier).where(eq(supplier.id, id));
    expect(baris).toMatchObject({ nama: 'Toko Bahan Jaya', aktif: true });
    await expect(testDb.select().from(supplier)).resolves.toHaveLength(1);
  });

  it('belum login ditolak', async () => {
    getPenggunaMock.mockResolvedValue(null);
    await expect(buatSupplier({ nama: 'Toko Lain' })).resolves.toEqual({
      ok: false,
      error: 'Sesi berakhir, silakan masuk lagi',
    });
  });
});

describe('queries', () => {
  it('daftarSupplier: cari nama/kontak, filter aktif, jumlah bahan utama', async () => {
    const jaya = await supplierBaru('Toko Bahan Jaya');
    const makmur = await supplierBaru('Makmur Sentosa', 'makmur@contoh.id');
    await supplierBaru('Lama Tutup', null);
    const [lama] = await testDb.select().from(supplier).where(eq(supplier.nama, 'Lama Tutup'));
    await setAktifSupplier({ id: lama!.id, aktif: false });

    const tepung = await buatBahanTest('Tepung');
    const gula = await buatBahanTest('Gula');
    await buatBahanTest('Telur');
    await testDb.update(bahan).set({ supplierUtamaId: jaya.id }).where(eq(bahan.id, tepung.id));
    await testDb.update(bahan).set({ supplierUtamaId: jaya.id }).where(eq(bahan.id, gula.id));

    const semua = await daftarSupplier({});
    expect(semua.map((s) => s.nama)).toEqual(['Lama Tutup', 'Makmur Sentosa', 'Toko Bahan Jaya']);
    expect(semua.find((s) => s.id === jaya.id)).toMatchObject({ jumlahBahan: 2 });
    expect(semua.find((s) => s.id === makmur.id)).toMatchObject({ jumlahBahan: 0 });

    expect((await daftarSupplier({ aktif: true })).map((s) => s.nama)).toEqual([
      'Makmur Sentosa',
      'Toko Bahan Jaya',
    ]);
    expect((await daftarSupplier({ aktif: false })).map((s) => s.nama)).toEqual(['Lama Tutup']);
    expect((await daftarSupplier({ q: 'jaya' })).map((s) => s.nama)).toEqual(['Toko Bahan Jaya']);
    expect((await daftarSupplier({ q: 'MAKMUR@' })).map((s) => s.nama)).toEqual(['Makmur Sentosa']);
    expect(await daftarSupplier({ q: '100%_' })).toEqual([]);
  });

  it('pilihanSupplier hanya supplier aktif, urut nama', async () => {
    await supplierBaru('Zaitun');
    await supplierBaru('Abadi');
    const { id } = await supplierBaru('Tutup');
    await setAktifSupplier({ id, aktif: false });

    await expect(pilihanSupplier()).resolves.toEqual([
      { id: expect.any(String), nama: 'Abadi' },
      { id: expect.any(String), nama: 'Zaitun' },
    ]);
  });
});
