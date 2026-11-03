import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { HitungError } from './error';

export function positif(nilai: NilaiAngka, pesan: string): Decimal {
  const d = D(nilai);
  if (!d.gt(0)) throw new HitungError(pesan);
  return d;
}

export function tidakNegatif(nilai: NilaiAngka, pesan: string): Decimal {
  const d = D(nilai);
  if (d.lt(0)) throw new HitungError(pesan);
  return d;
}
