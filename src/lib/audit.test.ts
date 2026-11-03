import { describe, expect, it } from 'vitest';

import { D } from './angka';
import { selisihData } from './audit';

describe('selisihData', () => {
  it('hanya mengembalikan field yang berubah', () => {
    expect(
      selisihData(
        { nama: 'Brownies', hargaJual: 15000, aktif: true },
        { nama: 'Brownies', hargaJual: 17000, aktif: true },
      ),
    ).toEqual({ lama: { hargaJual: 15000 }, baru: { hargaJual: 17000 } });
  });

  it('mendeteksi field yang ditambah atau dihapus', () => {
    expect(selisihData({ a: 1 }, { a: 1, b: 2 })).toEqual({
      lama: { b: null },
      baru: { b: 2 },
    });
    expect(selisihData({ a: 1, b: 2 }, { a: 1 })).toEqual({
      lama: { b: 2 },
      baru: { b: null },
    });
  });

  it('membandingkan Decimal, Date, dan objek berdasarkan nilai JSON', () => {
    const waktu = new Date('2026-11-03T00:00:00Z');
    expect(
      selisihData(
        { harga: '15.0000', waktu, meta: { x: 1 } },
        { harga: D('15.0000'), waktu: new Date(waktu), meta: { x: 1 } },
      ),
    ).toBeNull();
    expect(selisihData({ harga: '15.0000' }, { harga: D('16') })).toEqual({
      lama: { harga: '15.0000' },
      baru: { harga: '16' },
    });
  });

  it('mengembalikan null bila tidak ada perubahan', () => {
    expect(selisihData({ a: 1 }, { a: 1 })).toBeNull();
  });
});
