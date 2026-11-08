import { z } from 'zod';

import { normalisasiKontak } from '@/lib/telepon';

/** String opsional: dirapikan, kosong → null. */
function teksOpsional(maks: number) {
  return z
    .string()
    .trim()
    .max(maks)
    .nullish()
    .transform((nilai) => (nilai ? nilai : null));
}

const kontakSchema = z
  .string()
  .trim()
  .max(100)
  .nullish()
  .transform((nilai, ctx) => {
    const hasil = normalisasiKontak(nilai ?? '');
    if (!hasil.ok) {
      ctx.addIssue({ code: 'custom', message: hasil.error });
      return z.NEVER;
    }
    return hasil.nilai;
  });

export const supplierSchema = z.object({
  nama: z.string().trim().min(2).max(100),
  kontak: kontakSchema,
  catatan: teksOpsional(500),
});

export const ubahSupplierSchema = supplierSchema.extend({ id: z.uuid() });

export const setAktifSupplierSchema = z.object({ id: z.uuid(), aktif: z.boolean() });

export type SupplierInput = z.input<typeof supplierSchema>;
export type SupplierData = z.output<typeof supplierSchema>;
