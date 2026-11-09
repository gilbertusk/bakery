import 'server-only';

import { asc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { addOn, bahan, konversiSatuan, pengaturanToko } from '@/db/schema';
import { D } from '@/lib/angka';
import { hitungMargin, hppAddOn } from '@/lib/hpp';
import { type PilihanBahanResep, pilihanBahan, pilihanBahanById } from '@/features/resep/queries';

const TARGET_DEFAULT = '0.30';

export type BarisAddOn = {
  id: string;
  nama: string;
  bahanId: string;
  namaBahan: string;
  takaran: string;
  konversiSatuanId: string | null;
  /** Nama konversi, atau satuan dasar bahan bila tanpa konversi. */
  satuan: string;
  takaranDasar: string;
  harga: number;
  hpp: string;
  marginRp: string;
  /** Pecahan 4 desimal (0.2667 = 26,67%); null bila harga 0. */
  marginPersen: string | null;
  diBawahTarget: boolean;
  aktif: boolean;
};

/** Daftar master untuk pemilik, lengkap dengan HPP dan margin terhadap target default toko. */
export async function daftarAddOnPemilik(): Promise<BarisAddOn[]> {
  const [baris, targetToko] = await Promise.all([
    db
      .select({
        id: addOn.id,
        nama: addOn.nama,
        bahanId: addOn.bahanId,
        namaBahan: bahan.nama,
        takaran: addOn.takaran,
        konversiSatuanId: addOn.konversiSatuanId,
        namaSatuan: konversiSatuan.namaSatuan,
        satuanDasar: bahan.satuanDasar,
        takaranDasar: addOn.takaranDasar,
        hargaPerSatuan: bahan.hargaPerSatuan,
        harga: addOn.harga,
        aktif: addOn.aktif,
      })
      .from(addOn)
      .innerJoin(bahan, eq(bahan.id, addOn.bahanId))
      .leftJoin(konversiSatuan, eq(konversiSatuan.id, addOn.konversiSatuanId))
      .orderBy(asc(sql`lower(${addOn.nama})`), asc(addOn.id)),
    targetMarginToko(),
  ]);
  const target = D(targetToko);

  return baris.map(({ namaSatuan, satuanDasar, hargaPerSatuan, ...item }) => {
    const hpp = hppAddOn({ takaranDasar: item.takaranDasar, hargaPerSatuan });
    const { marginRp, marginPersen } = hitungMargin(hpp, item.harga);
    return {
      ...item,
      satuan: namaSatuan ?? satuanDasar,
      hpp: hpp.toString(),
      marginRp: marginRp.toString(),
      marginPersen: marginPersen?.toDecimalPlaces(4).toString() ?? null,
      diBawahTarget: marginPersen === null || marginPersen.lt(target),
    };
  });
}

export type PilihanBahanAddOn = PilihanBahanResep & { aktif: boolean };

/** Pilihan bahan form: bahan aktif, ditambah bahan nonaktif yang masih dipakai add-on. */
export async function pilihanBahanAddOn(daftar: BarisAddOn[]): Promise<PilihanBahanAddOn[]> {
  const aktif = await pilihanBahan();
  const idAktif = new Set(aktif.map((b) => b.id));
  const sisa = [...new Set(daftar.map((a) => a.bahanId))].filter((id) => !idAktif.has(id));
  const nonaktif = sisa.length > 0 ? await pilihanBahanById(sisa) : [];
  return [
    ...aktif.map((b) => ({ ...b, aktif: true })),
    ...nonaktif.map((b) => ({ ...b, aktif: false })),
  ];
}

export async function targetMarginToko(): Promise<string> {
  const [pengaturan] = await db
    .select({ target: pengaturanToko.targetMarginDefault })
    .from(pengaturanToko)
    .where(eq(pengaturanToko.id, 1))
    .limit(1);
  return pengaturan?.target ?? TARGET_DEFAULT;
}

/** DTO kasir: hanya add-on aktif, tanpa data biaya. */
export async function addOnKasir(): Promise<{ id: string; nama: string; harga: number }[]> {
  return db
    .select({ id: addOn.id, nama: addOn.nama, harga: addOn.harga })
    .from(addOn)
    .where(eq(addOn.aktif, true))
    .orderBy(asc(sql`lower(${addOn.nama})`), asc(addOn.id));
}
