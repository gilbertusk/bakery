import { describe, expect, it } from 'vitest';

import { saranKonversiUntuk } from './saran-konversi';

describe('saranKonversiUntuk', () => {
  it('memilih saran yang cocok dengan nama bahan dan satuan dasar', () => {
    expect(
      saranKonversiUntuk({ nama: 'Gula Pasir Premium', kategori: 'gula', satuanDasar: 'g' }),
    ).toEqual([
      { namaSatuan: 'sdm', nilaiDasar: '12.5' },
      { namaSatuan: 'cup', nilaiDasar: '200' },
    ]);
  });

  it('pencocokan tidak membedakan kapital dan dapat memakai kategori', () => {
    expect(
      saranKonversiUntuk({ nama: 'Bahan Curah', kategori: 'SUSU CAIR', satuanDasar: 'ml' }),
    ).toEqual([
      { namaSatuan: 'sdm', nilaiDasar: '15' },
      { namaSatuan: 'cup', nilaiDasar: '240' },
    ]);
  });

  it('tidak menawarkan saran dengan satuan dasar berbeda', () => {
    expect(saranKonversiUntuk({ nama: 'Gula Pasir', kategori: 'gula', satuanDasar: 'ml' })).toEqual(
      [],
    );
  });
});
