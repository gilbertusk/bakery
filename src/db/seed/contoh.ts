import { and, eq } from 'drizzle-orm';

import type { Db, Tx } from '@/db/client';
import {
  bahan,
  konversiSatuan,
  produk,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
  stokMutasi,
} from '@/db/schema';

import { seedSistem } from './sistem';

const BAHAN_CONTOH = [
  { nama: 'Tepung Terigu', kategori: 'tepung', satuanDasar: 'g', harga: '15.0000', stok: '5000' },
  { nama: 'Gula Pasir', kategori: 'gula', satuanDasar: 'g', harga: '18.0000', stok: '5000' },
  { nama: 'Telur', kategori: 'telur', satuanDasar: 'g', harga: '30.0000', stok: '3000' },
  { nama: 'Mentega', kategori: 'lemak', satuanDasar: 'g', harga: '45.0000', stok: '2000' },
  {
    nama: 'Coklat Batang',
    kategori: 'coklat',
    satuanDasar: 'g',
    harga: '120.0000',
    stok: '2000',
  },
  {
    nama: 'Coklat Bubuk',
    kategori: 'coklat',
    satuanDasar: 'g',
    harga: '90.0000',
    stok: '1000',
  },
  {
    nama: 'Keju Parut',
    kategori: 'topping',
    satuanDasar: 'g',
    harga: '110.0000',
    stok: '1000',
  },
  {
    nama: 'Kemasan Cup Plastik',
    kategori: 'kemasan',
    satuanDasar: 'pcs',
    harga: '500.0000',
    stok: '100',
  },
] as const;

async function pastikanBahan(tx: Tx, data: (typeof BAHAN_CONTOH)[number]) {
  const [existing] = await tx.select().from(bahan).where(eq(bahan.nama, data.nama)).limit(1);
  if (existing) return existing;

  const [created] = await tx
    .insert(bahan)
    .values({
      nama: data.nama,
      kategori: data.kategori,
      satuanDasar: data.satuanDasar,
      hargaPerSatuan: data.harga,
    })
    .returning();
  if (!created) throw new Error(`Gagal membuat bahan contoh: ${data.nama}`);
  return created;
}

async function pastikanProduk(
  tx: Tx,
  data: { nama: string; kategori: string; cetakan: string; hargaJual: number },
) {
  const [existing] = await tx.select().from(produk).where(eq(produk.nama, data.nama)).limit(1);
  if (existing) return existing;

  const [created] = await tx.insert(produk).values(data).returning();
  if (!created) throw new Error(`Gagal membuat produk contoh: ${data.nama}`);
  return created;
}

export async function seedContoh(database: Db) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed data contoh tidak boleh dijalankan di production');
  }

  await seedSistem(database);

  await database.transaction(async (tx) => {
    const bahanByName = new Map<string, typeof bahan.$inferSelect>();
    for (const data of BAHAN_CONTOH) {
      bahanByName.set(data.nama, await pastikanBahan(tx, data));
    }

    const conversions = [
      { bahan: 'Tepung Terigu', namaSatuan: 'sdm', nilaiDasar: '8' },
      { bahan: 'Tepung Terigu', namaSatuan: 'cup', nilaiDasar: '125' },
      { bahan: 'Gula Pasir', namaSatuan: 'sdm', nilaiDasar: '12.5' },
      { bahan: 'Gula Pasir', namaSatuan: 'cup', nilaiDasar: '200' },
      { bahan: 'Telur', namaSatuan: 'butir', nilaiDasar: '55' },
      { bahan: 'Mentega', namaSatuan: 'sdm', nilaiDasar: '14' },
      { bahan: 'Coklat Bubuk', namaSatuan: 'sdm', nilaiDasar: '7' },
    ];
    for (const conversion of conversions) {
      const target = bahanByName.get(conversion.bahan);
      if (!target) throw new Error(`Bahan contoh tidak ditemukan: ${conversion.bahan}`);
      await tx
        .insert(konversiSatuan)
        .values({
          bahanId: target.id,
          namaSatuan: conversion.namaSatuan,
          nilaiDasar: conversion.nilaiDasar,
        })
        .onConflictDoNothing();
    }

    let [resep] = await tx
      .select()
      .from(resepAdonan)
      .where(eq(resepAdonan.nama, 'Brownies Panggang'))
      .limit(1);
    if (!resep) {
      [resep] = await tx
        .insert(resepAdonan)
        .values({ nama: 'Brownies Panggang', modeHasil: 'timbang', hasilGram: '1200' })
        .returning();
    }
    if (!resep) throw new Error('Gagal membuat resep contoh');

    const [itemExisting] = await tx
      .select({ id: resepAdonanItem.id })
      .from(resepAdonanItem)
      .where(eq(resepAdonanItem.resepAdonanId, resep.id))
      .limit(1);
    if (!itemExisting) {
      const recipeItems = [
        ['Tepung Terigu', '250'],
        ['Gula Pasir', '300'],
        ['Telur', '220'],
        ['Mentega', '200'],
        ['Coklat Batang', '150'],
        ['Coklat Bubuk', '50'],
        ['Keju Parut', '30'],
      ] as const;
      await tx.insert(resepAdonanItem).values(
        recipeItems.map(([nama, takaran], urutan) => {
          const target = bahanByName.get(nama);
          if (!target) throw new Error(`Bahan resep tidak ditemukan: ${nama}`);
          return {
            resepAdonanId: resep.id,
            bahanId: target.id,
            takaran,
            takaranDasar: takaran,
            urutan: urutan + 1,
          };
        }),
      );
    }

    const cup = await pastikanProduk(tx, {
      nama: 'Brownies Cup 50 g',
      kategori: 'brownies',
      cetakan: 'cup 50 g',
      hargaJual: 5_000,
    });
    const loyang = await pastikanProduk(tx, {
      nama: 'Brownies Loyang 20×20',
      kategori: 'brownies',
      cetakan: 'loyang 20×20',
      hargaJual: 120_000,
    });
    const bites = await pastikanProduk(tx, {
      nama: 'Brownies Bites 25 g',
      kategori: 'brownies',
      cetakan: 'bites 25 g',
      hargaJual: 3_000,
    });

    const cupPackaging = bahanByName.get('Kemasan Cup Plastik');
    const cheese = bahanByName.get('Keju Parut');
    if (!cupPackaging || !cheese) throw new Error('Bahan komponen produk tidak ditemukan');

    const components: (typeof produkKomponen.$inferInsert)[] = [
      {
        produkId: cup.id,
        peran: 'adonan',
        resepAdonanId: resep.id,
        takaran: '50',
        takaranDasar: '50',
      },
      {
        produkId: cup.id,
        peran: 'kemasan',
        bahanId: cupPackaging.id,
        takaran: '1',
        takaranDasar: '1',
      },
      {
        produkId: loyang.id,
        peran: 'adonan',
        resepAdonanId: resep.id,
        takaran: '1000',
        takaranDasar: '1000',
      },
      {
        produkId: loyang.id,
        peran: 'topping',
        bahanId: cheese.id,
        takaran: '100',
        takaranDasar: '100',
      },
      {
        produkId: bites.id,
        peran: 'adonan',
        resepAdonanId: resep.id,
        takaran: '25',
        takaranDasar: '25',
      },
    ];
    for (const component of components) {
      const targetCondition = component.resepAdonanId
        ? eq(produkKomponen.resepAdonanId, component.resepAdonanId)
        : eq(produkKomponen.bahanId, component.bahanId!);
      const [existing] = await tx
        .select({ id: produkKomponen.id })
        .from(produkKomponen)
        .where(and(eq(produkKomponen.produkId, component.produkId), targetCondition))
        .limit(1);
      if (!existing) await tx.insert(produkKomponen).values(component);
    }

    // TODO(0.7): ganti insert langsung ini dengan catatMutasi().
    for (const data of BAHAN_CONTOH) {
      const target = bahanByName.get(data.nama);
      if (!target) continue;
      const [existing] = await tx
        .select({ id: stokMutasi.id })
        .from(stokMutasi)
        .where(
          and(
            eq(stokMutasi.bahanId, target.id),
            eq(stokMutasi.jenis, 'stok_awal'),
            eq(stokMutasi.alasan, 'Stok awal data contoh'),
          ),
        )
        .limit(1);
      if (existing) continue;

      await tx.insert(stokMutasi).values({
        jenis: 'stok_awal',
        bahanId: target.id,
        qty: data.stok,
        saldoSesudah: data.stok,
        nilaiSatuan: data.harga,
        alasan: 'Stok awal data contoh',
        sumberTipe: 'manual',
      });
      await tx.update(bahan).set({ stok: data.stok }).where(eq(bahan.id, target.id));
    }
  });
}
