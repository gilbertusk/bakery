import type { MetodeHarga } from '@/db/schema';
import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { positif, tidakNegatif } from './_validasi';

/** PRD §7.2: total harga ÷ qty dalam satuan dasar. */
export function hargaPerSatuanDasar(totalHarga: NilaiAngka, qtyDasar: NilaiAngka): Decimal {
  const total = tidakNegatif(totalHarga, 'Harga tidak boleh negatif');
  return total.div(positif(qtyDasar, 'Jumlah harus lebih dari 0'));
}

export type InputHargaBaru = {
  metode: MetodeHarga;
  stokLama: NilaiAngka;
  hargaLama: NilaiAngka;
  qtyBeli: NilaiAngka;
  hargaBeli: NilaiAngka;
};

/**
 * PRD §7.8. Rata-rata tertimbang memakai `max(stokLama, 0)` agar stok minus tidak membuat
 * pembagi nol/negatif. Metode terakhir = harga beli.
 */
export function hargaBaruBahan(input: InputHargaBaru): Decimal {
  const qtyBeli = positif(input.qtyBeli, 'Jumlah beli harus lebih dari 0');
  const hargaBeli = tidakNegatif(input.hargaBeli, 'Harga tidak boleh negatif');
  const hargaLama = tidakNegatif(input.hargaLama, 'Harga tidak boleh negatif');

  if (input.metode === 'terakhir') return hargaBeli;

  const stokEfektif = D(input.stokLama).lt(0) ? D(0) : D(input.stokLama);
  return stokEfektif.times(hargaLama).plus(qtyBeli.times(hargaBeli)).div(stokEfektif.plus(qtyBeli));
}
