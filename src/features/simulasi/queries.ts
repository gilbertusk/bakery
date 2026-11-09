import 'server-only';

import { asc, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { bahan } from '@/db/schema';

export type PilihanBahanSimulasi = {
  id: string;
  nama: string;
  satuanDasar: (typeof bahan.$inferSelect)['satuanDasar'];
  hargaPerSatuan: string;
  aktif: boolean;
};

/** Semua bahan tetap tersedia agar bahan nonaktif yang masih dipakai resep dapat disimulasikan. */
export async function pilihanBahanSimulasi(): Promise<PilihanBahanSimulasi[]> {
  return db
    .select({
      id: bahan.id,
      nama: bahan.nama,
      satuanDasar: bahan.satuanDasar,
      hargaPerSatuan: bahan.hargaPerSatuan,
      aktif: bahan.aktif,
    })
    .from(bahan)
    .orderBy(asc(sql`lower(${bahan.nama})`), asc(bahan.id));
}
