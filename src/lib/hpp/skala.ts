import { D, Decimal, type NilaiAngka } from '@/lib/angka';

import { positif } from './_validasi';

export type Loyang =
  { bentuk: 'bulat'; diameter: NilaiAngka } | { bentuk: 'kotak'; p: NilaiAngka; l: NilaiAngka };

export type InputSkala =
  | { jenis: 'manual'; faktor: NilaiAngka }
  | { jenis: 'bulat'; diameterAcuan: NilaiAngka; diameterBaru: NilaiAngka }
  | { jenis: 'kotak'; pAcuan: NilaiAngka; lAcuan: NilaiAngka; pBaru: NilaiAngka; lBaru: NilaiAngka }
  | { jenis: 'campuran'; acuan: Loyang; baru: Loyang };

const PI = Decimal.acos(-1);
const PESAN_UKURAN = 'Ukuran loyang harus lebih dari 0';

function luas(loyang: Loyang): Decimal {
  if (loyang.bentuk === 'kotak') {
    return positif(loyang.p, PESAN_UKURAN).times(positif(loyang.l, PESAN_UKURAN));
  }
  const r = positif(loyang.diameter, PESAN_UKURAN).div(2);
  return PI.times(r.pow(2));
}

/** PRD §7.6. Bulat: (d baru ÷ d acuan)²; kotak: rasio p × l; campuran: rasio luas. */
export function faktorSkala(input: InputSkala): Decimal {
  switch (input.jenis) {
    case 'manual':
      return positif(input.faktor, 'Faktor skala harus lebih dari 0');
    case 'bulat':
      return positif(input.diameterBaru, PESAN_UKURAN)
        .div(positif(input.diameterAcuan, PESAN_UKURAN))
        .pow(2);
    case 'kotak':
      return luas({ bentuk: 'kotak', p: input.pBaru, l: input.lBaru }).div(
        luas({ bentuk: 'kotak', p: input.pAcuan, l: input.lAcuan }),
      );
    case 'campuran':
      return luas(input.baru).div(luas(input.acuan));
  }
}

type ItemTakaran = { takaran: NilaiAngka; takaranDasar: NilaiAngka };

/** Salinan item dengan takaran dan takaran dasar dikali faktor. Item asli tidak diubah. */
export function skalakanItems<T extends ItemTakaran>(
  items: readonly T[],
  faktor: NilaiAngka,
): (Omit<T, 'takaran' | 'takaranDasar'> & { takaran: Decimal; takaranDasar: Decimal })[] {
  const f = positif(faktor, 'Faktor skala harus lebih dari 0');
  return items.map((item) => ({
    ...item,
    takaran: D(item.takaran).times(f),
    takaranDasar: D(item.takaranDasar).times(f),
  }));
}
