import 'server-only';

import { asc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { type MetodeBiaya, biayaTambahan, produk } from '@/db/schema';

export type BarisBiayaTambahan = {
  id: string;
  nama: string;
  metode: MetodeBiaya;
  nilai: string;
  produkId: string | null;
  namaProduk: string | null;
  aktif: boolean;
};

export async function daftarBiayaTambahan(): Promise<BarisBiayaTambahan[]> {
  return db
    .select({
      id: biayaTambahan.id,
      nama: biayaTambahan.nama,
      metode: biayaTambahan.metode,
      nilai: biayaTambahan.nilai,
      produkId: biayaTambahan.produkId,
      namaProduk: produk.nama,
      aktif: biayaTambahan.aktif,
    })
    .from(biayaTambahan)
    .leftJoin(produk, eq(produk.id, biayaTambahan.produkId))
    .orderBy(asc(sql`lower(${biayaTambahan.nama})`), asc(biayaTambahan.id));
}

/** Untuk pilihan "berlaku untuk": hanya produk aktif. */
export async function pilihanProdukBiaya(): Promise<{ id: string; nama: string }[]> {
  return db
    .select({ id: produk.id, nama: produk.nama })
    .from(produk)
    .where(eq(produk.aktif, true))
    .orderBy(asc(sql`lower(${produk.nama})`), asc(produk.id));
}
