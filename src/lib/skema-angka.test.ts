import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import '@/lib/zod-id';

import { angkaDesimal, angkaDesimalOpsional } from './skema-angka';

function pesan(schema: z.ZodType, input: unknown) {
  const hasil = schema.safeParse(input);
  return hasil.success ? null : hasil.error.issues[0]?.message;
}

describe('angkaDesimal', () => {
  const stok = angkaDesimal({ maksDesimal: 3 });
  const isi = angkaDesimal({ maksDesimal: 3, positif: true });

  it.each([
    ['1000', '1000'],
    [' 2,5 ', '2.5'],
    ['0', '0'],
    ['-0', '0'],
    ['007', '7'],
    ['0,125', '0.125'],
    // Titik dengan kelompok 3 digit = pemisah ribuan (kebiasaan Indonesia).
    ['1.250', '1250'],
    ['1.000.000', '1000000'],
    ['1.000,5', '1000.5'],
    // Titik tunggal yang bukan kelompok ribuan = desimal.
    ['2.5', '2.5'],
    ['0.125', '0.125'],
    ['12.75', '12.75'],
  ])('%j → %j', (input, hasil) => {
    expect(stok.parse(input)).toBe(hasil);
  });

  it.each([
    ['', 'Wajib diisi'],
    ['  ', 'Wajib diisi'],
    [undefined, 'Wajib diisi'],
    ['abc', 'Harus berupa angka'],
    ['1,2,3', 'Harus berupa angka'],
    ['1.00.0', 'Harus berupa angka'],
    ['1.00,5', 'Harus berupa angka'],
    ['1e3', 'Harus berupa angka'],
    ['-1', 'Tidak boleh negatif'],
    ['1,2345', 'Maksimal 3 angka di belakang koma'],
    ['100000000000', 'Angka terlalu besar'],
  ])('menolak %j: %s', (input, hasil) => {
    expect(pesan(stok, input)).toBe(hasil);
  });

  it('menerima number dan menolak NaN/Infinity', () => {
    expect(stok.parse(2.5)).toBe('2.5');
    expect(stok.parse(1000)).toBe('1000');
    expect(pesan(stok, Number.NaN)).toBe('Harus berupa angka');
    expect(pesan(stok, Number.POSITIVE_INFINITY)).toBe('Harus berupa angka');
  });

  it('positif menolak nol dan negatif', () => {
    expect(isi.parse('0,5')).toBe('0.5');
    expect(pesan(isi, '0')).toBe('Harus lebih dari 0');
    expect(pesan(isi, '0,000')).toBe('Harus lebih dari 0');
    expect(pesan(isi, '-2')).toBe('Harus lebih dari 0');
  });
});

describe('angkaDesimalOpsional', () => {
  const schema = angkaDesimalOpsional({ maksDesimal: 3 });

  it('kosong, null, dan undefined menjadi null', () => {
    expect(schema.parse('')).toBeNull();
    expect(schema.parse('  ')).toBeNull();
    expect(schema.parse(null)).toBeNull();
    expect(schema.parse(undefined)).toBeNull();
  });

  it('isi tetap divalidasi', () => {
    expect(schema.parse('12,5')).toBe('12.5');
    expect(pesan(schema, '-1')).toBe('Tidak boleh negatif');
    expect(pesan(schema, 'x')).toBe('Harus berupa angka');
  });
});
