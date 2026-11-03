import { describe, expect, it } from 'vitest';

import { biayaAdonan, hasilOtomatis } from './adonan';

describe('biayaAdonan', () => {
  it('total Rp48.000 dengan hasil 1.200 g → Rp40/g', () => {
    const hasil = biayaAdonan({
      items: [
        { takaranDasar: '1000', hargaPerSatuan: '30' },
        { takaranDasar: '200', hargaPerSatuan: '90' },
      ],
      hasilGram: '1200',
    });
    expect(hasil.biayaTotal.toString()).toBe('48000');
    expect(hasil.biayaPerGram.toString()).toBe('40');
  });

  it('memakai Decimal penuh tanpa pembulatan', () => {
    const hasil = biayaAdonan({
      items: [{ takaranDasar: '36', hargaPerSatuan: '13.3334' }],
      hasilGram: '7',
    });
    expect(hasil.biayaTotal.toString()).toBe('480.0024');
    expect(hasil.biayaPerGram.toFixed(8)).toBe('68.57177143');
  });

  it('resep tanpa bahan berbiaya 0', () => {
    const hasil = biayaAdonan({ items: [], hasilGram: '100' });
    expect(hasil.biayaTotal.toString()).toBe('0');
    expect(hasil.biayaPerGram.toString()).toBe('0');
  });

  it('menolak hasil ≤ 0 dan nilai negatif', () => {
    expect(() => biayaAdonan({ items: [], hasilGram: '0' })).toThrow(
      'Hasil adonan harus lebih dari 0',
    );
    expect(() =>
      biayaAdonan({ items: [{ takaranDasar: '-1', hargaPerSatuan: '1' }], hasilGram: '1' }),
    ).toThrow('Takaran tidak boleh negatif');
    expect(() =>
      biayaAdonan({ items: [{ takaranDasar: '1', hargaPerSatuan: '-1' }], hasilGram: '1' }),
    ).toThrow('Harga tidak boleh negatif');
  });
});

describe('hasilOtomatis', () => {
  it('menjumlahkan g dan ml, mengabaikan pcs, dengan 2 peringatan', () => {
    const hasil = hasilOtomatis([
      { takaranDasar: '500', satuanDasar: 'g', namaBahan: 'Tepung Terigu' },
      { takaranDasar: '200.5', satuanDasar: 'ml', namaBahan: 'Susu Cair' },
      { takaranDasar: '50', satuanDasar: 'ml', namaBahan: 'Minyak' },
      { takaranDasar: '4', satuanDasar: 'pcs', namaBahan: 'Telur' },
    ]);

    expect(hasil.hasilGram.toString()).toBe('750.5');
    expect(hasil.peringatan).toEqual([
      'Susu Cair, Minyak diasumsikan 1 ml = 1 g',
      'Telur (pcs) tidak ikut terhitung. Gunakan mode timbang agar hasil adonan akurat',
    ]);
  });

  it('hanya g tanpa peringatan', () => {
    const hasil = hasilOtomatis([{ takaranDasar: '36', satuanDasar: 'g', namaBahan: 'Gula' }]);
    expect(hasil).toEqual({ hasilGram: expect.anything(), peringatan: [] });
    expect(hasil.hasilGram.toString()).toBe('36');
  });

  it('daftar kosong → 0', () => {
    expect(hasilOtomatis([]).hasilGram.toString()).toBe('0');
  });
});
