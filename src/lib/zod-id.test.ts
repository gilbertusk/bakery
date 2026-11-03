import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { pesanPertama } from './zod-id';

function pesan(schema: z.ZodType, input: unknown) {
  const hasil = schema.safeParse(input);
  if (hasil.success) throw new Error('Seharusnya gagal');
  return hasil.error.issues[0]?.message;
}

describe('pesan Zod bahasa Indonesia', () => {
  it('field kosong atau tidak dikirim', () => {
    expect(pesan(z.object({ nama: z.string() }), {})).toBe('Wajib diisi');
    expect(pesan(z.string().min(1), '')).toBe('Wajib diisi');
  });

  it('panjang teks', () => {
    expect(pesan(z.string().min(3), 'ab')).toBe('Minimal 3 karakter');
    expect(pesan(z.string().max(5), 'abcdef')).toBe('Maksimal 5 karakter');
  });

  it('batas angka', () => {
    expect(pesan(z.number().min(10), 5)).toBe('Minimal 10');
    expect(pesan(z.number().positive(), 0)).toBe('Harus lebih dari 0');
    expect(pesan(z.number().max(100), 101)).toBe('Maksimal 100');
    expect(pesan(z.number().lt(100), 100)).toBe('Harus kurang dari 100');
    expect(pesan(z.number().int(), 1.5)).toBe('Harus bilangan bulat');
  });

  it('tipe angka dan format', () => {
    expect(pesan(z.number(), 'abc')).toBe('Harus berupa angka');
    expect(pesan(z.number(), Number.NaN)).toBe('Harus berupa angka');
    expect(pesan(z.email(), 'bukan-email')).toBe('Format email tidak valid');
    expect(pesan(z.uuid(), 'x')).toBe('Format tidak valid');
  });

  it('daftar dan pilihan', () => {
    expect(pesan(z.array(z.string()).min(1), [])).toBe('Pilih minimal 1');
    expect(pesan(z.enum(['tunai', 'rekening']), 'kartu')).toBe('Pilihan tidak valid');
  });

  it('tipe lain memakai pesan locale Indonesia bawaan', () => {
    expect(pesan(z.boolean(), 'ya')).toMatch(/tidak valid/i);
  });

  it('pesan kustom pada schema tetap dipakai', () => {
    expect(pesan(z.string().min(1, 'Nama toko wajib diisi'), '')).toBe('Nama toko wajib diisi');
  });

  it('pesanPertama mengambil pesan issue pertama', () => {
    const hasil = z.object({ a: z.string() }).safeParse({});
    expect(hasil.success).toBe(false);
    if (!hasil.success) expect(pesanPertama(hasil.error)).toBe('Wajib diisi');
  });
});
