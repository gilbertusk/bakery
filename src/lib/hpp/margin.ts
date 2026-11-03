import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { positif, tidakNegatif } from './_validasi';
import { HitungError } from './error';

/** PRD §7.5. `marginPersen` berupa pecahan (0,36 = 36%), null bila harga jual 0. */
export function hitungMargin(
  hpp: NilaiAngka,
  hargaJual: NilaiAngka,
): { marginRp: Decimal; marginPersen: Decimal | null } {
  const harga = tidakNegatif(hargaJual, 'Harga jual tidak boleh negatif');
  const marginRp = harga.minus(D(hpp));
  return { marginRp, marginPersen: harga.isZero() ? null : marginRp.div(harga) };
}

/** PRD §7.5: HPP ÷ (1 − target), dibulatkan KE ATAS ke kelipatan (default Rp500). */
export function saranHarga(hpp: NilaiAngka, targetMargin: NilaiAngka, kelipatan = 500): number {
  const h = tidakNegatif(hpp, 'HPP tidak boleh negatif');
  const target = D(targetMargin);
  if (target.lt(0) || target.gte(1)) {
    throw new HitungError('Target margin harus 0% sampai di bawah 100%');
  }
  const k = positif(kelipatan, 'Kelipatan pembulatan harus lebih dari 0');
  return h.div(D(1).minus(target)).div(k).ceil().times(k).toNumber();
}
