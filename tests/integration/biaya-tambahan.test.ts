import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bahan,
  biayaTambahan,
  produk as produkTable,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
} from '@/db/schema';
import {
  buatBiayaTambahan,
  hapusBiayaTambahan,
  pratinjauDampakBiaya,
  setAktifBiayaTambahan,
  ubahBiayaTambahan,
} from '@/features/biaya-tambahan/actions';
import { daftarBiayaTambahan, pilihanProdukBiaya } from '@/features/biaya-tambahan/queries';
import { hppSemuaProduk } from '@/features/hpp/queries';
import { getPengguna } from '@/lib/auth/pengguna';

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
const DITOLAK = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };

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

/**
 * Adonan 1.200 g @Rp10/g. Cup 50 g + kemasan Rp500 → HPP Rp1.000, 24 pcs/resep.
 * Bites 25 g → HPP Rp250, 48 pcs/resep. Lama (nonaktif) 50 g → HPP Rp500.
 */
async function buatFixture() {
  const [tepung, kemasan] = await testDb
    .insert(bahan)
    .values([
      { nama: 'Tepung', kategori: 'bahan', satuanDasar: 'g', hargaPerSatuan: '10' },
      { nama: 'Cup Plastik', kategori: 'kemasan', satuanDasar: 'pcs', hargaPerSatuan: '500' },
    ])
    .returning();
  const [resep] = await testDb
    .insert(resepAdonan)
    .values({ nama: 'Adonan Dasar', modeHasil: 'timbang', hasilGram: '1200', aktif: true })
    .returning();
  if (!tepung || !kemasan || !resep) throw new Error('Gagal membuat fixture');
  await testDb.insert(resepAdonanItem).values({
    resepAdonanId: resep.id,
    bahanId: tepung.id,
    takaran: '1200',
    takaranDasar: '1200',
    urutan: 1,
  });

  const [cup, bites, lama] = await testDb
    .insert(produkTable)
    .values([
      { nama: 'Brownies Cup', kategori: 'brownies', hargaJual: 5000, aktif: true },
      { nama: 'Brownies Bites', kategori: 'brownies', hargaJual: 3000, aktif: true },
      { nama: 'Produk Lama', kategori: 'brownies', hargaJual: 3000, aktif: false },
    ])
    .returning();
  if (!cup || !bites || !lama) throw new Error('Gagal membuat produk');

  const adonan = (produkId: string, gram: string) => ({
    produkId,
    peran: 'adonan' as const,
    resepAdonanId: resep.id,
    takaran: gram,
    takaranDasar: gram,
  });
  await testDb.insert(produkKomponen).values([
    adonan(cup.id, '50'),
    {
      produkId: cup.id,
      peran: 'kemasan' as const,
      bahanId: kemasan.id,
      takaran: '1',
      takaranDasar: '1',
    },
    adonan(bites.id, '25'),
    adonan(lama.id, '50'),
  ]);
  return { cup, bites, lama };
}

async function hpp(id: string) {
  const hasil = await hppSemuaProduk(testDb);
  return hasil.get(id)!;
}

async function jumlahBiaya() {
  return (await testDb.select({ id: biayaTambahan.id }).from(biayaTambahan)).length;
}

describe('buat, ubah, aktif, hapus biaya tambahan', () => {
  it('persen diketik 0–100 disimpan 0–1 dan berlaku untuk semua produk', async () => {
    const { cup, bites } = await buatFixture();

    const hasil = await buatBiayaTambahan({ nama: 'Gas', metode: 'persen', nilai: '10' });
    expect(hasil).toMatchObject({ ok: true });

    const [baris] = await testDb.select().from(biayaTambahan);
    expect(baris).toMatchObject({ nama: 'Gas', metode: 'persen', nilai: '0.1000', produkId: null });
    expect(baris?.aktif).toBe(true);

    // 10% dari biaya bahan
    expect((await hpp(cup.id)).hpp.toString()).toBe('1100');
    expect((await hpp(bites.id)).rincian.overhead.persen.toString()).toBe('25');
  });

  it('per_batch untuk produk tertentu hanya memengaruhi produk itu', async () => {
    const { cup, bites } = await buatFixture();

    const hasil = await buatBiayaTambahan({
      nama: 'Listrik oven',
      metode: 'per_batch',
      nilai: '2.400',
      produkId: cup.id,
    });
    expect(hasil).toMatchObject({ ok: true });

    const rincianCup = (await hpp(cup.id)).rincian;
    // Rp2.400 ÷ 24 pcs per resep
    expect(rincianCup.overhead.perBatch.toString()).toBe('100');
    expect(rincianCup.hpp.toString()).toBe('1100');
    const rincianBites = (await hpp(bites.id)).rincian;
    expect(rincianBites.overhead.total.toString()).toBe('0');
    expect(rincianBites.hpp.toString()).toBe('250');
  });

  it('biaya nonaktif tidak dihitung; aktif lagi dihitung', async () => {
    const { cup } = await buatFixture();

    const hasil = await buatBiayaTambahan({
      nama: 'Tenaga',
      metode: 'per_pcs',
      nilai: '300',
      aktif: false,
    });
    if (!hasil.ok) throw new Error(hasil.error);
    expect((await hpp(cup.id)).hpp.toString()).toBe('1000');

    expect(await setAktifBiayaTambahan({ id: hasil.data.id, aktif: true })).toMatchObject({
      ok: true,
      data: { aktif: true },
    });
    expect((await hpp(cup.id)).hpp.toString()).toBe('1300');

    await setAktifBiayaTambahan({ id: hasil.data.id, aktif: false });
    expect((await hpp(cup.id)).hpp.toString()).toBe('1000');
  });

  it('ubah metode, nilai, dan produk', async () => {
    const { cup, bites } = await buatFixture();
    const dibuat = await buatBiayaTambahan({ nama: 'Gas', metode: 'per_pcs', nilai: '100' });
    if (!dibuat.ok) throw new Error(dibuat.error);

    const hasil = await ubahBiayaTambahan({
      id: dibuat.data.id,
      nama: 'Gas oven',
      metode: 'persen',
      nilai: '20',
      produkId: bites.id,
      aktif: true,
    });
    expect(hasil).toMatchObject({ ok: true });

    const [baris] = await daftarBiayaTambahan();
    expect(baris).toMatchObject({
      nama: 'Gas oven',
      metode: 'persen',
      nilai: '0.2000',
      produkId: bites.id,
      namaProduk: 'Brownies Bites',
      aktif: true,
    });
    expect((await hpp(bites.id)).hpp.toString()).toBe('300');
    expect((await hpp(cup.id)).hpp.toString()).toBe('1000');
  });

  it('hapus biaya tambahan', async () => {
    await buatFixture();
    const dibuat = await buatBiayaTambahan({ nama: 'Gas', metode: 'per_pcs', nilai: '100' });
    if (!dibuat.ok) throw new Error(dibuat.error);

    expect(await hapusBiayaTambahan({ id: dibuat.data.id })).toEqual({
      ok: true,
      data: { id: dibuat.data.id },
    });
    expect(await jumlahBiaya()).toBe(0);
    expect(await hapusBiayaTambahan({ id: dibuat.data.id })).toEqual({
      ok: false,
      error: 'Biaya tambahan tidak ditemukan',
    });
  });

  it('produk yang tidak ada ditolak di field produkId', async () => {
    await buatFixture();
    expect(
      await buatBiayaTambahan({
        nama: 'Gas',
        metode: 'per_pcs',
        nilai: '100',
        produkId: TIDAK_ADA,
      }),
    ).toEqual({
      ok: false,
      error: 'Produk tidak ditemukan',
      fieldErrors: { produkId: ['Produk tidak ditemukan'] },
    });
    expect(await jumlahBiaya()).toBe(0);
  });

  it('id yang tidak ada ditolak saat ubah dan setAktif', async () => {
    const pesan = { ok: false, error: 'Biaya tambahan tidak ditemukan' };
    expect(
      await ubahBiayaTambahan({ id: TIDAK_ADA, nama: 'Gas', metode: 'per_pcs', nilai: '1' }),
    ).toEqual(pesan);
    expect(await setAktifBiayaTambahan({ id: TIDAK_ADA, aktif: false })).toEqual(pesan);
  });

  it('persen di atas 100 ditolak', async () => {
    expect(await buatBiayaTambahan({ nama: 'Gas', metode: 'persen', nilai: '150' })).toMatchObject({
      ok: false,
      fieldErrors: { nilai: ['Persen maksimal 100'] },
    });
  });

  it('kasir ditolak untuk semua aksi', async () => {
    await buatFixture();
    const dibuat = await buatBiayaTambahan({ nama: 'Gas', metode: 'per_pcs', nilai: '100' });
    if (!dibuat.ok) throw new Error(dibuat.error);
    getPenggunaMock.mockResolvedValue(KASIR);

    const input = { nama: 'Gas', metode: 'per_pcs', nilai: '999' };
    expect(await buatBiayaTambahan(input)).toEqual(DITOLAK);
    expect(await ubahBiayaTambahan({ id: dibuat.data.id, ...input })).toEqual(DITOLAK);
    expect(await setAktifBiayaTambahan({ id: dibuat.data.id, aktif: false })).toEqual(DITOLAK);
    expect(await hapusBiayaTambahan({ id: dibuat.data.id })).toEqual(DITOLAK);
    expect(await pratinjauDampakBiaya(input)).toEqual(DITOLAK);

    const [baris] = await testDb
      .select()
      .from(biayaTambahan)
      .where(eq(biayaTambahan.id, dibuat.data.id));
    expect(baris).toMatchObject({ nilai: '100.0000', aktif: true });
  });
});

describe('pratinjauDampakBiaya', () => {
  it('biaya baru per pcs: jumlah produk aktif dan rata-rata, tanpa menyimpan', async () => {
    const { cup, bites } = await buatFixture();

    const hasil = await pratinjauDampakBiaya({ nama: 'Gas', metode: 'per_pcs', nilai: '150' });
    expect(hasil).toEqual({
      ok: true,
      data: {
        jumlahProduk: 2,
        rataRataSelisih: '150',
        // Selisih sama → urutan nama produk
        produk: [
          {
            produkId: bites.id,
            nama: 'Brownies Bites',
            hppLama: '250',
            hppBaru: '400',
            selisih: '150',
            diBawahTarget: false,
          },
          {
            produkId: cup.id,
            nama: 'Brownies Cup',
            hppLama: '1000',
            hppBaru: '1150',
            selisih: '150',
            diBawahTarget: false,
          },
        ],
      },
    });
    expect(await jumlahBiaya()).toBe(0);
  });

  it('per batch semua produk: dibagi pcs per resep masing-masing', async () => {
    await buatFixture();
    const hasil = await pratinjauDampakBiaya({
      nama: 'Listrik oven',
      metode: 'per_batch',
      nilai: '2400',
    });
    if (!hasil.ok) throw new Error(hasil.error);
    // Cup +100, Bites +50
    expect(hasil.data.produk.map((p) => p.selisih)).toEqual(['100', '50']);
    expect(hasil.data.rataRataSelisih).toBe('75');
  });

  it('produk tertentu hanya mengubah produk itu', async () => {
    const { bites } = await buatFixture();
    const hasil = await pratinjauDampakBiaya({
      nama: 'Gas',
      metode: 'persen',
      nilai: '10',
      produkId: bites.id,
    });
    if (!hasil.ok) throw new Error(hasil.error);
    expect(hasil.data).toMatchObject({ jumlahProduk: 1, rataRataSelisih: '25' });
    expect(hasil.data.produk[0]?.produkId).toBe(bites.id);
  });

  it('mengubah biaya lama memakai selisih terhadap kondisi sekarang', async () => {
    const { cup } = await buatFixture();
    const dibuat = await buatBiayaTambahan({
      nama: 'Gas',
      metode: 'per_pcs',
      nilai: '200',
      produkId: cup.id,
    });
    if (!dibuat.ok) throw new Error(dibuat.error);
    const dasar = { id: dibuat.data.id, nama: 'Gas', metode: 'per_pcs', produkId: cup.id };

    const nonaktif = await pratinjauDampakBiaya({ ...dasar, nilai: '200', aktif: false });
    expect(nonaktif).toMatchObject({
      ok: true,
      data: { jumlahProduk: 1, rataRataSelisih: '-200' },
    });

    const sama = await pratinjauDampakBiaya({ ...dasar, nilai: '200' });
    expect(sama).toEqual({ ok: true, data: { jumlahProduk: 0, rataRataSelisih: '0', produk: [] } });

    const naik = await pratinjauDampakBiaya({ ...dasar, nilai: '250' });
    expect(naik).toMatchObject({ ok: true, data: { jumlahProduk: 1, rataRataSelisih: '50' } });

    const [baris] = await testDb.select().from(biayaTambahan);
    expect(baris?.nilai).toBe('200.0000');
  });

  it('biaya nonaktif yang baru tidak berdampak', async () => {
    await buatFixture();
    expect(
      await pratinjauDampakBiaya({ nama: 'Gas', metode: 'per_pcs', nilai: '150', aktif: false }),
    ).toEqual({ ok: true, data: { jumlahProduk: 0, rataRataSelisih: '0', produk: [] } });
  });

  it('id atau produk yang tidak ada ditolak', async () => {
    await buatFixture();
    expect(
      await pratinjauDampakBiaya({ id: TIDAK_ADA, nama: 'Gas', metode: 'per_pcs', nilai: '1' }),
    ).toEqual({ ok: false, error: 'Biaya tambahan tidak ditemukan' });
    expect(
      await pratinjauDampakBiaya({
        nama: 'Gas',
        metode: 'per_pcs',
        nilai: '1',
        produkId: TIDAK_ADA,
      }),
    ).toMatchObject({ ok: false, error: 'Produk tidak ditemukan' });
  });

  it('tanpa produk aktif → tidak ada dampak', async () => {
    expect(await pratinjauDampakBiaya({ nama: 'Gas', metode: 'per_pcs', nilai: '1' })).toEqual({
      ok: true,
      data: { jumlahProduk: 0, rataRataSelisih: '0', produk: [] },
    });
  });
});

describe('query daftar', () => {
  it('daftar biaya urut nama dengan nama produk, pilihan produk hanya yang aktif', async () => {
    const { cup, bites } = await buatFixture();
    await testDb.insert(biayaTambahan).values([
      { nama: 'tenaga', metode: 'per_pcs', nilai: '100', produkId: null, aktif: false },
      { nama: 'Gas', metode: 'per_batch', nilai: '2400', produkId: cup.id },
    ]);

    expect(
      (await daftarBiayaTambahan()).map((b) => [b.nama, b.namaProduk, b.aktif, b.metode]),
    ).toEqual([
      ['Gas', 'Brownies Cup', true, 'per_batch'],
      ['tenaga', null, false, 'per_pcs'],
    ]);
    expect(await pilihanProdukBiaya()).toEqual([
      { id: bites.id, nama: 'Brownies Bites' },
      { id: cup.id, nama: 'Brownies Cup' },
    ]);
  });
});
