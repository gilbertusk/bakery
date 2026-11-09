import { describe, expect, it } from 'vitest';

import { simulasiHargaSchema } from './schemas';

const COKLAT = '11111111-1111-4111-8111-111111111111';
const KEJU = '22222222-2222-4222-8222-222222222222';

describe('simulasiHargaSchema', () => {
  it.each([
    ['-50', '-50'],
    ['+10', '10'],
    ['10,5', '10.5'],
    [200, '200'],
  ])('menerima persen %s dan menormalkan menjadi %s', (persen, normal) => {
    const hasil = simulasiHargaSchema.parse({ perubahan: [{ bahanId: COKLAT, persen }] });
    expect(hasil).toEqual({ perubahan: [{ bahanId: COKLAT, persen: normal }] });
  });

  it.each(['-50.01', 200.01, 'abc', '', '10,555'])(
    'menolak persen di luar aturan: %s',
    (persen) => {
      const hasil = simulasiHargaSchema.safeParse({ perubahan: [{ bahanId: COKLAT, persen }] });
      expect(hasil.success).toBe(false);
    },
  );

  it('wajib memiliki minimal satu baris dan maksimal 20 baris', () => {
    expect(simulasiHargaSchema.safeParse({ perubahan: [] }).success).toBe(false);
    expect(
      simulasiHargaSchema.safeParse({
        perubahan: Array.from({ length: 21 }, (_, i) => ({
          bahanId: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
          persen: 10,
        })),
      }).success,
    ).toBe(false);
  });

  it('menolak bahan yang sama dua kali dan menunjuk baris kedua', () => {
    const hasil = simulasiHargaSchema.safeParse({
      perubahan: [
        { bahanId: COKLAT, persen: 10 },
        { bahanId: KEJU, persen: 5 },
        { bahanId: COKLAT, persen: 20 },
      ],
    });
    expect(hasil.success).toBe(false);
    if (hasil.success) return;
    expect(hasil.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['perubahan', 2, 'bahanId'],
        message: 'Bahan yang sama hanya boleh dipilih sekali',
      }),
    );
  });
});
