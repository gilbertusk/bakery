'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db/client';
import { biayaTambahan, produk } from '@/db/schema';
import { simulasiBiayaTambahan } from '@/lib/hpp/simulasi';
import { D } from '@/lib/angka';
import { PesanError, aksi } from '@/lib/aksi';
import { ambilKonteksHpp } from '@/features/hpp/queries';

import {
  biayaTambahanSchema,
  hapusBiayaTambahanSchema,
  pratinjauDampakBiayaSchema,
  setAktifBiayaTambahanSchema,
  ubahBiayaTambahanSchema,
} from './schemas';

const PEMILIK = ['pemilik' as const];
const PESAN_TIDAK_ADA = 'Biaya tambahan tidak ditemukan';

// HPP semua produk ikut berubah, jadi seluruh cabang /produk disegarkan.
function segarkan() {
  revalidatePath('/produk', 'layout');
}

async function pastikanProduk(produkId: string | null) {
  if (produkId === null) return;
  const [baris] = await db.select({ id: produk.id }).from(produk).where(eq(produk.id, produkId));
  if (!baris) throw new PesanError('Produk tidak ditemukan', { field: 'produkId' });
}

export const buatBiayaTambahan = aksi({
  schema: biayaTambahanSchema,
  peran: PEMILIK,
  jalankan: async (data) => {
    await pastikanProduk(data.produkId);
    const [baris] = await db.insert(biayaTambahan).values(data).returning({ id: biayaTambahan.id });
    if (!baris) throw new Error('Gagal menyimpan biaya tambahan');
    segarkan();
    return baris;
  },
});

export const ubahBiayaTambahan = aksi({
  schema: ubahBiayaTambahanSchema,
  peran: PEMILIK,
  jalankan: async ({ id, ...data }) => {
    await pastikanProduk(data.produkId);
    const [baris] = await db
      .update(biayaTambahan)
      .set(data)
      .where(eq(biayaTambahan.id, id))
      .returning({ id: biayaTambahan.id });
    if (!baris) throw new PesanError(PESAN_TIDAK_ADA);
    segarkan();
    return baris;
  },
});

export const setAktifBiayaTambahan = aksi({
  schema: setAktifBiayaTambahanSchema,
  peran: PEMILIK,
  jalankan: async ({ id, aktif }) => {
    const [baris] = await db
      .update(biayaTambahan)
      .set({ aktif })
      .where(eq(biayaTambahan.id, id))
      .returning({ id: biayaTambahan.id, aktif: biayaTambahan.aktif });
    if (!baris) throw new PesanError(PESAN_TIDAK_ADA);
    segarkan();
    return baris;
  },
});

export const hapusBiayaTambahan = aksi({
  schema: hapusBiayaTambahanSchema,
  peran: PEMILIK,
  jalankan: async ({ id }) => {
    const [baris] = await db
      .delete(biayaTambahan)
      .where(eq(biayaTambahan.id, id))
      .returning({ id: biayaTambahan.id });
    if (!baris) throw new PesanError(PESAN_TIDAK_ADA);
    segarkan();
    return baris;
  },
});

export type DampakBiaya = {
  jumlahProduk: number;
  /** Rata-rata selisih HPP per pcs, 2 desimal. */
  rataRataSelisih: string;
  produk: {
    produkId: string;
    nama: string;
    hppLama: string;
    hppBaru: string;
    selisih: string;
    diBawahTarget: boolean;
  }[];
};

/** Hitung dampak biaya ke HPP produk aktif tanpa menyimpan apa pun. */
export const pratinjauDampakBiaya = aksi({
  schema: pratinjauDampakBiayaSchema,
  peran: PEMILIK,
  jalankan: async ({ id, nama, metode, nilai, produkId, aktif }): Promise<DampakBiaya> => {
    await pastikanProduk(produkId);
    if (id !== null) {
      const [baris] = await db
        .select({ id: biayaTambahan.id })
        .from(biayaTambahan)
        .where(eq(biayaTambahan.id, id));
      if (!baris) throw new PesanError(PESAN_TIDAK_ADA);
    }

    const konteks = await ambilKonteksHpp(db, { hanyaAktif: true });
    const dampak = simulasiBiayaTambahan(konteks, {
      id,
      produkId,
      aktif,
      biaya: { nama, metode, nilai },
    });
    const namaProduk = new Map(konteks.produk.map((p) => [p.id, p.nama]));
    const total = dampak.reduce((jumlah, d) => jumlah.plus(d.selisih), D(0));

    return {
      jumlahProduk: dampak.length,
      rataRataSelisih:
        dampak.length === 0 ? '0' : total.div(dampak.length).toDecimalPlaces(2).toFixed(),
      produk: dampak.map((d) => ({
        produkId: d.produkId,
        nama: namaProduk.get(d.produkId) ?? '',
        hppLama: d.hppLama.toDecimalPlaces(2).toFixed(),
        hppBaru: d.hppBaru.toDecimalPlaces(2).toFixed(),
        selisih: d.selisih.toDecimalPlaces(2).toFixed(),
        diBawahTarget: d.diBawahTarget,
      })),
    };
  },
});
