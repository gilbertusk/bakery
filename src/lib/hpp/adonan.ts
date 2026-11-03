import type { SatuanDasar } from '@/db/schema';
import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { positif, tidakNegatif } from './_validasi';

export type ItemBiaya = { takaranDasar: NilaiAngka; hargaPerSatuan: NilaiAngka };

/** PRD §7.3: biaya total = Σ takaran dasar × harga; biaya per gram = total ÷ hasil gram. */
export function biayaAdonan(input: { items: readonly ItemBiaya[]; hasilGram: NilaiAngka }): {
  biayaTotal: Decimal;
  biayaPerGram: Decimal;
} {
  const hasilGram = positif(input.hasilGram, 'Hasil adonan harus lebih dari 0');
  const biayaTotal = input.items.reduce<Decimal>((total, item) => {
    const takaran = tidakNegatif(item.takaranDasar, 'Takaran tidak boleh negatif');
    const harga = tidakNegatif(item.hargaPerSatuan, 'Harga tidak boleh negatif');
    return total.plus(takaran.times(harga));
  }, D(0));

  return { biayaTotal, biayaPerGram: biayaTotal.div(hasilGram) };
}

export type ItemHasil = { takaranDasar: NilaiAngka; satuanDasar: SatuanDasar; namaBahan: string };

/**
 * F-RSP-02 KP1: hasil adonan otomatis. g dihitung, ml dihitung 1:1 dengan peringatan,
 * pcs tidak dihitung dan disarankan mode timbang.
 */
export function hasilOtomatis(items: readonly ItemHasil[]): {
  hasilGram: Decimal;
  peringatan: string[];
} {
  let hasilGram = D(0);
  const bahanMl: string[] = [];
  const bahanPcs: string[] = [];

  for (const item of items) {
    if (item.satuanDasar === 'pcs') {
      bahanPcs.push(item.namaBahan);
      continue;
    }
    if (item.satuanDasar === 'ml') bahanMl.push(item.namaBahan);
    hasilGram = hasilGram.plus(tidakNegatif(item.takaranDasar, 'Takaran tidak boleh negatif'));
  }

  const peringatan: string[] = [];
  if (bahanMl.length > 0) peringatan.push(`${bahanMl.join(', ')} diasumsikan 1 ml = 1 g`);
  if (bahanPcs.length > 0) {
    peringatan.push(
      `${bahanPcs.join(', ')} (pcs) tidak ikut terhitung. Gunakan mode timbang agar hasil adonan akurat`,
    );
  }
  return { hasilGram, peringatan };
}
