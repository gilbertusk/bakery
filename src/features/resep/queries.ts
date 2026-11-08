import 'server-only';

import { asc, countDistinct, eq, inArray, sql } from 'drizzle-orm';

import { type Db, type Tx, db } from '@/db/client';
import {
  bahan,
  konversiSatuan,
  produk,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
} from '@/db/schema';
import { D, type Decimal } from '@/lib/angka';
import { biayaAdonan } from '@/lib/hpp';

type Klien = Db | Tx;

export type BiayaResep = { biayaTotal: Decimal; biayaPerGram: Decimal; hasilGram: string };

/** Satu query item+harga untuk seluruh ID resep; tidak melakukan query per resep. */
export async function ambilBiayaResep(
  klien: Klien,
  resepIds: string[],
): Promise<Map<string, BiayaResep>> {
  if (resepIds.length === 0) return new Map();
  const baris = await klien
    .select({
      resepId: resepAdonan.id,
      hasilGram: resepAdonan.hasilGram,
      takaranDasar: resepAdonanItem.takaranDasar,
      hargaPerSatuan: bahan.hargaPerSatuan,
    })
    .from(resepAdonan)
    .innerJoin(resepAdonanItem, eq(resepAdonanItem.resepAdonanId, resepAdonan.id))
    .innerJoin(bahan, eq(bahan.id, resepAdonanItem.bahanId))
    .where(inArray(resepAdonan.id, [...new Set(resepIds)]));

  const kelompok = new Map<
    string,
    { hasilGram: string; items: { takaranDasar: string; hargaPerSatuan: string }[] }
  >();
  for (const item of baris) {
    const grup = kelompok.get(item.resepId) ?? { hasilGram: item.hasilGram, items: [] };
    grup.items.push({ takaranDasar: item.takaranDasar, hargaPerSatuan: item.hargaPerSatuan });
    kelompok.set(item.resepId, grup);
  }

  const hasil = new Map<string, BiayaResep>();
  for (const [resepId, grup] of kelompok) {
    hasil.set(resepId, {
      ...biayaAdonan({ items: grup.items, hasilGram: grup.hasilGram }),
      hasilGram: grup.hasilGram,
    });
  }
  return hasil;
}

export type BarisResep = {
  id: string;
  nama: string;
  hasilGram: string;
  biayaTotal: string;
  biayaPerGram: string;
  jumlahProduk: number;
  aktif: boolean;
};

export async function daftarResep(): Promise<BarisResep[]> {
  const resep = await db
    .select({
      id: resepAdonan.id,
      nama: resepAdonan.nama,
      hasilGram: resepAdonan.hasilGram,
      aktif: resepAdonan.aktif,
    })
    .from(resepAdonan)
    .orderBy(asc(sql`lower(${resepAdonan.nama})`), asc(resepAdonan.id));
  if (resep.length === 0) return [];

  const [biaya, jumlahProduk] = await Promise.all([
    ambilBiayaResep(
      db,
      resep.map((item) => item.id),
    ),
    db
      .select({
        resepId: produkKomponen.resepAdonanId,
        jumlah: countDistinct(produkKomponen.produkId),
      })
      .from(produkKomponen)
      .where(
        inArray(
          produkKomponen.resepAdonanId,
          resep.map((item) => item.id),
        ),
      )
      .groupBy(produkKomponen.resepAdonanId),
  ]);
  const jumlahById = new Map(jumlahProduk.map((item) => [item.resepId, item.jumlah]));

  return resep.map((item) => {
    const hitung = biaya.get(item.id);
    return {
      ...item,
      biayaTotal: hitung?.biayaTotal.toString() ?? '0',
      biayaPerGram: hitung?.biayaPerGram.toString() ?? '0',
      jumlahProduk: jumlahById.get(item.id) ?? 0,
    };
  });
}

export type PilihanBahanResep = {
  id: string;
  nama: string;
  satuanDasar: (typeof bahan.$inferSelect)['satuanDasar'];
  hargaPerSatuan: string;
  konversi: { id: string; namaSatuan: string; nilaiDasar: string }[];
};

async function bahanDenganKonversi(
  aktifSaja: boolean,
  ids?: string[],
): Promise<PilihanBahanResep[]> {
  if (!aktifSaja && ids?.length === 0) return [];
  const syarat = aktifSaja
    ? eq(bahan.aktif, true)
    : ids?.length
      ? inArray(bahan.id, ids)
      : undefined;
  const baris = await db
    .select({
      id: bahan.id,
      nama: bahan.nama,
      satuanDasar: bahan.satuanDasar,
      hargaPerSatuan: bahan.hargaPerSatuan,
      konversiId: konversiSatuan.id,
      namaSatuan: konversiSatuan.namaSatuan,
      nilaiDasar: konversiSatuan.nilaiDasar,
    })
    .from(bahan)
    .leftJoin(konversiSatuan, eq(konversiSatuan.bahanId, bahan.id))
    .where(syarat)
    .orderBy(asc(sql`lower(${bahan.nama})`), asc(sql`lower(${konversiSatuan.namaSatuan})`));

  const hasil = new Map<string, PilihanBahanResep>();
  for (const item of baris) {
    const grup = hasil.get(item.id) ?? {
      id: item.id,
      nama: item.nama,
      satuanDasar: item.satuanDasar,
      hargaPerSatuan: item.hargaPerSatuan,
      konversi: [],
    };
    if (item.konversiId && item.namaSatuan && item.nilaiDasar) {
      grup.konversi.push({
        id: item.konversiId,
        namaSatuan: item.namaSatuan,
        nilaiDasar: item.nilaiDasar,
      });
    }
    hasil.set(item.id, grup);
  }
  return [...hasil.values()];
}

export function pilihanBahan(): Promise<PilihanBahanResep[]> {
  return bahanDenganKonversi(true);
}

export type DetailResep = {
  id: string;
  nama: string;
  modeHasil: (typeof resepAdonan.$inferSelect)['modeHasil'];
  hasilGram: string;
  caraBuat: string | null;
  bentukLoyang: (typeof resepAdonan.$inferSelect)['bentukLoyang'];
  diameterCm: string | null;
  panjangCm: string | null;
  lebarCm: string | null;
  aktif: boolean;
  biayaTotal: string;
  biayaPerGram: string;
  items: Array<{
    id: string;
    bahanId: string;
    namaBahan: string;
    bahanAktif: boolean;
    satuanDasar: (typeof bahan.$inferSelect)['satuanDasar'];
    hargaPerSatuan: string;
    takaran: string;
    konversiSatuanId: string | null;
    namaSatuan: string | null;
    takaranDasar: string;
    biaya: string;
    urutan: number;
    konversi: PilihanBahanResep['konversi'];
  }>;
  produk: { id: string; nama: string; aktif: boolean }[];
};

export async function detailResep(id: string): Promise<DetailResep | null> {
  const [resep] = await db.select().from(resepAdonan).where(eq(resepAdonan.id, id));
  if (!resep) return null;

  const [items, produkPemakai] = await Promise.all([
    db
      .select({
        id: resepAdonanItem.id,
        bahanId: bahan.id,
        namaBahan: bahan.nama,
        bahanAktif: bahan.aktif,
        satuanDasar: bahan.satuanDasar,
        hargaPerSatuan: bahan.hargaPerSatuan,
        takaran: resepAdonanItem.takaran,
        konversiSatuanId: resepAdonanItem.konversiSatuanId,
        namaSatuan: konversiSatuan.namaSatuan,
        takaranDasar: resepAdonanItem.takaranDasar,
        urutan: resepAdonanItem.urutan,
      })
      .from(resepAdonanItem)
      .innerJoin(bahan, eq(bahan.id, resepAdonanItem.bahanId))
      .leftJoin(konversiSatuan, eq(konversiSatuan.id, resepAdonanItem.konversiSatuanId))
      .where(eq(resepAdonanItem.resepAdonanId, id))
      .orderBy(asc(resepAdonanItem.urutan)),
    db
      .selectDistinct({ id: produk.id, nama: produk.nama, aktif: produk.aktif })
      .from(produkKomponen)
      .innerJoin(produk, eq(produk.id, produkKomponen.produkId))
      .where(eq(produkKomponen.resepAdonanId, id))
      .orderBy(asc(produk.nama)),
  ]);

  const pilihanItem = await bahanDenganKonversi(false, [
    ...new Set(items.map((item) => item.bahanId)),
  ]);
  const pilihanById = new Map(pilihanItem.map((item) => [item.id, item]));
  const biaya = biayaAdonan({ items, hasilGram: resep.hasilGram });

  return {
    ...resep,
    biayaTotal: biaya.biayaTotal.toString(),
    biayaPerGram: biaya.biayaPerGram.toString(),
    items: items.map((item) => ({
      ...item,
      biaya: D(item.takaranDasar).times(item.hargaPerSatuan).toString(),
      konversi: pilihanById.get(item.bahanId)?.konversi ?? [],
    })),
    produk: produkPemakai,
  };
}
