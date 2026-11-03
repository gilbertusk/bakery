import { describe, expect, it } from 'vitest';

import { hitungMargin, saranHarga } from './margin';

describe('hitungMargin', () => {
  it('HPP 3.200, harga 5.000 → Rp1.800 dan 36%', () => {
    const hasil = hitungMargin('3200', 5000);
    expect(hasil.marginRp.toString()).toBe('1800');
    expect(hasil.marginPersen?.toString()).toBe('0.36');
  });

  it('harga jual 0 → persen null', () => {
    const hasil = hitungMargin('3200', 0);
    expect(hasil.marginRp.toString()).toBe('-3200');
    expect(hasil.marginPersen).toBeNull();
  });

  it('margin negatif bila HPP di atas harga', () => {
    expect(hitungMargin('6000', 5000).marginPersen?.toString()).toBe('-0.2');
  });

  it('menolak harga jual negatif', () => {
    expect(() => hitungMargin('1', -1)).toThrow('Harga jual tidak boleh negatif');
  });
});

describe('saranHarga', () => {
  it.each([
    ['3200', '0.30', 5000], // 4.571,43
    ['3500', '0.30', 5000], // tepat 5.000
    ['3501', '0.30', 5500], // 5.001,43
    ['0', '0.30', 0],
    ['3200', '0', 3500],
  ])('HPP %s, target %s → %d', (hpp, target, hasil) => {
    expect(saranHarga(hpp, target)).toBe(hasil);
  });

  it('kelipatan bisa diatur', () => {
    expect(saranHarga('3200', '0.30', 1000)).toBe(5000);
    expect(saranHarga('3200', '0.30', 100)).toBe(4600);
  });

  it('target margin harus 0 ≤ t < 1', () => {
    expect(() => saranHarga('3200', '1')).toThrow('Target margin harus 0% sampai di bawah 100%');
    expect(() => saranHarga('3200', '-0.1')).toThrow('Target margin harus 0% sampai di bawah 100%');
  });

  it('menolak HPP negatif dan kelipatan ≤ 0', () => {
    expect(() => saranHarga('-1', '0.3')).toThrow('HPP tidak boleh negatif');
    expect(() => saranHarga('1', '0.3', 0)).toThrow('Kelipatan pembulatan harus lebih dari 0');
  });
});
