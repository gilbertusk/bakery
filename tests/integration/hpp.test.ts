import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as schema from '@/db/schema';
import {
  bahan,
  biayaTambahan,
  pengaturanToko,
  produk as produkTable,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
} from '@/db/schema';
import {
  ambilKonteksHpp,
  hitungHppProdukDariKonteks,
  hppSemuaProduk,
  hppUntukSnapshot,
} from '@/features/hpp/queries';
import { ubahHargaJual } from '@/features/hpp/actions';
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

async function buatBahanDenganHarga(nama: string, satuanDasar: 'g' | 'ml' | 'pcs', harga: string) {
  const [baris] = await testDb
    .insert(bahan)
    .values({ nama, kategori: 'bahan', satuanDasar, hargaPerSatuan: harga })
    .returning();
  if (!baris) throw new Error('Gagal membuat bahan');
  return baris;
}

async function buatResepBrowniesPanggang(idBahan: Map<string, string>) {
  const [resep] = await testDb
    .insert(resepAdonan)
    .values({
      nama: 'Brownies Panggang',
      modeHasil: 'timbang',
      hasilGram: '1200',
      aktif: true,
    })
    .returning();
  if (!resep) throw new Error('Gagal membuat resep');

  const items = [
    { bahan: 'tepung', takaran: '250' },
    { bahan: 'gula', takaran: '300' },
    { bahan: 'telur', takaran: '220' },
    { bahan: 'mentega', takaran: '200' },
    { bahan: 'coklat-batang', takaran: '150' },
    { bahan: 'coklat-bubuk', takaran: '50' },
    { bahan: 'keju', takaran: '30' },
  ];

  await testDb.insert(resepAdonanItem).values(
    items.map((item, index) => ({
      resepAdonanId: resep.id,
      bahanId: idBahan.get(item.bahan)!,
      takaran: item.takaran,
      takaranDasar: item.takaran,
      urutan: index + 1,
    })),
  );
  return resep;
}

async function buatProdukCup(resepId: string, idBahan: Map<string, string>, hargaJual = 5000) {
  const [produk] = await testDb
    .insert(produkTable)
    .values({
      nama: 'Brownies Cup 50 g',
      kategori: 'kue basah',
      cetakan: 'cup 50 ml',
      hargaJual,
      targetMargin: '0.3000',
      dijual: true,
      aktif: true,
    })
    .returning();
  if (!produk) throw new Error('Gagal membuat produk');

  await testDb.insert(produkKomponen).values([
    {
      produkId: produk.id,
      peran: 'adonan' as const,
      resepAdonanId: resepId,
      takaran: '50',
      takaranDasar: '50',
    },
    {
      produkId: produk.id,
      peran: 'kemasan' as const,
      bahanId: idBahan.get('kemasan-cup')!,
      takaran: '1',
      takaranDasar: '1',
      konversiSatuanId: null,
    },
  ]);
  return produk;
}

async function buatFixtureLengkap() {
  const idBahan = new Map<string, string>();
  for (const [key, nama, satuan, harga] of [
    ['tepung', 'Tepung Terigu', 'g', '15.0000'],
    ['gula', 'Gula Pasir', 'g', '18.0000'],
    ['telur', 'Telur', 'g', '30.0000'],
    ['mentega', 'Mentega', 'g', '45.0000'],
    ['coklat-batang', 'Coklat Batang', 'g', '120.0000'],
    ['coklat-bubuk', 'Coklat Bubuk', 'g', '90.0000'],
    ['keju', 'Keju Parut', 'g', '110.0000'],
    ['kemasan-cup', 'Kemasan Cup Plastik', 'pcs', '500.0000'],
  ] as const) {
    const b = await buatBahanDenganHarga(nama, satuan, harga);
    idBahan.set(key, b.id);
  }

  const resep = await buatResepBrowniesPanggang(idBahan);
  const produk = await buatProdukCup(resep.id, idBahan);
  return { resep, produk, idBahan };
}

function buatDbCounter() {
  let hitungQuery = 0;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL untuk test belum diisi di .env.test');
  const client = postgres(databaseUrl, { max: 1 });
  const origUnsafe = client.unsafe.bind(client);
  client.unsafe = ((query: unknown, ...args: unknown[]) => {
    hitungQuery++;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return origUnsafe(query as any, ...(args as any[]));
  }) as unknown as typeof client.unsafe;
  const db = drizzle({ client, schema, casing: 'snake_case' });
  return {
    db,
    get hitung() {
      return hitungQuery;
    },
    tutup: () => client.end(),
  };
}

describe('hppSemuaProduk', () => {
  it('menghitung HPP, margin, dan saran harga untuk Brownies Cup', async () => {
    const { produk } = await buatFixtureLengkap();

    const hasil = await hppSemuaProduk(testDb, {});
    const cup = hasil.get(produk.id);

    expect(cup).toBeDefined();
    if (!cup) throw new Error('Produk tidak ditemukan dalam hasil HPP');
    // HPP: 50g × 42,125/g + 1 × 500 = 2106,25 + 500 = 2606,25
    expect(cup.hpp.toString()).toBe('2606.25');
    // Margin Rp: 5000 - 2606,25 = 2393,75
    expect(cup.marginRp.toString()).toBe('2393.75');
    // Margin %: 2393,75 / 5000 = 0,47875
    expect(cup.marginPersen?.toFixed(5)).toBe('0.47875');
    // Target 0,3, margin 0,47875 ≥ 0,3 → tidak di bawah target
    expect(cup.diBawahTarget).toBe(false);
    // Saran harga: ceil(2606,25 / 0,7 / 500) × 500 = 4000
    expect(cup.saranHarga).toBe(4000);
  });

  it('HPP berubah saat harga bahan diubah, tanpa simpan ulang produk', async () => {
    const { produk, idBahan } = await buatFixtureLengkap();

    const sebelum = await hppSemuaProduk(testDb, {});
    const hppSebelum = sebelum.get(produk.id)!.hpp;

    // Ganti harga tepung dari 15000 → 20000
    await testDb
      .update(bahan)
      .set({ hargaPerSatuan: '20.0000' })
      .where(eq(bahan.id, idBahan.get('tepung')!));

    const sesudah = await hppSemuaProduk(testDb, {});
    const hppSesudah = sesudah.get(produk.id)!.hpp;

    expect(hppSesudah).not.toBe(hppSebelum);
    // Tepung 250g × 5 selisih = 1250 di resep, per pcs (50g/1200g) = 52,0833…
    expect(hppSesudah.minus(hppSebelum).toString()).toBe('52.08333333333333333333333334');
  });

  it('maksimal 5 query untuk ambil konteks HPP semua produk', async () => {
    await buatFixtureLengkap();

    const { db, hitung, tutup } = buatDbCounter();
    try {
      await hppSemuaProduk(db, {});
      expect(hitung).toBeLessThanOrEqual(5);
    } finally {
      tutup();
    }
  });

  it('memakai target margin default toko saat produk tidak punya target', async () => {
    await testDb
      .insert(pengaturanToko)
      .values({ id: 1, targetMarginDefault: '0.4200' })
      .onConflictDoUpdate({
        target: pengaturanToko.id,
        set: { targetMarginDefault: '0.4200' },
      });
    const [produk] = await testDb
      .insert(produkTable)
      .values({
        nama: 'Produk Target Default',
        kategori: 'kue',
        hargaJual: 10000,
        targetMargin: null,
        dijual: true,
        aktif: true,
      })
      .returning();
    if (!produk) throw new Error('Gagal membuat produk');

    const hasil = await hppSemuaProduk(testDb);

    expect(hasil.get(produk.id)?.target.toFixed(4)).toBe('0.4200');
  });

  it('menggabungkan overhead global dan khusus produk serta mempertahankan label komponen', async () => {
    const { produk } = await buatFixtureLengkap();
    await testDb.insert(biayaTambahan).values([
      { nama: 'Listrik global', metode: 'per_pcs', nilai: '100', produkId: null, aktif: true },
      {
        nama: 'Gas khusus',
        metode: 'per_pcs',
        nilai: '200',
        produkId: produk.id,
        aktif: true,
      },
    ]);

    const konteks = await ambilKonteksHpp(testDb, { produkIds: [produk.id] });
    const rincian = hitungHppProdukDariKonteks(konteks, produk.id);

    expect(rincian?.overhead.total.toString()).toBe('300');
    expect(rincian?.hpp.toString()).toBe('2906.25');
    expect(rincian?.perKomponen.map((item) => item.label)).toEqual([
      'Brownies Panggang',
      'Kemasan Cup Plastik',
    ]);
  });

  it('menghitung 100 produk sintetis dalam kurang dari 300 ms', async () => {
    const { resep, produk, idBahan } = await buatFixtureLengkap();
    const produkTambahan = await testDb
      .insert(produkTable)
      .values(
        Array.from({ length: 99 }, (_, index) => ({
          nama: `Produk Sintetis ${String(index + 1).padStart(2, '0')}`,
          kategori: 'kue',
          hargaJual: 5000,
          targetMargin: null,
          dijual: true,
          aktif: true,
        })),
      )
      .returning({ id: produkTable.id });
    await testDb.insert(produkKomponen).values(
      produkTambahan.flatMap((item) => [
        {
          produkId: item.id,
          peran: 'adonan' as const,
          resepAdonanId: resep.id,
          takaran: '50',
          takaranDasar: '50',
        },
        {
          produkId: item.id,
          peran: 'kemasan' as const,
          bahanId: idBahan.get('kemasan-cup')!,
          takaran: '1',
          takaranDasar: '1',
        },
      ]),
    );

    const mulai = performance.now();
    const hasil = await hppSemuaProduk(testDb);
    const durasiMs = performance.now() - mulai;

    expect(hasil).toHaveLength(100);
    expect(hasil.has(produk.id)).toBe(true);
    expect(durasiMs).toBeLessThan(300);
  });

  it('produk tanpa komponen masih dikembalikan dengan HPP nol', async () => {
    const [produk] = await testDb
      .insert(produkTable)
      .values({
        nama: 'Produk Kosong',
        kategori: 'kue',
        hargaJual: 10000,
        dijual: true,
        aktif: true,
      })
      .returning();
    if (!produk) throw new Error('Gagal membuat produk');

    const hasil = await hppSemuaProduk(testDb, {});
    const kosong = hasil.get(produk.id);
    expect(kosong).toBeDefined();
    if (!kosong) throw new Error('Produk tidak ditemukan');
    expect(kosong.hpp.toString()).toBe('0');
  });
});

describe('hppUntukSnapshot', () => {
  it('mengembalikan HPP dengan 2 desimal per produk', async () => {
    const { produk } = await buatFixtureLengkap();

    const hasil = await hppUntukSnapshot(testDb, [produk.id]);
    expect(hasil.get(produk.id)).toBe('2606.25');
  });

  it('array kosong mengembalikan Map kosong tanpa query bermasalah', async () => {
    const { db, hitung, tutup } = buatDbCounter();
    try {
      const hasil = await hppUntukSnapshot(db, []);
      expect(hasil).toEqual(new Map());
      expect(hitung).toBe(0);
    } finally {
      tutup();
    }
  });

  it('produk yang tidak ada diabaikan', async () => {
    const hasil = await hppUntukSnapshot(testDb, [TIDAK_ADA]);
    expect(hasil).toEqual(new Map());
  });
});

describe('ubahHargaJual dan otorisasi', () => {
  it('ubah harga jual dengan audit', async () => {
    const { produk } = await buatFixtureLengkap();

    const hasil = await ubahHargaJual({ id: produk.id, hargaJual: '6000' });
    expect(hasil).toMatchObject({ ok: true });

    const [baris] = await testDb
      .select({ hargaJual: produkTable.hargaJual })
      .from(produkTable)
      .where(eq(produkTable.id, produk.id));
    expect(baris?.hargaJual).toBe(6000);
  });

  it('id produk tidak ada ditolak', async () => {
    const hasil = await ubahHargaJual({ id: TIDAK_ADA, hargaJual: '6000' });
    expect(hasil).toEqual({ ok: false, error: 'Produk tidak ditemukan' });
  });

  it('kasir ditolak mengubah harga jual', async () => {
    const { produk } = await buatFixtureLengkap();
    getPenggunaMock.mockResolvedValue(KASIR);
    const ditolak = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };

    const hasil = await ubahHargaJual({ id: produk.id, hargaJual: '6000' });
    expect(hasil).toEqual(ditolak);

    const [baris] = await testDb
      .select({ hargaJual: produkTable.hargaJual })
      .from(produkTable)
      .where(eq(produkTable.id, produk.id));
    expect(baris?.hargaJual).toBe(5000);
  });

  it('harga jual negatif ditolak', async () => {
    const { produk } = await buatFixtureLengkap();
    const hasil = await ubahHargaJual({ id: produk.id, hargaJual: '-1000' });
    expect(hasil).toMatchObject({
      ok: false,
      fieldErrors: { hargaJual: ['Minimal 0'] },
    });
  });
});
