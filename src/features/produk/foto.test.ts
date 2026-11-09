import { describe, expect, it } from 'vitest';

import { ukuranFotoTerkompresi } from './foto';

describe('ukuranFotoTerkompresi', () => {
  it('membatasi sisi terpanjang ke 1024 px tanpa mengubah rasio', () => {
    expect(ukuranFotoTerkompresi(4000, 2250)).toEqual({ lebar: 1024, tinggi: 576 });
    expect(ukuranFotoTerkompresi(1200, 2400)).toEqual({ lebar: 512, tinggi: 1024 });
  });

  it('tidak memperbesar gambar yang sudah kecil', () => {
    expect(ukuranFotoTerkompresi(800, 600)).toEqual({ lebar: 800, tinggi: 600 });
  });
});
