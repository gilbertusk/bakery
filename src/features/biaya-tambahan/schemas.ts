import { z } from 'zod';

import { D } from '@/lib/angka';
import { angkaDesimal } from '@/lib/skema-angka';

export const METODE_BIAYA = ['per_pcs', 'persen', 'per_batch'] as const;

const idOpsional = z
  .preprocess((nilai) => (nilai === '' ? null : nilai), z.uuid().nullish())
  .transform((nilai) => nilai ?? null);

// Kolom numeric(14,4): rupiah boleh 4 desimal; persen 0–100 dengan 2 desimal = 0–1 dengan 4 desimal.
const nilaiRupiah = angkaDesimal({ maksDesimal: 4 });
const nilaiPersen = angkaDesimal({ maksDesimal: 2 });

const dasarSchema = z.object({
  nama: z.string().trim().min(2).max(100),
  metode: z.enum(METODE_BIAYA),
  /** Rupiah untuk per_pcs/per_batch; persen 0–100 untuk persen. */
  nilai: z.custom<string | number>(() => true).optional(),
  produkId: idOpsional,
  aktif: z.boolean().default(true),
});

/** Persen diketik 0–100 lalu disimpan sebagai rasio 0–1. */
function denganNilai<S extends z.ZodType<z.output<typeof dasarSchema>>>(schema: S) {
  return schema.transform((data, ctx) => {
    const persen = data.metode === 'persen';
    const hasil = (persen ? nilaiPersen : nilaiRupiah).safeParse(data.nilai);
    if (!hasil.success) {
      for (const issue of hasil.error.issues) {
        ctx.addIssue({ code: 'custom', path: ['nilai'], message: issue.message });
      }
      return z.NEVER;
    }
    if (persen && D(hasil.data).gt(100)) {
      ctx.addIssue({ code: 'custom', path: ['nilai'], message: 'Persen maksimal 100' });
      return z.NEVER;
    }
    return { ...data, nilai: persen ? D(hasil.data).div(100).toFixed() : hasil.data };
  });
}

export const biayaTambahanSchema = denganNilai(dasarSchema);
export const ubahBiayaTambahanSchema = denganNilai(dasarSchema.extend({ id: z.uuid() }));
/** Id kosong = biaya baru. */
export const pratinjauDampakBiayaSchema = denganNilai(dasarSchema.extend({ id: idOpsional }));

export const setAktifBiayaTambahanSchema = z.object({ id: z.uuid(), aktif: z.boolean() });
export const hapusBiayaTambahanSchema = z.object({ id: z.uuid() });

export type BiayaTambahanInput = z.input<typeof biayaTambahanSchema>;
export type BiayaTambahanData = z.output<typeof biayaTambahanSchema>;
