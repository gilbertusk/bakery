import { z } from 'zod';

import { angkaDesimal } from '@/lib/skema-angka';

const fieldKonversi = {
  namaSatuan: z.string().trim().min(1).max(50),
  nilaiDasar: angkaDesimal({ maksDesimal: 4, positif: true, maksDigit: 12 }),
};

export const tambahKonversiSchema = z.object({ bahanId: z.uuid(), ...fieldKonversi });
export const ubahKonversiSchema = z.object({ id: z.uuid(), ...fieldKonversi });
export const hapusKonversiSchema = z.object({ id: z.uuid() });
