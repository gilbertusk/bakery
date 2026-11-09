import { describe, expect, it } from 'vitest';

import { PesanError } from '@/lib/error';

import * as hpp from './index';

describe('@/lib/hpp', () => {
  it('mengekspor semua fungsi hitung', () => {
    for (const nama of [
      'keSatuanDasar',
      'kemasanKeDasar',
      'hargaPerSatuanDasar',
      'hargaBaruBahan',
      'biayaAdonan',
      'hasilOtomatis',
      'hitungMargin',
      'saranHarga',
      'faktorSkala',
      'skalakanItems',
      'hitungHppProduk',
      'alokasiProduksi',
      'pemakaianBahanProduksi',
      'kebutuhanUntukPesanan',
      'hitungHppSemua',
      'simulasiKenaikan',
      'simulasiBiayaTambahan',
      'hppAddOn',
      'hitungItemDenganAddOn',
      'kebutuhanBahanAddOn',
    ]) {
      expect(typeof hpp[nama as keyof typeof hpp], nama).toBe('function');
    }
  });

  it('HitungError adalah PesanError sehingga pesannya tampil ke pengguna', () => {
    const galat = new hpp.HitungError('Hasil adonan harus lebih dari 0');
    expect(galat).toBeInstanceOf(PesanError);
    expect(galat.name).toBe('HitungError');
  });
});
