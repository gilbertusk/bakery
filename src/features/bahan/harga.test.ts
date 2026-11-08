import { describe, expect, it } from 'vitest';

import { HitungError } from '@/lib/hpp';

import { hargaDariKemasan, pratinjauHarga } from './harga';

describe('hargaDariKemasan (F-BHN-02)', () => {
  it.each([
    ['1', 'kg', 15000, 'g', '15'],
    ['1', 'kg', 13500, 'g', '13.5'],
    ['500', 'g', 7250, 'g', '14.5'],
    ['1', 'l', 21000, 'ml', '21'],
    ['1', 'lusin', 30000, 'pcs', '2500'],
    ['3', 'kg', 10000, 'g', '3.3333'],
    ['3', 'kg', 20000, 'g', '6.6667'],
    ['1', 'kg', 0, 'g', '0'],
  ] as const)('%s %s Rp%d → Rp%s/%s', (jumlah, kemasan, total, dasar, hasil) => {
    const harga = hargaDariKemasan(
      { jumlahKemasan: jumlah, satuanKemasan: kemasan, totalHarga: total },
      dasar,
    );
    expect(harga.toString()).toBe(hasil);
  });

  it('menolak satuan kemasan yang tidak cocok', () => {
    expect(() =>
      hargaDariKemasan({ jumlahKemasan: '1', satuanKemasan: 'l', totalHarga: 1000 }, 'g'),
    ).toThrow(HitungError);
  });

  it('menolak harga per satuan di luar kapasitas kolom', () => {
    expect(() =>
      hargaDariKemasan(
        { jumlahKemasan: '0.001', satuanKemasan: 'g', totalHarga: 100_000_000 },
        'g',
      ),
    ).toThrow('Harga per satuan terlalu besar');
  });
});

describe('pratinjauHarga (InputHargaKemasan)', () => {
  it('menampilkan harga per satuan dasar', () => {
    expect(
      pratinjauHarga({ jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 15000 }, 'g'),
    ).toBe('Rp15/g');
    expect(
      pratinjauHarga({ jumlahKemasan: '1,5', satuanKemasan: 'l', totalHarga: 31500 }, 'ml'),
    ).toBe('Rp21/ml');
  });

  it('null bila isian belum lengkap atau tidak valid', () => {
    expect(
      pratinjauHarga({ jumlahKemasan: '', satuanKemasan: 'kg', totalHarga: 15000 }, 'g'),
    ).toBeNull();
    expect(
      pratinjauHarga({ jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: null }, 'g'),
    ).toBeNull();
    expect(
      pratinjauHarga({ jumlahKemasan: '0', satuanKemasan: 'kg', totalHarga: 15000 }, 'g'),
    ).toBeNull();
    expect(
      pratinjauHarga({ jumlahKemasan: 'x', satuanKemasan: 'kg', totalHarga: 15000 }, 'g'),
    ).toBeNull();
    expect(
      pratinjauHarga({ jumlahKemasan: '1', satuanKemasan: 'l', totalHarga: 15000 }, 'g'),
    ).toBeNull();
  });
});
