'use server';

import { inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { bahan } from '@/db/schema';
import { ambilKonteksHpp } from '@/features/hpp/queries';
import { PesanError, aksi } from '@/lib/aksi';
import { saranHarga, simulasiKenaikan } from '@/lib/hpp';

import { simulasiHargaSchema } from './schemas';

const PEMILIK = ['pemilik' as const];

export type HasilSimulasiHarga = {
  jumlahProduk: number;
  jumlahDiBawahTarget: number;
  produk: {
    produkId: string;
    nama: string;
    hargaJual: number;
    hppLama: string;
    hppBaru: string;
    selisih: string;
    marginLama: string | null;
    marginBaru: string | null;
    diBawahTarget: boolean;
    saranHarga: number;
  }[];
};

/** F-PRD-07: hitung dampak perubahan harga bahan untuk produk aktif, tanpa menulis ke DB. */
export const simulasikanHargaBahan = aksi({
  schema: simulasiHargaSchema,
  peran: PEMILIK,
  jalankan: async ({ perubahan }): Promise<HasilSimulasiHarga> => {
    const bahanIds = perubahan.map((item) => item.bahanId);
    const [ditemukan, konteks] = await Promise.all([
      db.select({ id: bahan.id }).from(bahan).where(inArray(bahan.id, bahanIds)),
      ambilKonteksHpp(db, { hanyaAktif: true }),
    ]);
    const idDitemukan = new Set(ditemukan.map((item) => item.id));
    const indexTidakAda = perubahan.findIndex((item) => !idDitemukan.has(item.bahanId));
    if (indexTidakAda >= 0) {
      throw new PesanError('Bahan tidak ditemukan', {
        field: `perubahan.${indexTidakAda}.bahanId`,
      });
    }

    const dampak = simulasiKenaikan(konteks, perubahan);
    const produkById = new Map(konteks.produk.map((item) => [item.id, item]));
    const produk = dampak.map((item) => {
      const info = produkById.get(item.produkId);
      if (!info) throw new Error(`Produk ${item.produkId} tidak ditemukan di konteks HPP`);
      return {
        produkId: item.produkId,
        nama: info.nama,
        hargaJual: Number(info.hargaJual),
        hppLama: item.hppLama.toDecimalPlaces(2).toFixed(2),
        hppBaru: item.hppBaru.toDecimalPlaces(2).toFixed(2),
        selisih: item.selisih.toDecimalPlaces(2).toFixed(2),
        marginLama: item.marginLama?.toDecimalPlaces(4).toString() ?? null,
        marginBaru: item.marginBaru?.toDecimalPlaces(4).toString() ?? null,
        diBawahTarget: item.diBawahTarget,
        saranHarga: saranHarga(item.hppBaru, info.targetMargin),
      };
    });

    return {
      jumlahProduk: produk.length,
      jumlahDiBawahTarget: produk.filter((item) => item.diBawahTarget).length,
      produk,
    };
  },
});
