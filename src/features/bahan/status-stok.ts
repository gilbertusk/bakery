import { D, type NilaiAngka } from '@/lib/angka';

export type StatusStok = 'aman' | 'menipis' | 'minus';

export type FilterStok = 'semua' | 'menipis' | 'minus';

/** F-STK-06: minus bila < 0, menipis bila ≤ stok minimal. */
export function statusStok(stok: NilaiAngka, stokMinimal: NilaiAngka): StatusStok {
  const s = D(stok);
  if (s.lt(0)) return 'minus';
  return s.lte(D(stokMinimal)) ? 'menipis' : 'aman';
}

/** Baca `?stok=` dari URL; nilai tidak dikenal kembali ke `semua`. */
export function bacaFilterStok(nilai: string | string[] | undefined): FilterStok {
  return nilai === 'menipis' || nilai === 'minus' ? nilai : 'semua';
}
