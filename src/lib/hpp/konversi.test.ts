import { describe, expect, it } from 'vitest';

import { HitungError } from './error';
import { kemasanKeDasar, keSatuanDasar } from './konversi';

describe('keSatuanDasar', () => {
  it('3 sdm × 12 g = 36 g', () => {
    expect(keSatuanDasar('3', '12').toString()).toBe('36');
  });

  it('null berarti takaran sudah dalam satuan dasar', () => {
    expect(keSatuanDasar('250.5', null).toString()).toBe('250.5');
  });

  it('menolak takaran negatif dan nilai konversi ≤ 0', () => {
    expect(() => keSatuanDasar('-1', null)).toThrow(HitungError);
    expect(() => keSatuanDasar('1', '0')).toThrow('Nilai konversi harus lebih dari 0');
    expect(() => keSatuanDasar('1', '-12')).toThrow(HitungError);
  });
});

describe('kemasanKeDasar', () => {
  it.each([
    ['1', 'kg', 'g', '1000'],
    ['2.5', 'g', 'g', '2.5'],
    ['1.5', 'l', 'ml', '1500'],
    ['200', 'ml', 'ml', '200'],
    ['1', 'lusin', 'pcs', '12'],
    ['30', 'pcs', 'pcs', '30'],
  ] as const)('%s %s → %s %s', (jumlah, kemasan, dasar, hasil) => {
    expect(kemasanKeDasar(jumlah, kemasan, dasar).toString()).toBe(hasil);
  });

  it.each([
    ['kg', 'ml'],
    ['l', 'g'],
    ['lusin', 'g'],
    ['g', 'pcs'],
  ] as const)('%s → %s ditolak', (kemasan, dasar) => {
    expect(() => kemasanKeDasar('1', kemasan, dasar)).toThrow(
      'Satuan kemasan tidak cocok dengan satuan dasar',
    );
  });

  it('menolak jumlah ≤ 0', () => {
    expect(() => kemasanKeDasar('0', 'kg', 'g')).toThrow('Jumlah kemasan harus lebih dari 0');
  });
});
