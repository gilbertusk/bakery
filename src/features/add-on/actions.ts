'use server';

import { and, eq, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { type Tx, db } from '@/db/client';
import { addOn, bahan, konversiSatuan, penjualanItemAddOn, preOrderItemAddOn } from '@/db/schema';
import { keNumeric } from '@/lib/angka';
import { PesanError, aksi } from '@/lib/aksi';
import { catatAudit } from '@/lib/audit';
import { keSatuanDasar } from '@/lib/hpp';

import {
  type AddOnData,
  addOnSchema,
  hapusAddOnSchema,
  setAktifAddOnSchema,
  ubahAddOnSchema,
} from './schemas';

const PEMILIK = ['pemilik' as const];
const PESAN_TIDAK_ADA = 'Add-on tidak ditemukan';
const PESAN_DUPLIKAT = 'Add-on dengan nama ini sudah ada';
const PESAN_DIPAKAI = 'Add-on sudah dipakai di transaksi; nonaktifkan saja';

function segarkan() {
  revalidatePath('/produk', 'layout');
}

async function pastikanNamaUnik(tx: Tx, nama: string, kecualiId?: string) {
  const [lain] = await tx
    .select({ id: addOn.id })
    .from(addOn)
    .where(
      and(
        eq(sql`lower(${addOn.nama})`, nama.toLowerCase()),
        kecualiId ? ne(addOn.id, kecualiId) : undefined,
      ),
    )
    .limit(1);
  if (lain) throw new PesanError(PESAN_DUPLIKAT, { field: 'nama' });
}

/** Nilai kolom dari input; `takaran_dasar` selalu dihitung di server. */
async function nilaiAddOn(tx: Tx, data: AddOnData) {
  const [infoBahan] = await tx
    .select({ id: bahan.id })
    .from(bahan)
    .where(eq(bahan.id, data.bahanId))
    .limit(1);
  if (!infoBahan) throw new PesanError('Bahan tidak ditemukan', { field: 'bahanId' });

  let nilaiDasar: string | null = null;
  if (data.konversiSatuanId) {
    const [konversi] = await tx
      .select({ bahanId: konversiSatuan.bahanId, nilaiDasar: konversiSatuan.nilaiDasar })
      .from(konversiSatuan)
      .where(eq(konversiSatuan.id, data.konversiSatuanId))
      .limit(1);
    if (!konversi || konversi.bahanId !== data.bahanId) {
      throw new PesanError('Konversi satuan tidak cocok dengan bahan', {
        field: 'konversiSatuanId',
      });
    }
    nilaiDasar = konversi.nilaiDasar;
  }

  return {
    nama: data.nama,
    bahanId: data.bahanId,
    takaran: data.takaran,
    konversiSatuanId: data.konversiSatuanId,
    takaranDasar: keNumeric(keSatuanDasar(data.takaran, nilaiDasar), 3),
    harga: data.harga,
  };
}

export const buatAddOn = aksi({
  schema: addOnSchema,
  peran: PEMILIK,
  jalankan: async (data) => {
    const hasil = await db.transaction(async (tx) => {
      await pastikanNamaUnik(tx, data.nama);
      const [baris] = await tx
        .insert(addOn)
        .values(await nilaiAddOn(tx, data))
        .returning({ id: addOn.id });
      if (!baris) throw new Error('Gagal menyimpan add-on');
      return baris;
    });
    segarkan();
    return hasil;
  },
});

export const ubahAddOn = aksi({
  schema: ubahAddOnSchema,
  peran: PEMILIK,
  jalankan: async ({ id, ...data }, pengguna) => {
    const hasil = await db.transaction(async (tx) => {
      const [lama] = await tx
        .select({ harga: addOn.harga })
        .from(addOn)
        .where(eq(addOn.id, id))
        .for('update');
      if (!lama) throw new PesanError(PESAN_TIDAK_ADA);
      await pastikanNamaUnik(tx, data.nama, id);

      const nilai = await nilaiAddOn(tx, data);
      await tx.update(addOn).set(nilai).where(eq(addOn.id, id));

      if (lama.harga !== nilai.harga) {
        await catatAudit(tx, {
          penggunaId: pengguna.id,
          tabel: 'add_on',
          recordId: id,
          aksi: 'update',
          dataLama: { harga: lama.harga },
          dataBaru: { harga: nilai.harga },
        });
      }
      return { id };
    });
    segarkan();
    return hasil;
  },
});

export const setAktifAddOn = aksi({
  schema: setAktifAddOnSchema,
  peran: PEMILIK,
  jalankan: async ({ id, aktif }) => {
    const [baris] = await db
      .update(addOn)
      .set({ aktif })
      .where(eq(addOn.id, id))
      .returning({ id: addOn.id, aktif: addOn.aktif });
    if (!baris) throw new PesanError(PESAN_TIDAK_ADA);
    segarkan();
    return baris;
  },
});

/** PRD F-ADD-01 KP4: add-on yang pernah dipakai transaksi hanya bisa dinonaktifkan. */
export const hapusAddOn = aksi({
  schema: hapusAddOnSchema,
  peran: PEMILIK,
  jalankan: async ({ id }) => {
    const hasil = await db.transaction(async (tx) => {
      const [ada] = await tx
        .select({ id: addOn.id })
        .from(addOn)
        .where(eq(addOn.id, id))
        .for('update');
      if (!ada) throw new PesanError(PESAN_TIDAK_ADA);

      const [dipakaiJual] = await tx
        .select({ id: penjualanItemAddOn.id })
        .from(penjualanItemAddOn)
        .where(eq(penjualanItemAddOn.addOnId, id))
        .limit(1);
      const [dipakaiPo] = await tx
        .select({ id: preOrderItemAddOn.id })
        .from(preOrderItemAddOn)
        .where(eq(preOrderItemAddOn.addOnId, id))
        .limit(1);
      if (dipakaiJual || dipakaiPo) throw new PesanError(PESAN_DIPAKAI);

      await tx.delete(addOn).where(eq(addOn.id, id));
      return { id };
    });
    segarkan();
    return hasil;
  },
});
