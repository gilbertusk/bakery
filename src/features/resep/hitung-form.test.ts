import { describe, expect, it } from 'vitest';

import { hitungRingkasanForm } from './hitung-form';

describe('hitungRingkasanForm', () => {
  it('menghitung takaran dasar, biaya, hasil otomatis, dan biaya per gram', () => {
    const hasil = hitungRingkasanForm({
      modeHasil: 'otomatis',
      hasilGram: null,
      items: [
        {
          namaBahan: 'Gula',
          satuanDasar: 'g',
          takaran: '3',
          nilaiKonversi: '12',
          hargaPerSatuan: '18',
        },
        {
          namaBahan: 'Susu',
          satuanDasar: 'ml',
          takaran: '100',
          nilaiKonversi: null,
          hargaPerSatuan: '20',
        },
      ],
    });

    expect(
      hasil.items.map((item) => [item!.takaranDasar.toString(), item!.biaya.toString()]),
    ).toEqual([
      ['36', '648'],
      ['100', '2000'],
    ]);
    expect(hasil.hasilGram?.toString()).toBe('136');
    expect(hasil.biayaTotal.toString()).toBe('2648');
    expect(hasil.biayaPerGram?.toString()).toBe('19.4705882352941176470588235294');
    expect(hasil.peringatan).toEqual(['Susu diasumsikan 1 ml = 1 g']);
  });

  it('mode timbang memakai hasil input dan tetap memberi peringatan bahan pcs', () => {
    const hasil = hitungRingkasanForm({
      modeHasil: 'timbang',
      hasilGram: '50',
      items: [
        {
          namaBahan: 'Telur',
          satuanDasar: 'pcs',
          takaran: '2',
          nilaiKonversi: null,
          hargaPerSatuan: '2000',
        },
      ],
    });

    expect(hasil.hasilGram?.toString()).toBe('50');
    expect(hasil.biayaTotal.toString()).toBe('4000');
    expect(hasil.biayaPerGram?.toString()).toBe('80');
    expect(hasil.peringatan).toEqual([
      'Telur (pcs) tidak ikut terhitung. Gunakan mode timbang agar hasil adonan akurat',
    ]);
  });

  it('baris belum lengkap tidak membuat pratinjau gagal', () => {
    const hasil = hitungRingkasanForm({
      modeHasil: 'otomatis',
      hasilGram: null,
      items: [
        {
          namaBahan: 'Gula',
          satuanDasar: 'g',
          takaran: '',
          nilaiKonversi: null,
          hargaPerSatuan: '18',
        },
      ],
    });

    expect(hasil.items[0]).toBeNull();
    expect(hasil.hasilGram).toBeNull();
    expect(hasil.biayaPerGram).toBeNull();
  });
});
