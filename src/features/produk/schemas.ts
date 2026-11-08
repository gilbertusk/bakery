import { z } from 'zod';

import { angkaDesimal, angkaDesimalOpsional } from '@/lib/skema-angka';

const idOpsional = z
  .preprocess((nilai) => (nilai === '' ? null : nilai), z.uuid().nullish())
  .transform((nilai) => nilai ?? null);

const PERAN_BAHAN = ['topping', 'filling', 'kemasan', 'lainnya'] as const;

const komponenAdonanSchema = z.object({
  jenis: z.literal('adonan'),
  resepAdonanId: z.uuid(),
  gramPerPcs: angkaDesimal({ maksDesimal: 3, positif: true }),
});

const komponenBahanSchema = z.object({
  jenis: z.literal('bahan'),
  peran: z.enum(PERAN_BAHAN),
  bahanId: z.uuid(),
  takaran: angkaDesimal({ maksDesimal: 3, positif: true }),
  konversiSatuanId: idOpsional,
});

export const produkSchema = z
  .object({
    nama: z.string().trim().min(2).max(100),
    kategori: z.string().trim().min(1).max(50),
    cetakan: z
      .string()
      .trim()
      .max(100)
      .nullish()
      .transform((nilai) => nilai?.trim() || null),
    hargaJual: z.coerce.number().int().nonnegative(),
    targetMargin: angkaDesimalOpsional({ maksDesimal: 4 }).transform((nilai, ctx) => {
      if (nilai === null || nilai === '') return null;
      const d = parseFloat(nilai);
      if (d < 0 || d > 0.95) {
        ctx.addIssue({
          code: 'custom',
          path: ['targetMargin'],
          message: 'Harus antara 0 dan 0,95',
        });
        return z.NEVER;
      }
      return d;
    }),
    dijual: z.boolean().default(true),
    komponen: z
      .union([komponenAdonanSchema, komponenBahanSchema])
      .array()
      .min(1, 'Pilih minimal 1 komponen'),
  })
  .superRefine((data, ctx) => {
    const resepTerlihat = new Set<string>();
    const bahanPeranTerlihat = new Set<string>();
    data.komponen.forEach((komponen, index) => {
      const path = ['komponen', index] as const;
      const bahanId = (komponen as { bahanId?: string }).bahanId;
      const resepAdonanId = (komponen as { resepAdonanId?: string }).resepAdonanId;
      if (komponen.jenis === 'adonan') {
        if (bahanId) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'bahanId'],
            message: 'Komponen adonan harus pakai resep adonan',
          });
        }
        if (resepTerlihat.has(resepAdonanId!)) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'resepAdonanId'],
            message: 'Resep tidak boleh dipakai lebih dari sekali',
          });
        }
        resepTerlihat.add(resepAdonanId!);
      } else {
        if (resepAdonanId) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'resepAdonanId'],
            message: 'Komponen bahan tidak boleh pakai resep adonan',
          });
        }
        const kunci = `${bahanId}|${komponen.peran}`;
        if (bahanPeranTerlihat.has(kunci)) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'bahanId'],
            message: 'Bahan dengan peran ini sudah ada',
          });
        }
        bahanPeranTerlihat.add(kunci);
      }
    });
  });

export const simpanProdukSchema = produkSchema.and(z.object({ id: idOpsional }));
export const setAktifProdukSchema = z.object({ id: z.uuid(), aktif: z.boolean() });
export const setDijualProdukSchema = z.object({ id: z.uuid(), dijual: z.boolean() });

export type ProdukInput = z.input<typeof produkSchema>;
export type ProdukData = z.output<typeof produkSchema>;
export type SimpanProdukData = z.output<typeof simpanProdukSchema>;
