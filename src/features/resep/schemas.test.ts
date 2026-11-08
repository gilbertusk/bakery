import { describe, expect, it } from 'vitest';

import '@/lib/zod-id';

import { duplikatResepSchema, resepSchema, simpanLoyangResepSchema } from './schemas';

const BAHAN_1 = '11111111-1111-4111-8111-111111111111';
const BAHAN_2 = '22222222-2222-4222-8222-222222222222';

function pesan(input: unknown, path: string) {
  const hasil = resepSchema.safeParse(input);
  if (hasil.success) return null;
  return hasil.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('resepSchema', () => {
  it('merapikan resep otomatis minimal', () => {
    expect(
      resepSchema.parse({
        nama: '  Brownies Panggang ',
        modeHasil: 'otomatis',
        caraBuat: '  ',
        items: [{ bahanId: BAHAN_1, takaran: '2,5', konversiSatuanId: '' }],
      }),
    ).toEqual({
      nama: 'Brownies Panggang',
      modeHasil: 'otomatis',
      hasilGram: null,
      caraBuat: null,
      loyang: null,
      items: [{ bahanId: BAHAN_1, takaran: '2.5', konversiSatuanId: null }],
    });
  });

  it('mode timbang mewajibkan hasil gram positif', () => {
    const dasar = {
      nama: 'Brownies',
      modeHasil: 'timbang',
      items: [{ bahanId: BAHAN_1, takaran: '1' }],
    };
    expect(pesan(dasar, 'hasilGram')).toBe('Hasil gram wajib diisi untuk mode timbang');
    expect(pesan({ ...dasar, hasilGram: '0' }, 'hasilGram')).toBe('Harus lebih dari 0');
    expect(resepSchema.parse({ ...dasar, hasilGram: '1.250,5' }).hasilGram).toBe('1250.5');
  });

  it('minimal satu item dan bahan tidak boleh duplikat', () => {
    const dasar = { nama: 'Brownies', modeHasil: 'otomatis' };
    expect(pesan({ ...dasar, items: [] }, 'items')).toBe('Pilih minimal 1');
    expect(
      pesan(
        {
          ...dasar,
          items: [
            { bahanId: BAHAN_1, takaran: '1' },
            { bahanId: BAHAN_1, takaran: '2' },
          ],
        },
        'items.1.bahanId',
      ),
    ).toBe('Bahan tidak boleh duplikat');
  });

  it('memvalidasi takaran dan cara buat', () => {
    const dasar = { nama: 'Brownies', modeHasil: 'otomatis' };
    expect(
      pesan({ ...dasar, items: [{ bahanId: BAHAN_1, takaran: '0' }] }, 'items.0.takaran'),
    ).toBe('Harus lebih dari 0');
    expect(
      pesan(
        { ...dasar, caraBuat: 'x'.repeat(5001), items: [{ bahanId: BAHAN_1, takaran: '1' }] },
        'caraBuat',
      ),
    ).toBe('Maksimal 5000 karakter');
  });

  it('loyang bulat perlu diameter; loyang kotak perlu panjang dan lebar', () => {
    const dasar = {
      nama: 'Brownies',
      modeHasil: 'otomatis',
      items: [{ bahanId: BAHAN_1, takaran: '1' }],
    };
    expect(
      pesan({ ...dasar, loyang: { bentuk: 'bulat', diameterCm: '' } }, 'loyang.diameterCm'),
    ).toBe('Wajib diisi');
    expect(
      pesan({ ...dasar, loyang: { bentuk: 'kotak', panjangCm: '20' } }, 'loyang.lebarCm'),
    ).toBe('Wajib diisi');
    expect(
      resepSchema.parse({
        ...dasar,
        loyang: { bentuk: 'kotak', panjangCm: '20', lebarCm: '20,5' },
      }).loyang,
    ).toEqual({ bentuk: 'kotak', panjangCm: '20', lebarCm: '20.5' });
  });

  it('bahan berbeda diterima', () => {
    expect(
      resepSchema.safeParse({
        nama: 'Brownies',
        modeHasil: 'otomatis',
        items: [
          { bahanId: BAHAN_1, takaran: '1' },
          { bahanId: BAHAN_2, takaran: '2' },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('schema duplikat dan loyang resep', () => {
  it('merapikan nama baru dan memvalidasi ID resep', () => {
    expect(duplikatResepSchema.parse({ resepId: BAHAN_1, namaBaru: '  Brownies Keju  ' })).toEqual({
      resepId: BAHAN_1,
      namaBaru: 'Brownies Keju',
    });
    expect(
      duplikatResepSchema.safeParse({ resepId: 'bukan-id', namaBaru: 'Brownies Keju' }).success,
    ).toBe(false);
    expect(duplikatResepSchema.safeParse({ resepId: BAHAN_1, namaBaru: ' ' }).success).toBe(false);
  });

  it('menerima loyang bulat atau kotak yang lengkap', () => {
    expect(
      simpanLoyangResepSchema.parse({
        resepId: BAHAN_1,
        loyang: { bentuk: 'bulat', diameterCm: '24,5' },
      }),
    ).toEqual({
      resepId: BAHAN_1,
      loyang: { bentuk: 'bulat', diameterCm: '24.5' },
    });
    expect(
      simpanLoyangResepSchema.safeParse({
        resepId: BAHAN_1,
        loyang: { bentuk: 'kotak', panjangCm: '20', lebarCm: '' },
      }).success,
    ).toBe(false);
  });
});
