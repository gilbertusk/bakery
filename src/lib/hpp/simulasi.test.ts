import { describe, expect, it } from 'vitest';

import { BAHAN, KONTEKS_BROWNIES } from './__fixtures__/brownies';
import { hitungHppSemua, simulasiBiayaTambahan, simulasiKenaikan } from './simulasi';

describe('hitungHppSemua', () => {
  it('menghitung HPP semua produk dari data mentah', () => {
    const hasil = hitungHppSemua(KONTEKS_BROWNIES);
    expect(hasil.get('cup')?.hpp.toString()).toBe('2606.25');
    expect(hasil.get('loyang')?.hpp.toString()).toBe('53125'); // 42.125 + 11.000
    expect(hasil.get('bites')?.hpp.toString()).toBe('1053.125');
    expect(hasil.get('bolu-potong')?.hpp.toString()).toBe('1380'); // 80 × 17,25
  });

  it('memakai biaya tambahan produk', () => {
    const konteks = {
      ...KONTEKS_BROWNIES,
      produk: KONTEKS_BROWNIES.produk.map((p) =>
        p.id === 'cup'
          ? { ...p, biayaTambahan: [{ nama: 'Gas', metode: 'per_pcs' as const, nilai: '200' }] }
          : p,
      ),
    };
    expect(hitungHppSemua(konteks).get('cup')?.hpp.toString()).toBe('2806.25');
  });

  it('menolak bahan atau resep yang tidak ada di konteks', () => {
    const tanpaKemasan = {
      ...KONTEKS_BROWNIES,
      bahan: KONTEKS_BROWNIES.bahan.filter((b) => b.id !== BAHAN.kemasanCup.id),
    };
    expect(() => hitungHppSemua(tanpaKemasan)).toThrow(
      'Bahan kemasan-cup tidak ditemukan di data hitung',
    );

    const tanpaBolu = {
      ...KONTEKS_BROWNIES,
      resep: KONTEKS_BROWNIES.resep.filter((r) => r.id !== 'bolu'),
    };
    expect(() => hitungHppSemua(tanpaBolu)).toThrow('Resep bolu tidak ditemukan di data hitung');
  });
});

describe('simulasiKenaikan', () => {
  it('coklat naik 10% → hanya produk yang memakai coklat, urut selisih menurun', () => {
    const hasil = simulasiKenaikan(KONTEKS_BROWNIES, [
      { bahanId: BAHAN.coklatBatang.id, persen: 10 },
      { bahanId: BAHAN.coklatBubuk.id, persen: 10 },
    ]);

    // Coklat Rp22.500 per resep → naik Rp2.250 → +1,875/g
    expect(hasil.map((h) => [h.produkId, h.hppLama.toString(), h.hppBaru.toString()])).toEqual([
      ['loyang', '53125', '55000'],
      ['cup', '2606.25', '2700'],
      ['bites', '1053.125', '1100'],
    ]);
    expect(hasil.map((h) => h.selisih.toString())).toEqual(['1875', '93.75', '46.875']);
  });

  it('margin lama vs baru dan penanda di bawah target', () => {
    const [loyang, cup, bites] = simulasiKenaikan(KONTEKS_BROWNIES, [
      { bahanId: BAHAN.coklatBatang.id, persen: 50 },
    ]);

    // Coklat batang +Rp9.000 per resep → +7,5/g. Loyang: HPP 53.125 → 60.625
    expect(loyang?.hppBaru.toString()).toBe('60625');
    expect(loyang?.marginLama?.toFixed(4)).toBe('0.5573');
    expect(loyang?.marginBaru?.toFixed(4)).toBe('0.4948');
    expect(loyang?.diBawahTarget).toBe(false);
    // Cup: 5.000 vs HPP 2.981,25 → margin 40,4%
    expect(cup?.hppBaru.toString()).toBe('2981.25');
    expect(cup?.diBawahTarget).toBe(false);
    // Bites: 3.000 vs HPP 1.240,625 → margin 58,6%
    expect(bites?.diBawahTarget).toBe(false);

    const [, cupMahal] = simulasiKenaikan(KONTEKS_BROWNIES, [
      { bahanId: BAHAN.coklatBatang.id, persen: 200 },
    ]);
    // Cup: HPP 2.606,25 + 50 × 30 = 4.106,25 → margin 17,9% < 30%
    expect(cupMahal?.produkId).toBe('cup');
    expect(cupMahal?.marginBaru?.toFixed(4)).toBe('0.1788');
    expect(cupMahal?.diBawahTarget).toBe(true);
  });

  it('harga turun (persen negatif) menghasilkan selisih negatif', () => {
    const hasil = simulasiKenaikan(KONTEKS_BROWNIES, [{ bahanId: BAHAN.tepung.id, persen: -20 }]);
    // Tepung Rp3.750 → turun Rp750 per resep → −0,625/g; Bolu: 300 × 3 = −900 → −0,9/g
    expect(hasil.map((h) => [h.produkId, h.selisih.toString()])).toEqual([
      ['bites', '-15.625'],
      ['cup', '-31.25'],
      ['bolu-potong', '-72'],
      ['loyang', '-625'],
    ]);
  });

  it('harga jual 0: margin null dan dianggap di bawah target', () => {
    const konteks = {
      ...KONTEKS_BROWNIES,
      produk: KONTEKS_BROWNIES.produk.map((p) => (p.id === 'bites' ? { ...p, hargaJual: 0 } : p)),
    };
    const bites = simulasiKenaikan(konteks, [{ bahanId: BAHAN.gula.id, persen: 5 }]).find(
      (h) => h.produkId === 'bites',
    );
    expect(bites?.marginLama).toBeNull();
    expect(bites?.marginBaru).toBeNull();
    expect(bites?.diBawahTarget).toBe(true);
  });

  it('bahan yang tidak dipakai produk mana pun → daftar kosong', () => {
    expect(simulasiKenaikan(KONTEKS_BROWNIES, [{ bahanId: 'vanili', persen: 10 }])).toEqual([]);
    expect(simulasiKenaikan(KONTEKS_BROWNIES, [])).toEqual([]);
  });

  it('kenaikan 0% → daftar kosong', () => {
    expect(simulasiKenaikan(KONTEKS_BROWNIES, [{ bahanId: BAHAN.keju.id, persen: 0 }])).toEqual([]);
  });

  it('menolak penurunan lebih dari 100%', () => {
    expect(() =>
      simulasiKenaikan(KONTEKS_BROWNIES, [{ bahanId: BAHAN.keju.id, persen: -101 }]),
    ).toThrow('Penurunan harga maksimal 100%');
  });
});

describe('simulasiBiayaTambahan', () => {
  const GAS = { nama: 'Gas', metode: 'per_pcs' as const, nilai: '200' };
  const denganGasCup = {
    ...KONTEKS_BROWNIES,
    produk: KONTEKS_BROWNIES.produk.map((p) =>
      p.id === 'cup' ? { ...p, biayaTambahan: [{ id: 'gas', ...GAS }] } : p,
    ),
  };

  it('biaya baru per batch untuk semua produk → dibagi pcs per resep, urut selisih terbesar', () => {
    const hasil = simulasiBiayaTambahan(KONTEKS_BROWNIES, {
      id: null,
      produkId: null,
      aktif: true,
      biaya: { nama: 'Listrik oven', metode: 'per_batch', nilai: '2400' },
    });
    // Cup 24 pcs/resep, Loyang 1, Bites 48, Bolu Potong 12
    expect(hasil.map((h) => [h.produkId, h.selisih.toString()])).toEqual([
      ['loyang', '2400'],
      ['bolu-potong', '200'],
      ['cup', '100'],
      ['bites', '50'],
    ]);
  });

  it('biaya khusus satu produk hanya mengubah produk itu', () => {
    const hasil = simulasiBiayaTambahan(KONTEKS_BROWNIES, {
      id: null,
      produkId: 'cup',
      aktif: true,
      biaya: { nama: 'Gas', metode: 'per_pcs', nilai: '150' },
    });
    expect(hasil).toHaveLength(1);
    expect(hasil[0]?.produkId).toBe('cup');
    expect(hasil[0]?.hppLama.toString()).toBe('2606.25');
    expect(hasil[0]?.hppBaru.toString()).toBe('2756.25');
    expect(hasil[0]?.marginBaru?.toFixed(4)).toBe('0.4488');
    expect(hasil[0]?.diBawahTarget).toBe(false);
  });

  it('biaya baru nonaktif → tidak ada dampak', () => {
    expect(
      simulasiBiayaTambahan(KONTEKS_BROWNIES, {
        id: null,
        produkId: null,
        aktif: false,
        biaya: GAS,
      }),
    ).toEqual([]);
  });

  it('menonaktifkan biaya lama → HPP turun', () => {
    const hasil = simulasiBiayaTambahan(denganGasCup, {
      id: 'gas',
      produkId: 'cup',
      aktif: false,
      biaya: GAS,
    });
    expect(hasil.map((h) => [h.produkId, h.selisih.toString()])).toEqual([['cup', '-200']]);
  });

  it('nilai sama → tidak ada dampak; dipindah ke semua produk → produk lain ikut naik', () => {
    expect(
      simulasiBiayaTambahan(denganGasCup, { id: 'gas', produkId: 'cup', aktif: true, biaya: GAS }),
    ).toEqual([]);

    const hasil = simulasiBiayaTambahan(denganGasCup, {
      id: 'gas',
      produkId: null,
      aktif: true,
      biaya: GAS,
    });
    expect(hasil.map((h) => [h.produkId, h.selisih.toString()])).toEqual([
      ['loyang', '200'],
      ['bites', '200'],
      ['bolu-potong', '200'],
    ]);
  });

  it('urutan memakai besar selisih, termasuk penurunan', () => {
    const konteks = {
      ...KONTEKS_BROWNIES,
      produk: KONTEKS_BROWNIES.produk.map((p) => ({
        ...p,
        biayaTambahan: [{ id: 'oven', nama: 'Oven', metode: 'per_batch' as const, nilai: '2400' }],
      })),
    };
    const hasil = simulasiBiayaTambahan(konteks, {
      id: 'oven',
      produkId: null,
      aktif: false,
      biaya: { nama: 'Oven', metode: 'per_batch', nilai: '2400' },
    });
    expect(hasil.map((h) => [h.produkId, h.selisih.toString()])).toEqual([
      ['loyang', '-2400'],
      ['bolu-potong', '-200'],
      ['cup', '-100'],
      ['bites', '-50'],
    ]);
  });
});
