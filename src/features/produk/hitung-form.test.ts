import { describe, expect, it } from 'vitest';

import { hitungPratinjauProduk } from './hitung-form';

describe('hitungPratinjauProduk', () => {
  it('menghitung HPP, margin, dan perkiraan pcs dari adonan serta bahan langsung', () => {
    const hasil = hitungPratinjauProduk({
      hargaJual: '5000',
      targetMargin: '0.30',
      resep: [
        {
          id: 'resep-1',
          nama: 'Brownies Panggang',
          hasilGram: '1200',
          biayaPerGram: '42.125',
        },
      ],
      bahan: [
        {
          id: 'bahan-1',
          nama: 'Kemasan Cup',
          satuanDasar: 'pcs',
          hargaPerSatuan: '500',
          konversi: [],
        },
      ],
      komponen: [
        { jenis: 'adonan', resepAdonanId: 'resep-1', gramPerPcs: '50' },
        {
          jenis: 'bahan',
          peran: 'kemasan',
          bahanId: 'bahan-1',
          takaran: '1',
          konversiSatuanId: null,
        },
      ],
    });

    expect(hasil.rincian.hpp.toString()).toBe('2606.25');
    expect(hasil.marginRp.toString()).toBe('2393.75');
    expect(hasil.marginPersen?.toFixed(5)).toBe('0.47875');
    expect(hasil.diBawahTarget).toBe(false);
    expect(hasil.rincian.adonanUtama).toEqual({ resepId: 'resep-1', pcsPerResep: 24 });
  });

  it('mengabaikan baris yang belum lengkap agar pratinjau form tetap aman', () => {
    const hasil = hitungPratinjauProduk({
      hargaJual: '',
      targetMargin: '0.30',
      resep: [],
      bahan: [],
      komponen: [{ jenis: 'adonan', resepAdonanId: '', gramPerPcs: '' }],
    });

    expect(hasil.rincian.hpp.toString()).toBe('0');
    expect(hasil.marginPersen).toBeNull();
  });
});
