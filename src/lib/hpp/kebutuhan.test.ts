import { describe, expect, it } from 'vitest';

import { BAHAN, RESEP_BOLU, RESEP_BROWNIES } from './__fixtures__/brownies';
import { kebutuhanUntukPesanan, pemakaianBahanProduksi } from './kebutuhan';

const keObjek = (peta: Map<string, { toString(): string }>) =>
  Object.fromEntries([...peta].map(([k, v]) => [k, v.toString()]));

const ADONAN_BROWNIES = (gramPerPcs: string) => ({
  jenis: 'adonan' as const,
  resepId: RESEP_BROWNIES.id,
  gramPerPcs,
  hasilGram: RESEP_BROWNIES.hasilGram,
  items: RESEP_BROWNIES.items,
});
const ADONAN_BOLU = (gramPerPcs: string) => ({
  jenis: 'adonan' as const,
  resepId: RESEP_BOLU.id,
  gramPerPcs,
  hasilGram: RESEP_BOLU.hasilGram,
  items: RESEP_BOLU.items,
});
const bahan = (bahanId: string, takaranDasar: string) => ({
  jenis: 'bahan' as const,
  bahanId,
  takaranDasar,
});

describe('pemakaianBahanProduksi', () => {
  it('skala 1,5 + topping keju + kemasan: resep utama dihitung sekali', () => {
    const hasil = pemakaianBahanProduksi({
      resepUtama: RESEP_BROWNIES,
      faktorSkala: '1.5',
      produk: [
        {
          pcsAktual: 1,
          komponen: [ADONAN_BROWNIES('1000'), bahan(BAHAN.keju.id, '100')],
        },
        {
          pcsAktual: 16,
          komponen: [ADONAN_BROWNIES('50'), bahan(BAHAN.kemasanCup.id, '1')],
        },
      ],
    });

    expect(keObjek(hasil)).toEqual({
      tepung: '375',
      gula: '450',
      telur: '330',
      mentega: '300',
      'coklat-batang': '225',
      'coklat-bubuk': '75',
      keju: '145', // 30 × 1,5 dari resep + 100 topping
      'kemasan-cup': '16',
    });
  });

  it('adonan lain dipotong proporsional terhadap gram yang dipakai', () => {
    const hasil = pemakaianBahanProduksi({
      resepUtama: RESEP_BROWNIES,
      faktorSkala: 1,
      produk: [{ pcsAktual: 10, komponen: [ADONAN_BROWNIES('50'), ADONAN_BOLU('20')] }],
    });

    // Bolu 20 g × 10 = 200 g dari 1.000 g → 0,2 × takaran
    expect(hasil.get('tepung')?.toString()).toBe('310'); // 250 + 300 × 0,2
    expect(hasil.get('gula')?.toString()).toBe('350'); // 300 + 250 × 0,2
    expect(hasil.get('mentega')?.toString()).toBe('210'); // 200 + 50 × 0,2
  });

  it('pcs aktual 0: hanya resep utama yang terpakai', () => {
    const hasil = pemakaianBahanProduksi({
      resepUtama: RESEP_BROWNIES,
      faktorSkala: 1,
      produk: [{ pcsAktual: 0, komponen: [bahan(BAHAN.keju.id, '100')] }],
    });
    expect(hasil.get('keju')?.toString()).toBe('30');
  });

  it('menolak input tidak valid', () => {
    const jalankan = (ubah: Partial<Parameters<typeof pemakaianBahanProduksi>[0]>) => () =>
      pemakaianBahanProduksi({ resepUtama: RESEP_BROWNIES, faktorSkala: 1, produk: [], ...ubah });

    expect(jalankan({ faktorSkala: 0 })).toThrow('Faktor skala harus lebih dari 0');
    expect(jalankan({ produk: [{ pcsAktual: -1, komponen: [] }] })).toThrow(
      'Jumlah pcs tidak boleh negatif',
    );
    expect(jalankan({ produk: [{ pcsAktual: 1, komponen: [ADONAN_BOLU('0')] }] })).toThrow(
      'Gram per pcs harus lebih dari 0',
    );
    expect(
      jalankan({
        produk: [{ pcsAktual: 1, komponen: [{ ...ADONAN_BOLU('20'), hasilGram: '0' }] }],
      }),
    ).toThrow('Hasil adonan harus lebih dari 0');
    expect(jalankan({ produk: [{ pcsAktual: 1, komponen: [bahan('keju', '-1')] }] })).toThrow(
      'Takaran tidak boleh negatif',
    );
    expect(
      jalankan({
        resepUtama: { ...RESEP_BROWNIES, items: [{ bahanId: 'tepung', takaranDasar: '-1' }] },
      }),
    ).toThrow('Takaran tidak boleh negatif');
  });
});

describe('kebutuhanUntukPesanan', () => {
  it('semua adonan proporsional + bahan langsung × qty', () => {
    const hasil = kebutuhanUntukPesanan([
      { qty: 12, komponen: [ADONAN_BROWNIES('50'), bahan(BAHAN.kemasanCup.id, '1')] },
      { qty: 24, komponen: [ADONAN_BROWNIES('25')] },
    ]);

    // 600 g + 600 g = 1.200 g = tepat 1 resep
    expect(hasil.get('tepung')?.toString()).toBe('250');
    expect(hasil.get('keju')?.toString()).toBe('30');
    expect(hasil.get('kemasan-cup')?.toString()).toBe('12');
  });

  it('daftar kosong → peta kosong', () => {
    expect(kebutuhanUntukPesanan([]).size).toBe(0);
  });

  it('menolak qty negatif', () => {
    expect(() => kebutuhanUntukPesanan([{ qty: -1, komponen: [] }])).toThrow(
      'Jumlah pcs tidak boleh negatif',
    );
  });
});
