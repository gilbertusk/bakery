import { z } from 'zod';

import { angkaDesimal, angkaDesimalOpsional } from '@/lib/skema-angka';

const idOpsional = z
  .preprocess((nilai) => (nilai === '' ? null : nilai), z.uuid().nullish())
  .transform((nilai) => nilai ?? null);

const itemResepSchema = z.object({
  bahanId: z.uuid(),
  takaran: angkaDesimal({ maksDesimal: 3, positif: true }),
  konversiSatuanId: idOpsional,
});

const loyangBulatSchema = z.object({
  bentuk: z.literal('bulat'),
  diameterCm: angkaDesimal({ maksDesimal: 2, positif: true, maksDigit: 8 }),
});

const loyangKotakSchema = z.object({
  bentuk: z.literal('kotak'),
  panjangCm: angkaDesimal({ maksDesimal: 2, positif: true, maksDigit: 8 }),
  lebarCm: angkaDesimal({ maksDesimal: 2, positif: true, maksDigit: 8 }),
});

const loyangSchema = z
  .discriminatedUnion('bentuk', [loyangBulatSchema, loyangKotakSchema])
  .nullish()
  .transform((nilai) => nilai ?? null);

export const resepSchema = z
  .object({
    nama: z.string().trim().min(2).max(100),
    modeHasil: z.enum(['otomatis', 'timbang']),
    hasilGram: angkaDesimalOpsional({ maksDesimal: 3, positif: true }),
    caraBuat: z
      .string()
      .trim()
      .max(5000)
      .nullish()
      .transform((nilai) => nilai?.trim() || null),
    loyang: loyangSchema,
    items: z.array(itemResepSchema).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.modeHasil === 'timbang' && data.hasilGram === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['hasilGram'],
        message: 'Hasil gram wajib diisi untuk mode timbang',
      });
    }

    const terlihat = new Set<string>();
    data.items.forEach((item, index) => {
      if (terlihat.has(item.bahanId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'bahanId'],
          message: 'Bahan tidak boleh duplikat',
        });
      }
      terlihat.add(item.bahanId);
    });
  });

export const simpanResepSchema = resepSchema.and(z.object({ id: idOpsional }));
export const setAktifResepSchema = z.object({ id: z.uuid(), aktif: z.boolean() });
export const duplikatResepSchema = z.object({
  resepId: z.uuid(),
  namaBaru: z.string().trim().min(2).max(100),
});
export const simpanLoyangResepSchema = z.object({
  resepId: z.uuid(),
  loyang: z.discriminatedUnion('bentuk', [loyangBulatSchema, loyangKotakSchema]),
});

export type ResepInput = z.input<typeof resepSchema>;
export type ResepData = z.output<typeof resepSchema>;
export type SimpanResepData = z.output<typeof simpanResepSchema>;
