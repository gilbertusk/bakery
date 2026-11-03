import type { SatuanDasar } from '@/db/schema';
import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { positif, tidakNegatif } from './_validasi';
import { HitungError } from './error';

export type SatuanKemasan = 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'lusin';

/** Isi satu satuan kemasan dalam satuan dasar yang cocok. */
const ISI_KEMASAN: Record<SatuanKemasan, { dasar: SatuanDasar; isi: string }> = {
  kg: { dasar: 'g', isi: '1000' },
  g: { dasar: 'g', isi: '1' },
  l: { dasar: 'ml', isi: '1000' },
  ml: { dasar: 'ml', isi: '1' },
  lusin: { dasar: 'pcs', isi: '12' },
  pcs: { dasar: 'pcs', isi: '1' },
};

/** PRD §7.1: takaran × nilai konversi. `null` = takaran sudah dalam satuan dasar. */
export function keSatuanDasar(takaran: NilaiAngka, nilaiKonversi: NilaiAngka | null): Decimal {
  const t = tidakNegatif(takaran, 'Takaran tidak boleh negatif');
  if (nilaiKonversi === null) return t;
  return t.times(positif(nilaiKonversi, 'Nilai konversi harus lebih dari 0'));
}

/** Jumlah kemasan pembelian → satuan dasar bahan. 1 kg = 1.000 g, 1 l = 1.000 ml, 1 lusin = 12 pcs. */
export function kemasanKeDasar(
  jumlah: NilaiAngka,
  satuanKemasan: SatuanKemasan,
  satuanDasar: SatuanDasar,
): Decimal {
  const kemasan = ISI_KEMASAN[satuanKemasan];
  if (kemasan.dasar !== satuanDasar) {
    throw new HitungError('Satuan kemasan tidak cocok dengan satuan dasar');
  }
  return positif(jumlah, 'Jumlah kemasan harus lebih dari 0').times(D(kemasan.isi));
}
