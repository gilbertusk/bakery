import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bahan, konversiSatuan, produkKomponen, resepAdonan, resepAdonanItem } from '@/db/schema';
import { hapusKonversi, tambahKonversi, ubahKonversi } from '@/features/bahan/konversi-actions';
import { daftarKonversiBahan } from '@/features/bahan/queries';
import { getPengguna } from '@/lib/auth/pengguna';

import { buatBahanTest, buatProdukTest } from './setup/data';
import { buatPenggunaTest, resetData, testDb } from './setup/db';

vi.mock('@/lib/auth/pengguna', () => ({ getPengguna: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/db/client', async () => {
  const { testDb: db } = await import('./setup/db');
  return { db };
});

const getPenggunaMock = vi.mocked(getPengguna);
const TIDAK_ADA = '33333333-3333-4333-8333-333333333333';
const KASIR = {
  id: '22222222-2222-4222-8222-222222222222',
  nama: 'Kasir',
  email: 'kasir@contoh.test',
  peran: 'kasir' as const,
};

beforeEach(async () => {
  await resetData();
  const pemilikId = await buatPenggunaTest('pemilik', 'Khansa');
  getPenggunaMock.mockReset();
  getPenggunaMock.mockResolvedValue({
    id: pemilikId,
    nama: 'Khansa',
    email: `${pemilikId}@contoh.test`,
    peran: 'pemilik',
  });
});

async function buatKonversi(bahanId: string, namaSatuan = 'sdm', nilaiDasar = '10') {
  const [baris] = await testDb
    .insert(konversiSatuan)
    .values({ bahanId, namaSatuan, nilaiDasar })
    .returning();
  if (!baris) throw new Error('Gagal membuat konversi test');
  return baris;
}

describe('tambahKonversi', () => {
  it('menyimpan nilai ternormalisasi dan muncul di daftar', async () => {
    const gula = await buatBahanTest('Gula Pasir');

    const hasil = await tambahKonversi({
      bahanId: gula.id,
      namaSatuan: '  sdm ',
      nilaiDasar: '12,5',
    });

    expect(hasil).toMatchObject({ ok: true });
    await expect(daftarKonversiBahan(gula.id)).resolves.toEqual([
      expect.objectContaining({ namaSatuan: 'sdm', nilaiDasar: '12.5000' }),
    ]);
  });

  it('menolak nama duplikat tanpa membedakan kapital', async () => {
    const gula = await buatBahanTest('Gula Pasir');
    await buatKonversi(gula.id, 'sdm', '12.5');

    await expect(
      tambahKonversi({ bahanId: gula.id, namaSatuan: 'SDM', nilaiDasar: '13' }),
    ).resolves.toEqual({
      ok: false,
      error: 'Nama satuan sudah dipakai untuk bahan ini',
      fieldErrors: { namaSatuan: ['Nama satuan sudah dipakai untuk bahan ini'] },
    });
  });

  it('menolak nama yang sama dengan satuan dasar dan nilai yang tidak positif', async () => {
    const gula = await buatBahanTest('Gula Pasir');

    await expect(
      tambahKonversi({ bahanId: gula.id, namaSatuan: 'G', nilaiDasar: '1' }),
    ).resolves.toEqual({
      ok: false,
      error: 'Nama satuan tidak boleh sama dengan satuan dasar',
      fieldErrors: { namaSatuan: ['Nama satuan tidak boleh sama dengan satuan dasar'] },
    });
    await expect(
      tambahKonversi({ bahanId: gula.id, namaSatuan: 'sdm', nilaiDasar: '0' }),
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: { nilaiDasar: ['Harus lebih dari 0'] },
    });
  });

  it('menolak bahan yang tidak ada', async () => {
    await expect(
      tambahKonversi({ bahanId: TIDAK_ADA, namaSatuan: 'sdm', nilaiDasar: '10' }),
    ).resolves.toEqual({ ok: false, error: 'Bahan tidak ditemukan' });
  });
});

describe('ubahKonversi', () => {
  it('menghitung ulang item resep, hasil resep otomatis, dan komponen produk dalam satu aksi', async () => {
    const gula = await buatBahanTest('Gula Pasir');
    const tepung = await buatBahanTest('Tepung Terigu');
    const konversi = await buatKonversi(gula.id, 'sdm', '10');
    const [otomatis, timbang] = await testDb
      .insert(resepAdonan)
      .values([
        { nama: 'Adonan Otomatis', modeHasil: 'otomatis', hasilGram: '50' },
        { nama: 'Adonan Timbang', modeHasil: 'timbang', hasilGram: '999' },
      ])
      .returning();
    await testDb.insert(resepAdonanItem).values([
      {
        resepAdonanId: otomatis!.id,
        bahanId: gula.id,
        takaran: '2',
        konversiSatuanId: konversi.id,
        takaranDasar: '20',
        urutan: 1,
      },
      {
        resepAdonanId: otomatis!.id,
        bahanId: tepung.id,
        takaran: '30',
        takaranDasar: '30',
        urutan: 2,
      },
      {
        resepAdonanId: timbang!.id,
        bahanId: gula.id,
        takaran: '1',
        konversiSatuanId: konversi.id,
        takaranDasar: '10',
        urutan: 1,
      },
    ]);
    const produk = await buatProdukTest('Brownies Cup');
    const [komponen] = await testDb
      .insert(produkKomponen)
      .values({
        produkId: produk.id,
        peran: 'topping',
        bahanId: gula.id,
        takaran: '3',
        konversiSatuanId: konversi.id,
        takaranDasar: '30',
      })
      .returning();

    await expect(
      ubahKonversi({ id: konversi.id, namaSatuan: 'sendok makan', nilaiDasar: '12,5' }),
    ).resolves.toMatchObject({ ok: true });

    const item = await testDb
      .select({
        resepId: resepAdonanItem.resepAdonanId,
        takaranDasar: resepAdonanItem.takaranDasar,
      })
      .from(resepAdonanItem)
      .where(eq(resepAdonanItem.konversiSatuanId, konversi.id))
      .orderBy(asc(resepAdonanItem.takaran));
    expect(item).toEqual([
      { resepId: timbang!.id, takaranDasar: '12.500' },
      { resepId: otomatis!.id, takaranDasar: '25.000' },
    ]);
    await expect(
      testDb
        .select({ mode: resepAdonan.modeHasil, hasil: resepAdonan.hasilGram })
        .from(resepAdonan)
        .orderBy(asc(resepAdonan.modeHasil)),
    ).resolves.toEqual([
      { mode: 'otomatis', hasil: '55.000' },
      { mode: 'timbang', hasil: '999.000' },
    ]);
    const [komponenBaru] = await testDb
      .select({ takaranDasar: produkKomponen.takaranDasar })
      .from(produkKomponen)
      .where(eq(produkKomponen.id, komponen!.id));
    expect(komponenBaru?.takaranDasar).toBe('37.500');
  });

  it('nama sendiri boleh dipertahankan, tetapi duplikat milik bahan yang sama ditolak', async () => {
    const gula = await buatBahanTest('Gula Pasir');
    const sdm = await buatKonversi(gula.id, 'sdm', '12');
    await buatKonversi(gula.id, 'cup', '200');

    await expect(
      ubahKonversi({ id: sdm.id, namaSatuan: 'SDM', nilaiDasar: '12' }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      ubahKonversi({ id: sdm.id, namaSatuan: 'CUP', nilaiDasar: '12' }),
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: { namaSatuan: ['Nama satuan sudah dipakai untuk bahan ini'] },
    });
  });

  it('konversi yang tidak ada ditolak', async () => {
    await expect(
      ubahKonversi({ id: TIDAK_ADA, namaSatuan: 'sdm', nilaiDasar: '10' }),
    ).resolves.toEqual({ ok: false, error: 'Konversi tidak ditemukan' });
  });
});

describe('hapusKonversi', () => {
  it('menolak bila dipakai resep dan menyebutkan nama resep', async () => {
    const gula = await buatBahanTest('Gula Pasir');
    const konversi = await buatKonversi(gula.id);
    const [resep] = await testDb
      .insert(resepAdonan)
      .values({ nama: 'Adonan Brownies', modeHasil: 'timbang', hasilGram: '100' })
      .returning();
    await testDb.insert(resepAdonanItem).values({
      resepAdonanId: resep!.id,
      bahanId: gula.id,
      takaran: '2',
      konversiSatuanId: konversi.id,
      takaranDasar: '20',
      urutan: 1,
    });

    await expect(hapusKonversi({ id: konversi.id })).resolves.toEqual({
      ok: false,
      error: 'Konversi tidak bisa dihapus karena dipakai resep Adonan Brownies',
    });
    await expect(
      testDb.select().from(konversiSatuan).where(eq(konversiSatuan.id, konversi.id)),
    ).resolves.toHaveLength(1);
  });

  it('menolak bila dipakai komponen dan menyebutkan nama produk', async () => {
    const gula = await buatBahanTest('Gula Pasir');
    const konversi = await buatKonversi(gula.id);
    const produk = await buatProdukTest('Brownies Cup');
    await testDb.insert(produkKomponen).values({
      produkId: produk.id,
      peran: 'topping',
      bahanId: gula.id,
      takaran: '2',
      konversiSatuanId: konversi.id,
      takaranDasar: '20',
    });

    await expect(hapusKonversi({ id: konversi.id })).resolves.toEqual({
      ok: false,
      error: 'Konversi tidak bisa dihapus karena dipakai produk Brownies Cup',
    });
  });

  it('menghapus konversi yang tidak dipakai dan menolak id yang tidak ada', async () => {
    const gula = await buatBahanTest('Gula Pasir');
    const konversi = await buatKonversi(gula.id);

    await expect(hapusKonversi({ id: konversi.id })).resolves.toMatchObject({ ok: true });
    await expect(
      testDb.select().from(konversiSatuan).where(eq(konversiSatuan.id, konversi.id)),
    ).resolves.toHaveLength(0);
    await expect(hapusKonversi({ id: TIDAK_ADA })).resolves.toEqual({
      ok: false,
      error: 'Konversi tidak ditemukan',
    });
  });
});

describe('otorisasi konversi', () => {
  it('kasir ditolak di semua action dan data tidak berubah', async () => {
    const gula = await buatBahanTest('Gula Pasir');
    const konversi = await buatKonversi(gula.id);
    getPenggunaMock.mockResolvedValue(KASIR);
    const ditolak = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };

    await expect(
      tambahKonversi({ bahanId: gula.id, namaSatuan: 'cup', nilaiDasar: '200' }),
    ).resolves.toEqual(ditolak);
    await expect(
      ubahKonversi({ id: konversi.id, namaSatuan: 'sendok', nilaiDasar: '11' }),
    ).resolves.toEqual(ditolak);
    await expect(hapusKonversi({ id: konversi.id })).resolves.toEqual(ditolak);

    await expect(daftarKonversiBahan(gula.id)).resolves.toEqual([
      expect.objectContaining({ namaSatuan: 'sdm', nilaiDasar: '10.0000' }),
    ]);
  });
});
