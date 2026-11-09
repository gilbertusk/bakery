import { describe, expect, it } from 'vitest';

import { LABEL_METODE, formatNilaiBiaya, kalimatDampak, nilaiUntukForm } from './format';

describe('LABEL_METODE', () => {
  it('memakai label yang mudah dipahami', () => {
    expect(LABEL_METODE).toEqual({
      per_pcs: 'Rp per pcs',
      persen: '% dari biaya bahan',
      per_batch: 'Rp per resep/batch',
    });
  });
});

describe('formatNilaiBiaya', () => {
  it.each([
    ['per_pcs', '150.0000', 'Rp150/pcs'],
    ['per_pcs', '12.5000', 'Rp12,5/pcs'],
    ['persen', '0.1250', '12,5%'],
    ['persen', '1.0000', '100%'],
    ['per_batch', '5000.0000', 'Rp5.000/resep'],
  ] as const)('%s %s → %s', (metode, nilai, hasil) => {
    expect(formatNilaiBiaya(metode, nilai)).toBe(hasil);
  });
});

describe('nilaiUntukForm', () => {
  it('persen 0–1 dikembalikan ke 0–100, rupiah apa adanya', () => {
    expect(nilaiUntukForm('persen', '0.1250')).toBe('12,5');
    expect(nilaiUntukForm('persen', '0.0000')).toBe('0');
    expect(nilaiUntukForm('per_pcs', '1500.0000')).toBe('1.500');
    expect(nilaiUntukForm('per_batch', '2500.5000')).toBe('2.500,5');
  });
});

describe('kalimatDampak', () => {
  it('merangkum jumlah produk dan rata-rata selisih', () => {
    expect(kalimatDampak({ jumlahProduk: 12, rataRataSelisih: '150' })).toBe(
      'Mengubah HPP 12 produk, rata-rata +Rp150/pcs',
    );
    expect(kalimatDampak({ jumlahProduk: 3, rataRataSelisih: '-12.5' })).toBe(
      'Mengubah HPP 3 produk, rata-rata -Rp12,5/pcs',
    );
  });

  it('tanpa dampak', () => {
    expect(kalimatDampak({ jumlahProduk: 0, rataRataSelisih: '0' })).toBe(
      'Tidak mengubah HPP produk mana pun',
    );
  });
});
