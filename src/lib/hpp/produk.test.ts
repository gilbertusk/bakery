import { describe, expect, it } from 'vitest';

import {
  BAHAN,
  BIAYA_PER_GRAM_BROWNIES,
  RESEP_BOLU,
  RESEP_BROWNIES,
} from './__fixtures__/brownies';
import { type InputHppProduk, hitungHppProduk } from './produk';

const ADONAN_BROWNIES = {
  jenis: 'adonan',
  resepId: RESEP_BROWNIES.id,
  namaResep: RESEP_BROWNIES.nama,
  gramPerPcs: '50',
  biayaPerGram: BIAYA_PER_GRAM_BROWNIES,
  hasilGram: RESEP_BROWNIES.hasilGram,
} as const;

const KEMASAN_CUP = {
  jenis: 'bahan',
  peran: 'kemasan',
  bahanId: BAHAN.kemasanCup.id,
  namaBahan: BAHAN.kemasanCup.nama,
  takaranDasar: '1',
  hargaPerSatuan: BAHAN.kemasanCup.hargaPerSatuan,
} as const;

const BROWNIES_CUP: InputHppProduk = {
  komponen: [ADONAN_BROWNIES, KEMASAN_CUP],
  biayaTambahan: [],
};

const teks = (nilai: { toString(): string }) => nilai.toString();

describe('hitungHppProduk', () => {
  it('Brownies Cup 50 g + kemasan: rincian per peran dan HPP total', () => {
    const hasil = hitungHppProduk(BROWNIES_CUP);

    expect(
      Object.fromEntries(Object.entries(hasil.perPeran).map(([k, v]) => [k, teks(v)])),
    ).toEqual({ adonan: '2106.25', topping: '0', filling: '0', kemasan: '500', lainnya: '0' });
    expect(hasil.perKomponen.map((k) => [k.label, teks(k.biaya)])).toEqual([
      ['Brownies Panggang', '2106.25'],
      ['Kemasan Cup Plastik', '500'],
    ]);
    expect(teks(hasil.biayaBahan)).toBe('2606.25');
    expect(teks(hasil.overhead.total)).toBe('0');
    expect(teks(hasil.hpp)).toBe('2606.25');
    expect(hasil.adonanUtama).toEqual({ resepId: 'brownies', pcsPerResep: 24 });
    expect(hasil.peringatan).toEqual([]);
  });

  it('overhead per pcs Rp200 + 10% + per batch Rp6.000 dengan 24 pcs per resep', () => {
    const hasil = hitungHppProduk({
      ...BROWNIES_CUP,
      biayaTambahan: [
        { nama: 'Gas', metode: 'per_pcs', nilai: '200' },
        { nama: 'Penyusutan', metode: 'persen', nilai: '0.1' },
        { nama: 'Listrik oven', metode: 'per_batch', nilai: '6000' },
      ],
    });

    expect(teks(hasil.overhead.perPcs)).toBe('200');
    expect(teks(hasil.overhead.persen)).toBe('260.625');
    expect(teks(hasil.overhead.perBatch)).toBe('250');
    expect(teks(hasil.overhead.total)).toBe('710.625');
    expect(teks(hasil.hpp)).toBe('3316.875');
  });

  it('produk dua adonan: adonan utama = gram per pcs terbesar', () => {
    const hasil = hitungHppProduk({
      komponen: [
        { ...ADONAN_BROWNIES, gramPerPcs: '25' },
        {
          jenis: 'adonan',
          resepId: RESEP_BOLU.id,
          namaResep: RESEP_BOLU.nama,
          gramPerPcs: '40',
          biayaPerGram: '17.25',
          hasilGram: RESEP_BOLU.hasilGram,
        },
      ],
      biayaTambahan: [{ nama: 'Listrik oven', metode: 'per_batch', nilai: '5000' }],
    });

    expect(hasil.adonanUtama).toEqual({ resepId: 'bolu', pcsPerResep: 25 });
    expect(teks(hasil.perPeran.adonan)).toBe('1743.125'); // 1.053,125 + 690
    expect(teks(hasil.overhead.perBatch)).toBe('200');
  });

  it('dua adonan bergram sama: yang pertama jadi adonan utama', () => {
    const hasil = hitungHppProduk({
      komponen: [ADONAN_BROWNIES, { ...ADONAN_BROWNIES, resepId: 'lain' }],
      biayaTambahan: [],
    });
    expect(hasil.adonanUtama?.resepId).toBe('brownies');
  });

  it('topping, filling, lainnya masuk ke perannya masing-masing', () => {
    const hasil = hitungHppProduk({
      komponen: [
        {
          ...KEMASAN_CUP,
          peran: 'topping',
          namaBahan: 'Keju',
          takaranDasar: '10',
          hargaPerSatuan: '110',
        },
        {
          ...KEMASAN_CUP,
          peran: 'filling',
          namaBahan: 'Selai',
          takaranDasar: '5',
          hargaPerSatuan: '40',
        },
        {
          ...KEMASAN_CUP,
          peran: 'lainnya',
          namaBahan: 'Stiker',
          takaranDasar: '1',
          hargaPerSatuan: '150',
        },
      ],
      biayaTambahan: [],
    });

    expect(teks(hasil.perPeran.topping)).toBe('1100');
    expect(teks(hasil.perPeran.filling)).toBe('200');
    expect(teks(hasil.perPeran.lainnya)).toBe('150');
    expect(teks(hasil.hpp)).toBe('1450');
  });

  it('tanpa adonan: per batch diabaikan dengan peringatan, per pcs tetap', () => {
    const hasil = hitungHppProduk({
      komponen: [KEMASAN_CUP],
      biayaTambahan: [
        { nama: 'Gas', metode: 'per_pcs', nilai: '100' },
        { nama: 'Listrik oven', metode: 'per_batch', nilai: '6000' },
      ],
    });

    expect(hasil.adonanUtama).toBeNull();
    expect(teks(hasil.overhead.perBatch)).toBe('0');
    expect(teks(hasil.hpp)).toBe('600');
    expect(hasil.peringatan).toEqual([
      'Biaya per batch diabaikan karena produk tidak memakai adonan',
    ]);
  });

  it('tanpa adonan dan tanpa biaya per batch: tidak ada peringatan', () => {
    expect(hitungHppProduk({ komponen: [KEMASAN_CUP], biayaTambahan: [] }).peringatan).toEqual([]);
  });

  it('gram per pcs melebihi hasil resep: pcsPerResep 0, per batch diabaikan', () => {
    const hasil = hitungHppProduk({
      komponen: [{ ...ADONAN_BROWNIES, gramPerPcs: '1500' }],
      biayaTambahan: [{ nama: 'Listrik oven', metode: 'per_batch', nilai: '6000' }],
    });

    expect(hasil.adonanUtama).toEqual({ resepId: 'brownies', pcsPerResep: 0 });
    expect(teks(hasil.overhead.perBatch)).toBe('0');
    expect(hasil.peringatan).toEqual([
      'Gram per pcs melebihi hasil resep Brownies Panggang. Biaya per batch diabaikan',
    ]);
  });

  it('gram per pcs melebihi hasil resep tanpa biaya per batch: tetap diperingatkan', () => {
    const hasil = hitungHppProduk({
      komponen: [{ ...ADONAN_BROWNIES, gramPerPcs: '1500' }],
      biayaTambahan: [],
    });
    expect(hasil.peringatan).toEqual(['Gram per pcs melebihi hasil resep Brownies Panggang']);
  });

  it('komponen kosong → HPP 0 dengan peringatan', () => {
    const hasil = hitungHppProduk({
      komponen: [],
      biayaTambahan: [{ nama: 'Gas', metode: 'per_pcs', nilai: '200' }],
    });

    expect(teks(hasil.hpp)).toBe('0');
    expect(teks(hasil.overhead.total)).toBe('0');
    expect(hasil.perKomponen).toEqual([]);
    expect(hasil.adonanUtama).toBeNull();
    expect(hasil.peringatan).toEqual(['Produk belum punya komponen']);
  });

  it('menolak input tidak valid', () => {
    const satu = (komponen: InputHppProduk['komponen'][number]) => () =>
      hitungHppProduk({ komponen: [komponen], biayaTambahan: [] });

    expect(satu({ ...ADONAN_BROWNIES, gramPerPcs: '0' })).toThrow(
      'Gram per pcs harus lebih dari 0',
    );
    expect(satu({ ...ADONAN_BROWNIES, hasilGram: '0' })).toThrow('Hasil adonan harus lebih dari 0');
    expect(satu({ ...ADONAN_BROWNIES, biayaPerGram: '-1' })).toThrow('Biaya tidak boleh negatif');
    expect(satu({ ...KEMASAN_CUP, takaranDasar: '-1' })).toThrow('Takaran tidak boleh negatif');
    expect(satu({ ...KEMASAN_CUP, hargaPerSatuan: '-1' })).toThrow('Harga tidak boleh negatif');

    const biaya =
      (nilai: string, metode: 'per_pcs' | 'persen' = 'per_pcs') =>
      () =>
        hitungHppProduk({ ...BROWNIES_CUP, biayaTambahan: [{ nama: 'X', metode, nilai }] });
    expect(biaya('-1')).toThrow('Biaya tambahan tidak boleh negatif');
    expect(biaya('1.5', 'persen')).toThrow('Persen biaya tambahan maksimal 100%');
  });
});
