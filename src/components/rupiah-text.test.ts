import { describe, expect, it } from 'vitest';

import { formatRupiahSementara } from './rupiah-text';

describe('formatRupiahSementara', () => {
  it.each([
    [15000, 'Rp15.000'],
    [0, 'Rp0'],
    [1250000, 'Rp1.250.000'],
    [-5000, '-Rp5.000'],
  ])('memformat %d menjadi %s', (nilai, hasil) => {
    expect(formatRupiahSementara(nilai)).toBe(hasil);
  });
});
