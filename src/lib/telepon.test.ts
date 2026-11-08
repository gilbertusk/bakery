import { describe, expect, it } from 'vitest';

import { linkWhatsApp, normalisasiKontak, nomorWhatsApp } from './telepon';

describe('normalisasiKontak', () => {
  it.each([
    ['0812-3456-7890', '6281234567890'],
    ['0812 3456 789', '628123456789'],
    ['+62 812 3456 7890', '6281234567890'],
    ['62812.3456.7890', '6281234567890'],
    ['(0812) 34567890', '6281234567890'],
    ['  081234567  ', '6281234567'],
  ])('nomor HP %s dinormalisasi menjadi %s', (input, hasil) => {
    expect(normalisasiKontak(input)).toEqual({ ok: true, nilai: hasil });
  });

  it.each([
    ['email', 'toko@contoh.id'],
    ['telepon rumah', '021-5551234'],
    ['teks bebas', 'Pak Budi, pasar Kosambi'],
  ])('%s disimpan apa adanya (dirapikan spasinya)', (_jenis, input) => {
    expect(normalisasiKontak(`  ${input} `)).toEqual({ ok: true, nilai: input });
  });

  it.each(['', '   '])('kosong menjadi null', (input) => {
    expect(normalisasiKontak(input)).toEqual({ ok: true, nilai: null });
  });

  it.each(['0812345', '08123456789012345', '+62 8'])(
    'nomor HP %s terlalu pendek/panjang ditolak',
    (input) => {
      expect(normalisasiKontak(input)).toEqual({ ok: false, error: 'Nomor HP tidak valid' });
    },
  );
});

describe('nomorWhatsApp & linkWhatsApp', () => {
  it('kontak nomor HP ternormalisasi menghasilkan link wa.me', () => {
    expect(nomorWhatsApp('6281234567890')).toBe('6281234567890');
    expect(linkWhatsApp('6281234567890')).toBe('https://wa.me/6281234567890');
  });

  it('kontak lama yang belum dinormalisasi tetap dikenali', () => {
    expect(nomorWhatsApp('0812-3456-7890')).toBe('6281234567890');
  });

  it.each([null, '', 'toko@contoh.id', '021-5551234', '0812'])('%s bukan nomor HP', (kontak) => {
    expect(nomorWhatsApp(kontak)).toBeNull();
    expect(linkWhatsApp(kontak)).toBeNull();
  });
});
