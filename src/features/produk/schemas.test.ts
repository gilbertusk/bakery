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
        komponen: [
          { jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '50' },
        ],
      }),
    ).toEqual({
      nama: 'Brownies Cup',
      kategori: 'kue basah',
      cetakan: 'cup 50 ml',
      hargaJual: 15000,
      targetMargin: '0.3000',
      dijual: true,
      komponen: [
        { jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '50' },
      ],
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
    expect(
      pesan({ ...dasar, hargaJual: '-5000' }, 'hargaJual'),
    ).toBe('Harus lebih dari atau sama dengan 0');
    expect(
      pesan({ ...dasar, targetMargin: '1.1' }, 'targetMargin'),
    ).toBe('Harus antara 0 dan 0,95');
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
      komponen: [
        { jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '50' },
      ],
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
    expect(
      pesan(
        {
          ...dasar,
          komponen: [{ jenis: 'adonan', bahanId: BAHAN_1, takaran: '10' }],
        },
        'komponen.0.bahanId',
      ),
    ).toBe('Komponen adonan harus pakai resep adonan');
    expect(
      pesan(
        {
          ...dasar,
          komponen: [{ jenis: 'bahan', peran: 'topping', resepAdonanId: RESEP_ADONAN, takaran: '10' }],
        },
        'komponen.0.resepAdonanId',
      ),
    ).toBe('Komponen bahan tidak boleh pakai resep adonan');
  });

  it('takaran dan gram per pcs harus lebih dari 0', () => {
    const dasar = {
      nama: 'Brownies',
      kategori: 'kue',
      hargaJual: '15000',
      komponen: [],
    };
    expect(
      pesan(
        {
          ...dasar,
          komponen: [{ jenis: 'adonan', resepAdonanId: RESEP_ADONAN, gramPerPcs: '0' }],
        },
        'komponen.0.gramPerPcs',
      ),
    ).toBe('Harus lebih dari 0');
    expect(
      pesan(
        {
          ...dasar,
          komponen: [{ jenis: 'bahan', peran: 'topping', bahanId: BAHAN_1, takaran: '0' }],
        },
        'komponen.0.takaran',
      ),
    ).toBe('Harus lebih dari 0');
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
