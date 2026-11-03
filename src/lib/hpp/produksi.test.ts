import { describe, expect, it } from 'vitest';

import { BAHAN } from './__fixtures__/brownies';
import { alokasiProduksi } from './produksi';

const CUP = {
  produkId: 'cup',
  gramPerPcs: '50',
  pcsRencana: 12,
  pcsAktual: 12,
  biayaBahanLangsungPerPcs: BAHAN.kemasanCup.hargaPerSatuan,
  overheadPerPcs: '0',
};
const BITES = {
  produkId: 'bites',
  gramPerPcs: '25',
  pcsRencana: 24,
  pcsAktual: 24,
  biayaBahanLangsungPerPcs: '0',
  overheadPerPcs: '100',
};

const ringkas = (hasil: ReturnType<typeof alokasiProduksi>) =>
  hasil.map((h) => [h.produkId, h.alokasiAdonan.toString(), h.hppAktual?.toString() ?? null]);

describe('alokasiProduksi', () => {
  it('Rp48.000: Cup 50 g × 12 dan Bites 25 g × 24 → alokasi 50:50', () => {
    expect(ringkas(alokasiProduksi({ biayaAdonan: 48_000, hasil: [CUP, BITES] }))).toEqual([
      ['cup', '24000', '2500'], // (24.000 + 500 × 12) ÷ 12
      ['bites', '24000', '1100'], // (24.000 + 100 × 24) ÷ 24
    ]);
  });

  it('pcs aktual kurang dari rencana menaikkan HPP aktual (penyusutan)', () => {
    const [cup] = alokasiProduksi({ biayaAdonan: 48_000, hasil: [{ ...CUP, pcsAktual: 10 }] });
    expect(cup?.alokasiAdonan.toString()).toBe('48000');
    expect(cup?.hppAktual?.toString()).toBe('5300');
  });

  it('pcs aktual 0 → hppAktual null', () => {
    const hasil = alokasiProduksi({
      biayaAdonan: 48_000,
      hasil: [CUP, { ...BITES, pcsAktual: 0 }],
    });
    expect(ringkas(hasil)[1]).toEqual(['bites', '24000', null]);
  });

  it('total bobot 0 ditolak', () => {
    expect(() => alokasiProduksi({ biayaAdonan: 48_000, hasil: [] })).toThrow(
      'Total gram adonan rencana harus lebih dari 0',
    );
    expect(() =>
      alokasiProduksi({ biayaAdonan: 48_000, hasil: [{ ...CUP, pcsRencana: 0 }] }),
    ).toThrow('Total gram adonan rencana harus lebih dari 0');
  });

  it('menolak nilai negatif', () => {
    expect(() => alokasiProduksi({ biayaAdonan: -1, hasil: [CUP] })).toThrow(
      'Biaya tidak boleh negatif',
    );
    expect(() => alokasiProduksi({ biayaAdonan: 1, hasil: [{ ...CUP, pcsAktual: -1 }] })).toThrow(
      'Jumlah pcs tidak boleh negatif',
    );
    expect(() => alokasiProduksi({ biayaAdonan: 1, hasil: [{ ...CUP, pcsRencana: -1 }] })).toThrow(
      'Jumlah pcs tidak boleh negatif',
    );
    expect(() => alokasiProduksi({ biayaAdonan: 1, hasil: [{ ...CUP, gramPerPcs: '0' }] })).toThrow(
      'Gram per pcs harus lebih dari 0',
    );
    expect(() =>
      alokasiProduksi({ biayaAdonan: 1, hasil: [{ ...CUP, overheadPerPcs: '-1' }] }),
    ).toThrow('Biaya tidak boleh negatif');
    expect(() =>
      alokasiProduksi({ biayaAdonan: 1, hasil: [{ ...CUP, biayaBahanLangsungPerPcs: '-1' }] }),
    ).toThrow('Biaya tidak boleh negatif');
  });
});
