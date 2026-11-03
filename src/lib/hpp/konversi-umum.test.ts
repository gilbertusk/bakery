import { describe, expect, it } from 'vitest';

import { KONVERSI_UMUM } from './konversi-umum';

describe('KONVERSI_UMUM', () => {
  it('menyimpan nilai desimal sebagai string dan satuan dasar yang didukung', () => {
    expect(KONVERSI_UMUM.length).toBeGreaterThanOrEqual(17);

    for (const konversi of KONVERSI_UMUM) {
      expect(konversi.nilaiDasar).toMatch(/^\d+(?:[.,]\d+)?$/);
      expect(['g', 'ml']).toContain(konversi.satuanDasar);
      expect(konversi.kataKunci.length).toBeGreaterThan(0);
    }
  });
});
