import { describe, expect, it } from 'vitest';

import '@/lib/zod-id';

import {
  biayaTambahanSchema,
  hapusBiayaTambahanSchema,
  pratinjauDampakBiayaSchema,
  setAktifBiayaTambahanSchema,
  ubahBiayaTambahanSchema,
} from './schemas';

const ID = '11111111-1111-4111-8111-111111111111';

function pesanNilai(input: unknown) {
  const hasil = biayaTambahanSchema.safeParse(input);
  expect(hasil.success).toBe(false);
  return hasil.error?.issues.find((issue) => issue.path.join('.') === 'nilai')?.message;
}

describe('biayaTambahanSchema', () => {
  it('persen diketik 0–100 lalu disimpan 0–1', () => {
    expect(
      biayaTambahanSchema.parse({ nama: '  Gas ', metode: 'persen', nilai: '10', produkId: '' }),
    ).toEqual({ nama: 'Gas', metode: 'persen', nilai: '0.1', produkId: null, aktif: true });
    expect(biayaTambahanSchema.parse({ nama: 'Gas', metode: 'persen', nilai: '12,5' }).nilai).toBe(
      '0.125',
    );
    expect(biayaTambahanSchema.parse({ nama: 'Gas', metode: 'persen', nilai: 100 }).nilai).toBe(
      '1',
    );
    expect(biayaTambahanSchema.parse({ nama: 'Gas', metode: 'persen', nilai: '0' }).nilai).toBe(
      '0',
    );
  });

  it('rupiah per pcs dan per batch disimpan apa adanya', () => {
    expect(
      biayaTambahanSchema.parse({
        nama: 'Listrik',
        metode: 'per_pcs',
        nilai: '1.500',
        produkId: ID,
        aktif: false,
      }),
    ).toEqual({ nama: 'Listrik', metode: 'per_pcs', nilai: '1500', produkId: ID, aktif: false });
    expect(
      biayaTambahanSchema.parse({ nama: 'Oven', metode: 'per_batch', nilai: '5000,5' }).nilai,
    ).toBe('5000.5');
  });

  it.each([
    ['persen di atas 100', { metode: 'persen', nilai: '100,01' }, 'Persen maksimal 100'],
    [
      'persen 3 desimal',
      { metode: 'persen', nilai: '12,345' },
      'Maksimal 2 angka di belakang koma',
    ],
    ['rupiah negatif', { metode: 'per_pcs', nilai: '-1' }, 'Tidak boleh negatif'],
    ['rupiah bukan angka', { metode: 'per_batch', nilai: 'abc' }, 'Harus berupa angka'],
    ['rupiah terlalu besar', { metode: 'per_batch', nilai: '10000000000' }, 'Angka terlalu besar'],
    ['nilai kosong', { metode: 'per_pcs', nilai: ' ' }, 'Wajib diisi'],
  ])('menolak %s', (_, input, pesan) => {
    expect(pesanNilai({ nama: 'Gas', ...input })).toBe(pesan);
  });

  it('menolak nama pendek dan metode tidak dikenal', () => {
    expect(
      biayaTambahanSchema.safeParse({ nama: 'G', metode: 'per_pcs', nilai: '1' }).success,
    ).toBe(false);
    expect(
      biayaTambahanSchema.safeParse({ nama: 'Gas', metode: 'bulanan', nilai: '1' }).success,
    ).toBe(false);
  });
});

describe('schema turunan', () => {
  it('ubah wajib id dan tetap mengubah persen', () => {
    expect(
      ubahBiayaTambahanSchema.parse({ id: ID, nama: 'Gas', metode: 'persen', nilai: '5' }),
    ).toMatchObject({ id: ID, nilai: '0.05' });
    expect(
      ubahBiayaTambahanSchema.safeParse({ nama: 'Gas', metode: 'persen', nilai: '5' }).success,
    ).toBe(false);
  });

  it('pratinjau: id opsional untuk biaya baru', () => {
    expect(
      pratinjauDampakBiayaSchema.parse({ id: '', nama: 'Gas', metode: 'per_pcs', nilai: '150' }),
    ).toMatchObject({ id: null, nilai: '150' });
    expect(
      pratinjauDampakBiayaSchema.parse({ id: ID, nama: 'Gas', metode: 'persen', nilai: '20' }),
    ).toMatchObject({ id: ID, nilai: '0.2' });
  });

  it('setAktif dan hapus', () => {
    expect(setAktifBiayaTambahanSchema.parse({ id: ID, aktif: false })).toEqual({
      id: ID,
      aktif: false,
    });
    expect(hapusBiayaTambahanSchema.parse({ id: ID })).toEqual({ id: ID });
    expect(hapusBiayaTambahanSchema.safeParse({ id: 'x' }).success).toBe(false);
  });
});
