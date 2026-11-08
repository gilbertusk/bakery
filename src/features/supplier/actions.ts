'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db/client';
import { supplier } from '@/db/schema';
import { PesanError, aksi } from '@/lib/aksi';

import { setAktifSupplierSchema, supplierSchema, ubahSupplierSchema } from './schemas';

const PEMILIK = ['pemilik' as const];

function segarkan() {
  revalidatePath('/supplier');
  revalidatePath('/bahan');
}

export const buatSupplier = aksi({
  schema: supplierSchema,
  peran: PEMILIK,
  jalankan: async (input) => {
    const [baris] = await db.insert(supplier).values(input).returning({ id: supplier.id });
    if (!baris) throw new Error('Gagal menyimpan supplier');
    segarkan();
    return baris;
  },
});

export const ubahSupplier = aksi({
  schema: ubahSupplierSchema,
  peran: PEMILIK,
  jalankan: async ({ id, ...data }) => {
    const [baris] = await db
      .update(supplier)
      .set(data)
      .where(eq(supplier.id, id))
      .returning({ id: supplier.id });
    if (!baris) throw new PesanError('Supplier tidak ditemukan');
    segarkan();
    return baris;
  },
});

export const setAktifSupplier = aksi({
  schema: setAktifSupplierSchema,
  peran: PEMILIK,
  jalankan: async ({ id, aktif }) => {
    const [baris] = await db
      .update(supplier)
      .set({ aktif })
      .where(eq(supplier.id, id))
      .returning({ id: supplier.id, aktif: supplier.aktif });
    if (!baris) throw new PesanError('Supplier tidak ditemukan');
    segarkan();
    return baris;
  },
});
