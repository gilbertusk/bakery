import { describe, expect, it } from 'vitest';

import {
  formatAngka,
  formatRupiah,
  formatRupiahDesimal,
  formatTakaran,
  formatTanggal,
  formatWaktu,
  hariIniWib,
  parseRupiah,
  rentangHariWib,
  tanggalWib,
} from './format';

describe('formatRupiah', () => {
  it.each([
    [15000, 'Rp15.000'],
    [0, 'Rp0'],
    [1250000, 'Rp1.250.000'],
    [-15000, '-Rp15.000'],
    ['2675.5', 'Rp2.676'],
  ])('%s → %s', (nilai, hasil) => {
    expect(formatRupiah(nilai)).toBe(hasil);
  });

  it('tidak menampilkan -Rp0 untuk nilai kecil negatif', () => {
    expect(formatRupiah('-0.2')).toBe('Rp0');
  });
});

describe('formatRupiahDesimal', () => {
  it('menampilkan desimal dengan koma', () => {
    expect(formatRupiahDesimal('13.5', 2)).toBe('Rp13,50');
    expect(formatRupiahDesimal('1234567.891', 2)).toBe('Rp1.234.567,89');
    expect(formatRupiahDesimal('15', 0)).toBe('Rp15');
    expect(formatRupiahDesimal('-13.505', 2)).toBe('-Rp13,51');
  });

  it('memakai 2 desimal sebagai default', () => {
    expect(formatRupiahDesimal('15.0000')).toBe('Rp15,00');
  });
});

describe('formatAngka', () => {
  it('membuang nol di belakang koma', () => {
    expect(formatAngka('1200.500')).toBe('1.200,5');
    expect(formatAngka('36.000')).toBe('36');
    expect(formatAngka('0.125')).toBe('0,125');
    expect(formatAngka(-2500)).toBe('-2.500');
  });

  it('membatasi jumlah desimal', () => {
    expect(formatAngka('1.23456', 2)).toBe('1,23');
  });
});

describe('formatTakaran', () => {
  it('menggabungkan angka dan satuan', () => {
    expect(formatTakaran('36', 'g')).toBe('36 g');
    expect(formatTakaran('1200.500', 'ml')).toBe('1.200,5 ml');
  });
});

describe('parseRupiah', () => {
  it.each([
    ['15.000', 15000],
    ['15000', 15000],
    ['Rp 15.000', 15000],
    ['Rp15.000', 15000],
    ['rp 1.250.000', 1250000],
    ['  7.500  ', 7500],
    ['15.000,00', 15000],
    ['0', 0],
  ])('%j → %d', (masuk, hasil) => {
    expect(parseRupiah(masuk)).toBe(hasil);
  });

  it.each(['', 'abc', '15.00', '1.5', '15,5', '-5000', '15.000.0', 'Rp', '1 000', '12a'])(
    'menolak %j',
    (masuk) => {
      expect(parseRupiah(masuk)).toBeNull();
    },
  );
});

describe('tanggal dan waktu WIB', () => {
  it('formatTanggal memakai zona WIB', () => {
    expect(formatTanggal(new Date('2026-11-03T07:05:00Z'))).toBe('3 Nov 2026');
  });

  it('jam 00.30 WIB masih tanggal sebelumnya di UTC, tetapi tampil tanggal WIB', () => {
    const waktu = new Date('2026-11-02T17:30:00Z'); // 3 Nov 2026 00.30 WIB
    expect(waktu.getUTCDate()).toBe(2);
    expect(formatTanggal(waktu)).toBe('3 Nov 2026');
    expect(formatWaktu(waktu)).toBe('3 Nov 2026 00.30');
    expect(tanggalWib(waktu)).toBe('2026-11-03');
    expect(hariIniWib(waktu)).toBe('2026-11-03');
  });

  it('formatTanggal menerima string kolom date apa adanya', () => {
    expect(formatTanggal('2026-11-03')).toBe('3 Nov 2026');
  });

  it('formatWaktu menampilkan jam 24 dengan titik', () => {
    expect(formatWaktu(new Date('2026-11-03T07:05:00Z'))).toBe('3 Nov 2026 14.05');
    expect(formatWaktu('2026-11-03T15:59:00Z')).toBe('3 Nov 2026 22.59');
  });

  it('rentangHariWib mengembalikan batas UTC hari WIB (selesai eksklusif)', () => {
    const { mulai, selesai } = rentangHariWib('2026-11-03');
    expect(mulai.toISOString()).toBe('2026-11-02T17:00:00.000Z');
    expect(selesai.toISOString()).toBe('2026-11-03T17:00:00.000Z');
  });

  it('rentangHariWib melewati akhir bulan dan tahun', () => {
    expect(rentangHariWib('2026-12-31').selesai.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    expect(rentangHariWib('2026-03-01').mulai.toISOString()).toBe('2026-02-28T17:00:00.000Z');
  });

  it('rentangHariWib menolak tanggal tidak valid', () => {
    expect(() => rentangHariWib('2026-13-01')).toThrow();
    expect(() => rentangHariWib('2026-02-30')).toThrow();
    expect(() => rentangHariWib('3/11/2026')).toThrow();
  });

  it('hariIniWib default memakai waktu sekarang', () => {
    expect(hariIniWib()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
