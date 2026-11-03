import { describe, expect, it } from 'vitest';

import {
  D,
  Decimal,
  bulatKeAtas,
  bulatRupiah,
  isBulat,
  isNegatif,
  isNol,
  isPositif,
  jumlah,
  keNumeric,
} from './angka';

describe('D', () => {
  it('menerima string, number, dan Decimal', () => {
    expect(D('1.5').toString()).toBe('1.5');
    expect(D(2).toString()).toBe('2');
    expect(D(new Decimal('3.25')).toString()).toBe('3.25');
  });

  it('tidak kehilangan presisi seperti float', () => {
    expect(D('0.1').plus('0.2').toString()).toBe('0.3');
  });

  it('melempar error untuk input bukan angka', () => {
    expect(() => D('abc')).toThrow();
  });
});

describe('keNumeric', () => {
  it('membulatkan half up sesuai skala kolom', () => {
    expect(keNumeric('13.33335', 4)).toBe('13.3334');
    expect(keNumeric('2.0005', 3)).toBe('2.001');
    expect(keNumeric(36, 3)).toBe('36.000');
  });

  it('membulatkan nilai negatif menjauhi nol', () => {
    expect(keNumeric('-2.0005', 3)).toBe('-2.001');
  });
});

describe('bulatRupiah', () => {
  it.each([
    ['13.5', 14],
    ['13.49', 13],
    ['2675.5', 2676],
    ['-0.4', 0],
    ['-1.5', -2],
  ])('%s → %d', (masuk, hasil) => {
    expect(bulatRupiah(masuk)).toBe(hasil);
  });

  it('tidak menghasilkan -0', () => {
    expect(Object.is(bulatRupiah('-0.2'), 0)).toBe(true);
  });
});

describe('bulatKeAtas', () => {
  it('membulatkan ke kelipatan berikutnya', () => {
    expect(bulatKeAtas('3822.86', 500)).toBe(4000);
    expect(bulatKeAtas(4000, 500)).toBe(4000);
    expect(bulatKeAtas('4000.01', 500)).toBe(4500);
    expect(bulatKeAtas('12.1', 1)).toBe(13);
  });

  it('menolak kelipatan nol atau negatif', () => {
    expect(() => bulatKeAtas(100, 0)).toThrow();
    expect(() => bulatKeAtas(100, -500)).toThrow();
  });
});

describe('predikat angka', () => {
  it('isNol, isNegatif, isPositif, isBulat', () => {
    expect(isNol('0.000')).toBe(true);
    expect(isNol('0.001')).toBe(false);
    expect(isNegatif('-0.001')).toBe(true);
    expect(isNegatif('-0')).toBe(false);
    expect(isNegatif(0)).toBe(false);
    expect(isPositif('0.001')).toBe(true);
    expect(isPositif(0)).toBe(false);
    expect(isBulat('5.000')).toBe(true);
    expect(isBulat('5.5')).toBe(false);
  });

  it('jumlah menjumlahkan daftar angka', () => {
    expect(jumlah(['0.1', 0.2, D('0.3')]).toString()).toBe('0.6');
    expect(jumlah([]).toString()).toBe('0');
  });
});
