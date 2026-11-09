import type { MetodeBiaya } from '@/db/schema';
import { D, type NilaiAngka } from '@/lib/angka';
import { formatAngka } from '@/lib/format';

export const LABEL_METODE: Record<MetodeBiaya, string> = {
  per_pcs: 'Rp per pcs',
  persen: '% dari biaya bahan',
  per_batch: 'Rp per resep/batch',
};

/** "Rp150/pcs", "12,5%", "Rp5.000/resep". Persen disimpan 0–1. */
export function formatNilaiBiaya(metode: MetodeBiaya, nilai: NilaiAngka): string {
  if (metode === 'persen') return `${formatAngka(D(nilai).times(100), 2)}%`;
  return `Rp${formatAngka(nilai)}/${metode === 'per_pcs' ? 'pcs' : 'resep'}`;
}

/** Nilai tersimpan → ketikan form. Persen 0–1 → 0–100. */
export function nilaiUntukForm(metode: MetodeBiaya, nilai: NilaiAngka): string {
  return formatAngka(metode === 'persen' ? D(nilai).times(100) : nilai);
}

/** "Mengubah HPP 12 produk, rata-rata +Rp150/pcs". */
export function kalimatDampak({
  jumlahProduk,
  rataRataSelisih,
}: {
  jumlahProduk: number;
  rataRataSelisih: NilaiAngka;
}): string {
  if (jumlahProduk === 0) return 'Tidak mengubah HPP produk mana pun';
  const rata = D(rataRataSelisih);
  const tanda = rata.lt(0) ? '-' : '+';
  return `Mengubah HPP ${jumlahProduk} produk, rata-rata ${tanda}Rp${formatAngka(rata.abs(), 2)}/pcs`;
}
