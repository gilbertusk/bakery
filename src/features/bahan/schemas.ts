import { z } from 'zod';

import { SATUAN_KEMASAN, satuanKemasanUntuk } from '@/lib/hpp/konversi';
import { angkaDesimal, angkaDesimalOpsional } from '@/lib/skema-angka';

/** Daftar saran kategori di UI (ERD `bahan.kategori`); kategori lain tetap boleh. */
export const KATEGORI_BAHAN = [
  'tepung',
  'gula',
  'dairy',
  'lemak',
  'telur',
  'coklat',
  'perisa',
  'topping',
  'kemasan',
  'lainnya',
] as const;

export const SATUAN_DASAR = ['g', 'ml', 'pcs'] as const;

export const PESAN_KEMASAN_TIDAK_COCOK = 'Satuan kemasan tidak cocok dengan satuan dasar';

/** Input harga dari kemasan pembelian: "1 kg Rp15.000". */
export const kemasanSchema = z.object({
  jumlahKemasan: angkaDesimal({ maksDesimal: 3, positif: true }),
  satuanKemasan: z.enum(SATUAN_KEMASAN),
  totalHarga: z.number().int().min(0).max(999_999_999_999),
});

const fieldBahan = {
  nama: z.string().trim().min(2).max(100),
  kategori: z.string().trim().toLowerCase().min(1).max(50),
  satuanDasar: z.enum(SATUAN_DASAR),
  stokMinimal: angkaDesimalOpsional({ maksDesimal: 3 }).transform((nilai) => nilai ?? '0'),
  supplierUtamaId: z
    .preprocess((nilai) => (nilai === '' ? null : nilai), z.uuid().nullish())
    .transform((nilai) => nilai ?? null),
};

export const buatBahanSchema = z
  .object({
    ...fieldBahan,
    hargaAwal: kemasanSchema.nullish().transform((nilai) => nilai ?? null),
    stokAwal: angkaDesimalOpsional({ maksDesimal: 3 }),
  })
  .superRefine((data, ctx) => {
    if (
      data.hargaAwal &&
      !satuanKemasanUntuk(data.satuanDasar).includes(data.hargaAwal.satuanKemasan)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['hargaAwal', 'satuanKemasan'],
        message: PESAN_KEMASAN_TIDAK_COCOK,
      });
    }
  });

export const ubahBahanSchema = z.object({ id: z.uuid(), ...fieldBahan });

export const ubahHargaManualSchema = kemasanSchema.extend({ id: z.uuid() });

export const setAktifBahanSchema = z.object({ id: z.uuid(), aktif: z.boolean() });

export type KemasanInput = z.input<typeof kemasanSchema>;
export type BuatBahanInput = z.input<typeof buatBahanSchema>;
export type BuatBahanData = z.output<typeof buatBahanSchema>;
export type UbahBahanData = z.output<typeof ubahBahanSchema>;
