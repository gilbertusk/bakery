import { describe, expect, it } from 'vitest';

import { HitungError } from './error';
import { hitungItemDenganAddOn, hppAddOn, kebutuhanBahanAddOn } from './add-on';

const KEJU = 'keju';
const COKLAT = 'coklat';

describe('hppAddOn', () => {
  it('takaran dasar × harga per satuan bahan, tanpa pembulatan', () => {
    // Keju cheddar 20 g × Rp110/g
    expect(hppAddOn({ takaranDasar: '20', hargaPerSatuan: '110' }).toString()).toBe('2200');
    expect(hppAddOn({ takaranDasar: '12.5', hargaPerSatuan: '13.3333' }).toString()).toBe(
      '166.66625',
    );
  });

  it('harga bahan 0 → HPP 0', () => {
    expect(hppAddOn({ takaranDasar: '20', hargaPerSatuan: 0 }).toString()).toBe('0');
  });

  it('menolak takaran ≤ 0 dan harga negatif', () => {
    expect(() => hppAddOn({ takaranDasar: 0, hargaPerSatuan: 1 })).toThrow(
      'Takaran add-on harus lebih dari 0',
    );
    expect(() => hppAddOn({ takaranDasar: 1, hargaPerSatuan: -1 })).toThrow(
      'Harga bahan tidak boleh negatif',
    );
  });
});

describe('hitungItemDenganAddOn', () => {
  it('brownies 2 pcs + extra keju + extra coklat (harga diubah), diskon 10%', () => {
    const hasil = hitungItemDenganAddOn({
      qty: 2,
      hargaSatuan: 5_000,
      addOns: [
        { addOnId: KEJU, harga: 3_000, hargaNormal: 3_000, hppSatuan: '2200' },
        { addOnId: COKLAT, harga: 1_500, hargaNormal: 2_000, hppSatuan: '1200.5' },
      ],
      diskon: { jenis: 'persen', nilai: 10 },
    });

    // 5.000 + 3.000 + 1.500
    expect(hasil.hargaPerPcs).toBe(9_500);
    // 2 × 9.500
    expect(hasil.subtotalSebelumDiskon).toBe(19_000);
    // 10% × 19.000, termasuk add-on
    expect(hasil.diskonRp).toBe(1_900);
    expect(hasil.subtotal).toBe(17_100);
    // 2.200 + 1.200,5 per pcs
    expect(hasil.hppAddOnPerPcs.toString()).toBe('3400.5');
    // 2 pcs × ((3.000 − 3.000) + (1.500 − 2.000))
    expect(hasil.selisihHarga).toBe(-1_000);
  });

  it('tanpa add-on = harga produk saja', () => {
    const { hppAddOnPerPcs, ...hasil } = hitungItemDenganAddOn({
      qty: 3,
      hargaSatuan: 4_000,
      addOns: [],
      diskon: { jenis: 'rp', nilai: 0 },
    });
    expect(hasil).toEqual({
      hargaPerPcs: 4_000,
      subtotalSebelumDiskon: 12_000,
      diskonRp: 0,
      subtotal: 12_000,
      selisihHarga: 0,
    });
    expect(hppAddOnPerPcs.toString()).toBe('0');
  });

  it('diskon persen dibulatkan ke bawah', () => {
    // 3 × 3.333 = 9.999; 15% = 1.499,85 → 1.499
    const hasil = hitungItemDenganAddOn({
      qty: 3,
      hargaSatuan: 3_333,
      addOns: [],
      diskon: { jenis: 'persen', nilai: '15' },
    });
    expect(hasil.diskonRp).toBe(1_499);
    expect(hasil.subtotal).toBe(8_500);
  });

  it('diskon persen desimal dan 100%', () => {
    const dasar = { qty: 1, hargaSatuan: 10_000, addOns: [] };
    expect(
      hitungItemDenganAddOn({ ...dasar, diskon: { jenis: 'persen', nilai: '12.5' } }),
    ).toMatchObject({ diskonRp: 1_250, subtotal: 8_750 });
    expect(
      hitungItemDenganAddOn({ ...dasar, diskon: { jenis: 'persen', nilai: 100 } }),
    ).toMatchObject({ diskonRp: 10_000, subtotal: 0 });
  });

  it('diskon rupiah berlaku untuk seluruh baris termasuk add-on', () => {
    const hasil = hitungItemDenganAddOn({
      qty: 2,
      hargaSatuan: 5_000,
      addOns: [{ addOnId: KEJU, harga: 3_000, hargaNormal: 3_000, hppSatuan: 0 }],
      diskon: { jenis: 'rp', nilai: 16_000 },
    });
    expect(hasil).toMatchObject({ subtotalSebelumDiskon: 16_000, diskonRp: 16_000, subtotal: 0 });
  });

  it('harga add-on 0 (gratis) diterima dan selisih negatif', () => {
    const hasil = hitungItemDenganAddOn({
      qty: 1,
      hargaSatuan: 5_000,
      addOns: [{ addOnId: KEJU, harga: 0, hargaNormal: 3_000, hppSatuan: '2200' }],
      diskon: { jenis: 'rp', nilai: 0 },
    });
    expect(hasil).toMatchObject({ hargaPerPcs: 5_000, selisihHarga: -3_000 });
    expect(hasil.hppAddOnPerPcs.toString()).toBe('2200');
  });

  it('menolak add-on duplikat di satu item', () => {
    const addOn = { addOnId: KEJU, harga: 3_000, hargaNormal: 3_000, hppSatuan: 0 };
    expect(() =>
      hitungItemDenganAddOn({
        qty: 1,
        hargaSatuan: 5_000,
        addOns: [addOn, { ...addOn, harga: 2_000 }],
        diskon: { jenis: 'rp', nilai: 0 },
      }),
    ).toThrow(new HitungError('Add-on yang sama hanya boleh dipilih sekali per item'));
  });

  it.each([
    ['negatif', -1],
    ['bukan bulat', 1_500.5],
  ])('menolak harga add-on %s', (_nama, harga) => {
    expect(() =>
      hitungItemDenganAddOn({
        qty: 1,
        hargaSatuan: 5_000,
        addOns: [{ addOnId: KEJU, harga, hargaNormal: 3_000, hppSatuan: 0 }],
        diskon: { jenis: 'rp', nilai: 0 },
      }),
    ).toThrow('Harga add-on harus bilangan bulat ≥ 0');
  });

  it.each([
    ['negatif', -1],
    ['bukan bulat', 0.5],
  ])('menolak harga normal add-on %s', (_nama, hargaNormal) => {
    expect(() =>
      hitungItemDenganAddOn({
        qty: 1,
        hargaSatuan: 5_000,
        addOns: [{ addOnId: KEJU, harga: 1, hargaNormal, hppSatuan: 0 }],
        diskon: { jenis: 'rp', nilai: 0 },
      }),
    ).toThrow('Harga normal add-on harus bilangan bulat ≥ 0');
  });

  it('menolak HPP add-on negatif', () => {
    expect(() =>
      hitungItemDenganAddOn({
        qty: 1,
        hargaSatuan: 5_000,
        addOns: [{ addOnId: KEJU, harga: 1, hargaNormal: 1, hppSatuan: '-1' }],
        diskon: { jenis: 'rp', nilai: 0 },
      }),
    ).toThrow('HPP add-on tidak boleh negatif');
  });

  it.each([
    ['nol', 0],
    ['negatif', -1],
    ['bukan bulat', 1.5],
  ])('menolak qty %s', (_nama, qty) => {
    expect(() =>
      hitungItemDenganAddOn({
        qty,
        hargaSatuan: 5_000,
        addOns: [],
        diskon: { jenis: 'rp', nilai: 0 },
      }),
    ).toThrow('Jumlah harus bilangan bulat lebih dari 0');
  });

  it.each([
    ['negatif', -1],
    ['bukan bulat', 100.5],
  ])('menolak harga produk %s', (_nama, hargaSatuan) => {
    expect(() =>
      hitungItemDenganAddOn({ qty: 1, hargaSatuan, addOns: [], diskon: { jenis: 'rp', nilai: 0 } }),
    ).toThrow('Harga produk harus bilangan bulat ≥ 0');
  });

  it('menolak diskon melebihi subtotal', () => {
    expect(() =>
      hitungItemDenganAddOn({
        qty: 1,
        hargaSatuan: 5_000,
        addOns: [{ addOnId: KEJU, harga: 3_000, hargaNormal: 3_000, hppSatuan: 0 }],
        diskon: { jenis: 'rp', nilai: 8_001 },
      }),
    ).toThrow('Diskon tidak boleh melebihi subtotal');
  });

  it.each([
    [
      'rupiah negatif',
      { jenis: 'rp' as const, nilai: -1 },
      'Diskon rupiah harus bilangan bulat ≥ 0',
    ],
    [
      'rupiah bukan bulat',
      { jenis: 'rp' as const, nilai: 0.5 },
      'Diskon rupiah harus bilangan bulat ≥ 0',
    ],
    ['persen negatif', { jenis: 'persen' as const, nilai: -1 }, 'Diskon persen harus 0 sampai 100'],
    [
      'persen di atas 100',
      { jenis: 'persen' as const, nilai: '100.01' },
      'Diskon persen harus 0 sampai 100',
    ],
  ])('menolak diskon %s', (_nama, diskon, pesan) => {
    expect(() => hitungItemDenganAddOn({ qty: 1, hargaSatuan: 5_000, addOns: [], diskon })).toThrow(
      pesan,
    );
  });
});

describe('kebutuhanBahanAddOn', () => {
  it('menjumlahkan takaran dasar × qty per bahan lintas item', () => {
    const hasil = kebutuhanBahanAddOn([
      {
        qty: 2,
        addOns: [
          { bahanId: KEJU, takaranDasar: '20' },
          { bahanId: COKLAT, takaranDasar: '15.5' },
        ],
      },
      { qty: 3, addOns: [{ bahanId: KEJU, takaranDasar: '20' }] },
      { qty: 4, addOns: [] },
    ]);

    expect([...hasil].map(([id, qty]) => [id, qty.toString()])).toEqual([
      [KEJU, '100'],
      [COKLAT, '31'],
    ]);
  });

  it('tanpa item → Map kosong', () => {
    expect(kebutuhanBahanAddOn([]).size).toBe(0);
  });

  it('menolak qty dan takaran negatif', () => {
    expect(() =>
      kebutuhanBahanAddOn([{ qty: -1, addOns: [{ bahanId: KEJU, takaranDasar: '1' }] }]),
    ).toThrow('Jumlah pcs tidak boleh negatif');
    expect(() =>
      kebutuhanBahanAddOn([{ qty: 1, addOns: [{ bahanId: KEJU, takaranDasar: '-1' }] }]),
    ).toThrow('Takaran tidak boleh negatif');
  });
});
