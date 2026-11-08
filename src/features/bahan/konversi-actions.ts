'use server';

import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { type Tx, db } from '@/db/client';
import {
  bahan,
  konversiSatuan,
  produk,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
} from '@/db/schema';
import { D } from '@/lib/angka';
import { PesanError, aksi } from '@/lib/aksi';

import { hitungUlangHasilResep, hitungUlangTakaranDasarKonversi } from '../resep/hitung-ulang';
import { hapusKonversiSchema, tambahKonversiSchema, ubahKonversiSchema } from './konversi-schemas';

const PEMILIK = ['pemilik' as const];
const PESAN_TIDAK_ADA = 'Konversi tidak ditemukan';
const PESAN_DUPLIKAT = 'Nama satuan sudah dipakai untuk bahan ini';
const PESAN_SAMA_DASAR = 'Nama satuan tidak boleh sama dengan satuan dasar';

function segarkan(bahanId: string) {
  revalidatePath(`/bahan/${bahanId}`);
  revalidatePath('/resep');
  revalidatePath('/produk');
}

async function pastikanNamaUnik(tx: Tx, bahanId: string, namaSatuan: string, kecualiId?: string) {
  const [lain] = await tx
    .select({ id: konversiSatuan.id })
    .from(konversiSatuan)
    .where(
      and(
        eq(konversiSatuan.bahanId, bahanId),
        eq(sql`lower(${konversiSatuan.namaSatuan})`, namaSatuan.toLowerCase()),
        kecualiId ? ne(konversiSatuan.id, kecualiId) : undefined,
      ),
    )
    .limit(1);
  if (lain) throw new PesanError(PESAN_DUPLIKAT, { field: 'namaSatuan' });
}

function pastikanBukanSatuanDasar(namaSatuan: string, satuanDasar: string) {
  if (namaSatuan.toLowerCase() === satuanDasar.toLowerCase()) {
    throw new PesanError(PESAN_SAMA_DASAR, { field: 'namaSatuan' });
  }
}

async function ambilKonversiTerkunci(tx: Tx, id: string) {
  const [konversi] = await tx
    .select({
      id: konversiSatuan.id,
      bahanId: konversiSatuan.bahanId,
      namaSatuan: konversiSatuan.namaSatuan,
      nilaiDasar: konversiSatuan.nilaiDasar,
    })
    .from(konversiSatuan)
    .where(eq(konversiSatuan.id, id))
    .for('update');
  if (!konversi) throw new PesanError(PESAN_TIDAK_ADA);
  return konversi;
}

async function ambilSatuanDasar(tx: Tx, bahanId: string) {
  const [baris] = await tx
    .select({ satuanDasar: bahan.satuanDasar })
    .from(bahan)
    .where(eq(bahan.id, bahanId))
    .for('update');
  if (!baris) throw new PesanError('Bahan tidak ditemukan');
  return baris.satuanDasar;
}

export const tambahKonversi = aksi({
  schema: tambahKonversiSchema,
  peran: PEMILIK,
  jalankan: async ({ bahanId, namaSatuan, nilaiDasar }) => {
    const id = await db.transaction(async (tx) => {
      const satuanDasar = await ambilSatuanDasar(tx, bahanId);
      pastikanBukanSatuanDasar(namaSatuan, satuanDasar);
      await pastikanNamaUnik(tx, bahanId, namaSatuan);
      const [baris] = await tx
        .insert(konversiSatuan)
        .values({ bahanId, namaSatuan, nilaiDasar })
        .returning({ id: konversiSatuan.id });
      if (!baris) throw new Error('Gagal menyimpan konversi');
      return baris.id;
    });
    segarkan(bahanId);
    return { id };
  },
});

export const ubahKonversi = aksi({
  schema: ubahKonversiSchema,
  peran: PEMILIK,
  jalankan: async ({ id, namaSatuan, nilaiDasar }) => {
    const bahanId = await db.transaction(async (tx) => {
      const lama = await ambilKonversiTerkunci(tx, id);
      const satuanDasar = await ambilSatuanDasar(tx, lama.bahanId);
      pastikanBukanSatuanDasar(namaSatuan, satuanDasar);
      await pastikanNamaUnik(tx, lama.bahanId, namaSatuan, id);

      await tx
        .update(konversiSatuan)
        .set({ namaSatuan, nilaiDasar })
        .where(eq(konversiSatuan.id, id));

      if (!D(lama.nilaiDasar).eq(nilaiDasar)) {
        const resepIds = await hitungUlangTakaranDasarKonversi(tx, id);
        for (const resepId of resepIds) await hitungUlangHasilResep(tx, resepId);
      }
      return lama.bahanId;
    });
    segarkan(bahanId);
    return { id };
  },
});

export const hapusKonversi = aksi({
  schema: hapusKonversiSchema,
  peran: PEMILIK,
  jalankan: async ({ id }) => {
    const bahanId = await db.transaction(async (tx) => {
      const konversi = await ambilKonversiTerkunci(tx, id);
      const resepPemakai = await tx
        .selectDistinct({ nama: resepAdonan.nama })
        .from(resepAdonanItem)
        .innerJoin(resepAdonan, eq(resepAdonan.id, resepAdonanItem.resepAdonanId))
        .where(eq(resepAdonanItem.konversiSatuanId, id))
        .orderBy(asc(resepAdonan.nama));
      if (resepPemakai.length > 0) {
        throw new PesanError(
          `Konversi tidak bisa dihapus karena dipakai resep ${resepPemakai.map((r) => r.nama).join(', ')}`,
        );
      }

      const produkPemakai = await tx
        .selectDistinct({ nama: produk.nama })
        .from(produkKomponen)
        .innerJoin(produk, eq(produk.id, produkKomponen.produkId))
        .where(eq(produkKomponen.konversiSatuanId, id))
        .orderBy(asc(produk.nama));
      if (produkPemakai.length > 0) {
        throw new PesanError(
          `Konversi tidak bisa dihapus karena dipakai produk ${produkPemakai.map((p) => p.nama).join(', ')}`,
        );
      }

      await tx.delete(konversiSatuan).where(eq(konversiSatuan.id, id));
      return konversi.bahanId;
    });
    segarkan(bahanId);
    return { id };
  },
});
