import { describe, expect, it } from 'vitest';

import { hargaBaruBahan, hargaPerSatuanDasar } from './harga';
import { kemasanKeDasar } from './konversi';

describe('hargaPerSatuanDasar', () => {
  it('tepung 1 kg Rp13.500 → Rp13,5/g', () => {
    const qty = kemasanKeDasar('1', 'kg', 'g');
    expect(hargaPerSatuanDasar(13_500, qty).toString()).toBe('13.5');
  });

  it('tidak membulatkan hasil', () => {
    expect(hargaPerSatuanDasar(10_000, 3).toFixed(10)).toBe('3333.3333333333');
  });

  it('menolak qty ≤ 0 dan harga negatif', () => {
    expect(() => hargaPerSatuanDasar(1000, 0)).toThrow('Jumlah harus lebih dari 0');
    expect(() => hargaPerSatuanDasar(-1, 10)).toThrow('Harga tidak boleh negatif');
  });
});

describe('hargaBaruBahan', () => {
  const beli = { qtyBeli: '1000', hargaBeli: '14' };

  it('rata-rata tertimbang: stok 500 g @13 + beli 1.000 g @14 → 13,6666…', () => {
    const harga = hargaBaruBahan({
      metode: 'rata_rata',
      stokLama: '500',
      hargaLama: '13',
      ...beli,
    });
    expect(harga.toFixed(4)).toBe('13.6667');
    expect(harga.toString().startsWith('13.66666666')).toBe(true);
  });

  it('stok minus dianggap 0: stok −200 g @13 + beli 1.000 @14 → 14', () => {
    const harga = hargaBaruBahan({
      metode: 'rata_rata',
      stokLama: '-200',
      hargaLama: '13',
      ...beli,
    });
    expect(harga.toString()).toBe('14');
  });

  it('stok 0 → harga beli', () => {
    expect(
      hargaBaruBahan({ metode: 'rata_rata', stokLama: 0, hargaLama: '13', ...beli }).toString(),
    ).toBe('14');
  });

  it('metode terakhir → harga beli', () => {
    expect(
      hargaBaruBahan({ metode: 'terakhir', stokLama: '500', hargaLama: '13', ...beli }).toString(),
    ).toBe('14');
  });

  it('menolak qty beli ≤ 0 dan harga negatif', () => {
    const dasar = { metode: 'rata_rata' as const, stokLama: '0', hargaLama: '13' };
    expect(() => hargaBaruBahan({ ...dasar, qtyBeli: '0', hargaBeli: '14' })).toThrow(
      'Jumlah beli harus lebih dari 0',
    );
    expect(() => hargaBaruBahan({ ...dasar, qtyBeli: '1', hargaBeli: '-1' })).toThrow(
      'Harga tidak boleh negatif',
    );
    expect(() =>
      hargaBaruBahan({ ...dasar, hargaLama: '-1', qtyBeli: '1', hargaBeli: '1' }),
    ).toThrow('Harga tidak boleh negatif');
  });
});
