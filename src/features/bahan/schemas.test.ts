import { describe, expect, it } from 'vitest';

import '@/lib/zod-id';

import {
  KATEGORI_BAHAN,
  buatBahanSchema,
  setAktifBahanSchema,
  ubahBahanSchema,
  ubahHargaManualSchema,
} from './schemas';

const ID = '11111111-1111-4111-8111-111111111111';

const MINIMAL = { nama: 'Tepung Terigu', kategori: 'tepung', satuanDasar: 'g' };

function errorDi(hasil: { success: boolean; error?: { issues: unknown[] } }) {
  return hasil.error?.issues ?? [];
}

describe('KATEGORI_BAHAN', () => {
  it('daftar saran sesuai ERD', () => {
    expect(KATEGORI_BAHAN).toEqual([
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
    ]);
  });
});

describe('buatBahanSchema', () => {
  it('field minimal: opsional menjadi default', () => {
    expect(buatBahanSchema.parse(MINIMAL)).toEqual({
      nama: 'Tepung Terigu',
      kategori: 'tepung',
      satuanDasar: 'g',
      stokMinimal: '0',
      supplierUtamaId: null,
      hargaAwal: null,
      stokAwal: null,
    });
  });

  it('merapikan input lengkap', () => {
    expect(
      buatBahanSchema.parse({
        nama: '  Gula Pasir ',
        kategori: ' Gula ',
        satuanDasar: 'g',
        stokMinimal: '1.000',
        supplierUtamaId: ID,
        hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 18000 },
        stokAwal: '2,5',
      }),
    ).toEqual({
      nama: 'Gula Pasir',
      kategori: 'gula',
      satuanDasar: 'g',
      stokMinimal: '1000',
      supplierUtamaId: ID,
      hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 18000 },
      stokAwal: '2.5',
    });
  });

  it('kategori bebas di luar daftar saran diterima', () => {
    expect(buatBahanSchema.parse({ ...MINIMAL, kategori: 'Kacang' }).kategori).toBe('kacang');
  });

  it('supplier kosong dari dropdown menjadi null', () => {
    expect(buatBahanSchema.parse({ ...MINIMAL, supplierUtamaId: '' }).supplierUtamaId).toBeNull();
  });

  it.each([
    ['nama 1 huruf', { nama: 'A' }, ['nama'], 'Minimal 2 karakter'],
    ['nama > 100', { nama: 'a'.repeat(101) }, ['nama'], 'Maksimal 100 karakter'],
    ['kategori kosong', { kategori: '  ' }, ['kategori'], 'Wajib diisi'],
    ['kategori > 50', { kategori: 'k'.repeat(51) }, ['kategori'], 'Maksimal 50 karakter'],
    ['satuan tidak dikenal', { satuanDasar: 'kg' }, ['satuanDasar'], 'Pilihan tidak valid'],
    ['stok minimal negatif', { stokMinimal: '-1' }, ['stokMinimal'], 'Tidak boleh negatif'],
    ['stok awal negatif', { stokAwal: '-5' }, ['stokAwal'], 'Tidak boleh negatif'],
    ['supplier bukan uuid', { supplierUtamaId: 'abc' }, ['supplierUtamaId'], 'Format tidak valid'],
    [
      'jumlah kemasan 0',
      { hargaAwal: { jumlahKemasan: '0', satuanKemasan: 'kg', totalHarga: 1000 } },
      ['hargaAwal', 'jumlahKemasan'],
      'Harus lebih dari 0',
    ],
    [
      'total harga negatif',
      { hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: -1 } },
      ['hargaAwal', 'totalHarga'],
      'Minimal 0',
    ],
    [
      'total harga pecahan',
      { hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 1.5 } },
      ['hargaAwal', 'totalHarga'],
      'Harus bilangan bulat',
    ],
    [
      'satuan kemasan tidak dikenal',
      { hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'ons', totalHarga: 1000 } },
      ['hargaAwal', 'satuanKemasan'],
      'Pilihan tidak valid',
    ],
    [
      'satuan kemasan tidak cocok dengan satuan dasar',
      { hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'l', totalHarga: 1000 } },
      ['hargaAwal', 'satuanKemasan'],
      'Satuan kemasan tidak cocok dengan satuan dasar',
    ],
  ])('menolak %s', (_kasus, ubah, path, pesan) => {
    const hasil = buatBahanSchema.safeParse({ ...MINIMAL, ...ubah });
    expect(hasil.success).toBe(false);
    expect(errorDi(hasil)).toContainEqual(expect.objectContaining({ path, message: pesan }));
  });

  it('nama dan kategori wajib', () => {
    const hasil = buatBahanSchema.safeParse({ satuanDasar: 'g' });
    expect(errorDi(hasil)).toContainEqual(
      expect.objectContaining({ path: ['nama'], message: 'Wajib diisi' }),
    );
    expect(errorDi(hasil)).toContainEqual(
      expect.objectContaining({ path: ['kategori'], message: 'Wajib diisi' }),
    );
  });
});

describe('ubahBahanSchema', () => {
  it('butuh id, tanpa harga & stok awal', () => {
    expect(ubahBahanSchema.parse({ ...MINIMAL, id: ID, stokAwal: '5' })).toEqual({
      id: ID,
      nama: 'Tepung Terigu',
      kategori: 'tepung',
      satuanDasar: 'g',
      stokMinimal: '0',
      supplierUtamaId: null,
    });
    expect(ubahBahanSchema.safeParse({ ...MINIMAL, id: 'x' }).success).toBe(false);
  });
});

describe('ubahHargaManualSchema & setAktifBahanSchema', () => {
  it('ubah harga: id + input kemasan', () => {
    expect(
      ubahHargaManualSchema.parse({
        id: ID,
        jumlahKemasan: '2,5',
        satuanKemasan: 'kg',
        totalHarga: 40000,
      }),
    ).toEqual({ id: ID, jumlahKemasan: '2.5', satuanKemasan: 'kg', totalHarga: 40000 });
    expect(
      ubahHargaManualSchema.safeParse({ id: ID, jumlahKemasan: '1', satuanKemasan: 'kg' }).success,
    ).toBe(false);
  });

  it('setAktif butuh id dan boolean', () => {
    expect(setAktifBahanSchema.parse({ id: ID, aktif: false })).toEqual({ id: ID, aktif: false });
    expect(setAktifBahanSchema.safeParse({ id: ID, aktif: 'ya' }).success).toBe(false);
  });
});
