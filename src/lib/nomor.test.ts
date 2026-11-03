import { describe, expect, it } from 'vitest';

import { formatNomor } from './nomor';

describe('formatNomor', () => {
  it('memakai format PREFIX-YYMMDD-NNN', () => {
    expect(formatNomor('NT', '2026-11-03', 1)).toBe('NT-261103-001');
    expect(formatNomor('INV', '2026-01-09', 42)).toBe('INV-260109-042');
    expect(formatNomor('PB', '2026-11-03', 999)).toBe('PB-261103-999');
  });

  it('lanjut 4 digit setelah 999', () => {
    expect(formatNomor('NT', '2026-11-03', 1000)).toBe('NT-261103-1000');
  });

  it('menolak urutan bukan bilangan bulat positif', () => {
    expect(() => formatNomor('NT', '2026-11-03', 0)).toThrow();
    expect(() => formatNomor('NT', '2026-11-03', 1.5)).toThrow();
  });
});
