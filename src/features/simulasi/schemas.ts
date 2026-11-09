import { z } from 'zod';

import { D } from '@/lib/angka';

const POLA_PERSEN = /^[+-]?\d+(?:[.,]\d{1,2})?$/;

const persenSchema = z
  .custom<string | number>(() => true)
  .transform((nilai, ctx) => {
    const teks =
      typeof nilai === 'number' ? String(nilai) : typeof nilai === 'string' ? nilai.trim() : '';
    if (!POLA_PERSEN.test(teks)) {
      ctx.addIssue({ code: 'custom', message: 'Persen harus berupa angka, maksimal 2 desimal' });
      return z.NEVER;
    }
    const persen = D(teks.replace(',', '.'));
    if (persen.lt(-50) || persen.gt(200)) {
      ctx.addIssue({ code: 'custom', message: 'Persen harus -50 sampai 200' });
      return z.NEVER;
    }
    return persen.isZero() ? '0' : persen.toFixed();
  });

export const simulasiHargaSchema = z
  .object({
    perubahan: z
      .array(z.object({ bahanId: z.uuid(), persen: persenSchema }))
      .min(1, 'Tambahkan minimal satu perubahan harga')
      .max(20, 'Maksimal 20 bahan per simulasi'),
  })
  .superRefine(({ perubahan }, ctx) => {
    const terlihat = new Set<string>();
    perubahan.forEach((item, index) => {
      if (terlihat.has(item.bahanId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['perubahan', index, 'bahanId'],
          message: 'Bahan yang sama hanya boleh dipilih sekali',
        });
      }
      terlihat.add(item.bahanId);
    });
  });

export type SimulasiHargaInput = z.input<typeof simulasiHargaSchema>;
export type SimulasiHargaData = z.output<typeof simulasiHargaSchema>;
