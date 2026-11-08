import { describe, expect, it } from 'vitest';

import { bacaFilterStok, statusStok } from './status-stok';

describe('statusStok (F-STK-06)', () => {
  it.each([
    ['1000', '500', 'aman'],
    ['500.001', '500', 'aman'],
    ['500', '500', 'menipis'],
    ['499.999', '500', 'menipis'],
    ['0', '500', 'menipis'],
    ['0', '0', 'menipis'],
    ['0.001', '0', 'aman'],
    ['-0.001', '0', 'minus'],
    ['-250', '500', 'minus'],
  ] as const)('stok %s, minimal %s → %s', (stok, minimal, hasil) => {
    expect(statusStok(stok, minimal)).toBe(hasil);
  });
});

describe('bacaFilterStok', () => {
  it.each([
    [undefined, 'semua'],
    ['semua', 'semua'],
    ['menipis', 'menipis'],
    ['minus', 'minus'],
    ['aman', 'semua'],
    [['minus'], 'semua'],
  ] as const)('%j → %s', (input, hasil) => {
    expect(bacaFilterStok(input as string | string[] | undefined)).toBe(hasil);
  });
});
