import { z } from 'zod';

import { angkaDesimal } from '@/lib/skema-angka';

const idOpsional = z
  .preprocess((nilai) => (nilai === '' ? null : nilai), z.uuid().nullish())
  .transform((nilai) => nilai ?? null);

const angkaHarga = angkaDesimal({ maksDesimal: 0, maksDigit: 9 });

/** Rupiah integer ≥ 0. Menerima number atau ketikan "2.000"; pecahan seperti "1500,5" ditolak. */
const hargaRupiah = z
  .custom<string | number>(() => true)
  .transform((nilai, ctx) => {
    const hasil = angkaHarga.safeParse(nilai);
    if (!hasil.success) {
      const pesan = hasil.error.issues[0]?.message ?? 'Harus berupa angka';
      ctx.addIssue({
        code: 'custom',
        message: pesan.startsWith('Maksimal') ? 'Harga harus rupiah bulat' : pesan,
      });
      return z.NEVER;
    }
    return Number(hasil.data);
  });

export const addOnSchema = z.object({
  nama: z.string().trim().min(2).max(100),
  bahanId: z.uuid(),
  takaran: angkaDesimal({ maksDesimal: 3, positif: true }),
  konversiSatuanId: idOpsional,
  harga: hargaRupiah,
});

export const ubahAddOnSchema = addOnSchema.extend({ id: z.uuid() });
export const setAktifAddOnSchema = z.object({ id: z.uuid(), aktif: z.boolean() });
export const hapusAddOnSchema = z.object({ id: z.uuid() });

export type AddOnInput = z.input<typeof addOnSchema>;
export type AddOnData = z.output<typeof addOnSchema>;
