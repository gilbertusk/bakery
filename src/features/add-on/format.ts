import { D, type NilaiAngka } from '@/lib/angka';
import { formatAngka, formatRupiah, formatTakaran } from '@/lib/format';

/** "Rp800 (26,67%)"; tanpa persen bila harga 0. */
export function teksMargin(marginRp: NilaiAngka, marginPersen: NilaiAngka | null): string {
  const rupiah = formatRupiah(marginRp);
  return marginPersen === null
    ? rupiah
    : `${rupiah} (${formatAngka(D(marginPersen).times(100), 2)}%)`;
}

/** "Keju cheddar 20 g". */
export function teksBahanAddOn(addOn: { namaBahan: string; takaran: string; satuan: string }) {
  return `${addOn.namaBahan} ${formatTakaran(addOn.takaran, addOn.satuan)}`;
}
