import { describe, expect, it } from 'vitest';

import { aktifDariStatus, bacaStatus } from './filter';

describe('filter status aktif', () => {
  it.each([
    [undefined, 'aktif'],
    ['aktif', 'aktif'],
    ['nonaktif', 'nonaktif'],
    ['semua', 'semua'],
    ['ngawur', 'aktif'],
    [['semua', 'aktif'], 'aktif'],
  ] as const)('bacaStatus(%j) = %s', (input, hasil) => {
    expect(bacaStatus(input as string | string[] | undefined)).toBe(hasil);
  });

  it('aktifDariStatus', () => {
    expect(aktifDariStatus('aktif')).toBe(true);
    expect(aktifDariStatus('nonaktif')).toBe(false);
    expect(aktifDariStatus('semua')).toBeUndefined();
  });
});
