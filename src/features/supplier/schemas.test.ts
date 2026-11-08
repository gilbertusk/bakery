import { describe, expect, it } from 'vitest';

import '@/lib/zod-id';

import { setAktifSupplierSchema, supplierSchema, ubahSupplierSchema } from './schemas';

const ID = '11111111-1111-4111-8111-111111111111';

describe('supplierSchema', () => {
  it('merapikan input dan menormalisasi nomor HP', () => {
    expect(
      supplierSchema.parse({ nama: '  Toko Bahan Jaya ', kontak: '0812-3456-7890', catatan: ' ' }),
    ).toEqual({ nama: 'Toko Bahan Jaya', kontak: '6281234567890', catatan: null });
  });

  it('kontak dan catatan opsional', () => {
    expect(supplierSchema.parse({ nama: 'Jaya' })).toEqual({
      nama: 'Jaya',
      kontak: null,
      catatan: null,
    });
    expect(supplierSchema.parse({ nama: 'Jaya', kontak: null, catatan: 'Antar Senin' })).toEqual({
      nama: 'Jaya',
      kontak: null,
      catatan: 'Antar Senin',
    });
  });

  it.each([
    ['nama kosong', { nama: ' ' }, 'nama', 'Minimal 2 karakter'],
    ['nama 1 huruf', { nama: 'A' }, 'nama', 'Minimal 2 karakter'],
    ['nama > 100', { nama: 'a'.repeat(101) }, 'nama', 'Maksimal 100 karakter'],
    ['nomor HP salah', { nama: 'Jaya', kontak: '0812' }, 'kontak', 'Nomor HP tidak valid'],
    ['kontak > 100', { nama: 'Jaya', kontak: 'x'.repeat(101) }, 'kontak', 'Maksimal 100 karakter'],
    [
      'catatan > 500',
      { nama: 'Jaya', catatan: 'x'.repeat(501) },
      'catatan',
      'Maksimal 500 karakter',
    ],
  ])('menolak %s', (_kasus, input, field, pesan) => {
    const hasil = supplierSchema.safeParse(input);
    expect(hasil.success).toBe(false);
    expect(hasil.error?.issues).toContainEqual(
      expect.objectContaining({ path: [field], message: pesan }),
    );
  });
});

describe('ubahSupplierSchema & setAktifSupplierSchema', () => {
  it('ubah butuh id uuid', () => {
    expect(ubahSupplierSchema.parse({ id: ID, nama: 'Jaya' })).toMatchObject({ id: ID });
    expect(ubahSupplierSchema.safeParse({ id: 'x', nama: 'Jaya' }).success).toBe(false);
  });

  it('setAktif butuh id dan boolean', () => {
    expect(setAktifSupplierSchema.parse({ id: ID, aktif: false })).toEqual({
      id: ID,
      aktif: false,
    });
    expect(setAktifSupplierSchema.safeParse({ id: ID, aktif: 'tidak' }).success).toBe(false);
  });
});
