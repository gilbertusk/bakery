import { describe, expect, it } from 'vitest';

import { ringkasanSimulasi } from './format';

describe('ringkasanSimulasi', () => {
  it('merangkum jumlah produk terdampak dan yang di bawah target', () => {
    expect(ringkasanSimulasi(8, 3)).toBe('8 produk terdampak, 3 jadi di bawah target margin');
    expect(ringkasanSimulasi(0, 0)).toBe('0 produk terdampak, 0 jadi di bawah target margin');
  });
});
