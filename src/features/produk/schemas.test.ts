import { describe, expect, it } from 'vitest';

import '@/lib/zod-id';

import { produkSchema } from './schemas';

const RESEP_ADONAN = '11111111-1111-4111-8111-111111111111';
const BAHAN_1 = '22222222-2222-4222-8222-222222222222';

function pesan(input: unknown, path: string) {
  const hasil = produkSchema.safeParse(input);
  if (hasil.success) return null;
  return hasil.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('produkSchema', () => {
  it('merapikan produk minimal dengan satu komponen adonan', () => {
    expect(
      produkSchema.parse({
        nama: '  Brownies Cup ',
        kategori: 'kue basah',
        cetakan: '  cup 50 ml ',
        hargaJual: '15000',
        targetMargin: '0,30',
        dijual: true,
        komponen: [{ jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '50' }],
      }),
    ).toEqual({
      nama: 'Brownies Cup',
      kategori: 'kue basah',
      cetakan: 'cup 50 ml',
      hargaJual: 15000,
      targetMargin: 0.3,
      dijual: true,
      komponen: [{ jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '50' }],
    });
  });

  it('memvalidasi nama, kategori, dan harga jual', () => {
    const dasar = {
      nama: 'Brownies',
      kategori: 'kue',
      komponen: [{ jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '50' }],
    };
    expect(pesan({ ...dasar, nama: 'A' }, 'nama')).toBe('Minimal 2 karakter');
    expect(pesan({ ...dasar, kategori: '' }, 'kategori')).toBe('Wajib diisi');
    expect(pesan({ ...dasar, hargaJual: '-5000' }, 'hargaJual')).toBe('Minimal 0');
    const marginSalah = produkSchema.safeParse({ ...dasar, targetMargin: '1.1' });
    expect(marginSalah.success).toBe(false);
  });

  it('minimal satu komponen dan resep tidak boleh duplikat', () => {
    const dasar = {
      nama: 'Brownies',
      kategori: 'kue',
      hargaJual: '15000',
      komponen: [],
    };
    expect(pesan({ ...dasar, komponen: [] }, 'komponen')).toBe('Pilih minimal 1 komponen');
    expect(
      pesan(
        {
          ...dasar,
          komponen: [
            { jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '50' },
            { jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '30' },
          ],
        },
        'komponen.1.resepAdonanId',
      ),
    ).toBe('Resep tidak boleh dipakai lebih dari sekali');
  });

  it('bahan dengan peran sama tidak boleh duplikat', () => {
    const dasar = {
      nama: 'Brownies',
      kategori: 'kue',
      hargaJual: '15000',
      komponen: [{ jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '50' }],
    };
    expect(
      pesan(
        {
          ...dasar,
          komponen: [
            { jenis: 'bahan', peran: 'topping', bahanId: BAHAN_1, takaran: '10' },
            { jenis: 'bahan', peran: 'topping', bahanId: BAHAN_1, takaran: '20' },
          ],
        },
        'komponen.1.bahanId',
      ),
    ).toBe('Bahan dengan peran ini sudah ada');
  });

  it('komponen adonan tidak boleh bahan, dan sebaliknya', () => {
    const dasar = {
      nama: 'Brownies',
      kategori: 'kue',
      hargaJual: '15000',
      komponen: [],
    };
    const salahAdonan = produkSchema.safeParse({
      ...dasar,
      komponen: [{ jenis: 'adonan', bahanId: BAHAN_1, takaran: '10' }],
    });
    expect(salahAdonan.success).toBe(false);
    const salahBahan = produkSchema.safeParse({
      ...dasar,
      komponen: [{ jenis: 'bahan', peran: 'topping', resepAdonanId: RESEP_ADONAN, takaran: '10' }],
    });
    expect(salahBahan.success).toBe(false);
  });

  it('takaran dan gram per pcs harus lebih dari 0', () => {
    const dasar = {
      nama: 'Brownies',
      kategori: 'kue',
      hargaJual: '15000',
      komponen: [],
    };
    const nolGram = produkSchema.safeParse({
      ...dasar,
      komponen: [{ jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '0' }],
    });
    expect(nolGram.success).toBe(false);
    const nolTakaran = produkSchema.safeParse({
      ...dasar,
      komponen: [{ jenis: 'bahan', peran: 'topping', bahanId: BAHAN_1, takaran: '0' }],
    });
    expect(nolTakaran.success).toBe(false);
  });

  it('cetakan opsional dan targetMargin null diterima', () => {
    expect(
      produkSchema.parse({
        nama: 'Brownies',
        kategori: 'kue',
        hargaJual: '0',
        komponen: [{ jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '10' }],
      }),
    ).toMatchObject({ cetakan: null, targetMargin: null, dijual: true });
  });
});
