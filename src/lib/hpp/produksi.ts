import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { positif, tidakNegatif } from './_validasi';
import { HitungError } from './error';

export type HasilProduksi = {
  produkId: string;
  gramPerPcs: NilaiAngka;
  pcsRencana: NilaiAngka;
  pcsAktual: NilaiAngka;
  biayaBahanLangsungPerPcs: NilaiAngka;
  overheadPerPcs: NilaiAngka;
};

const PESAN_PCS = 'Jumlah pcs tidak boleh negatif';
const PESAN_BIAYA = 'Biaya tidak boleh negatif';

/**
 * PRD §7.7: biaya adonan dibagi sebanding gram rencana (gram per pcs × pcs rencana), lalu
 * HPP aktual = (alokasi + (bahan langsung + overhead) × pcs aktual) ÷ pcs aktual.
 */
export function alokasiProduksi(input: {
  biayaAdonan: NilaiAngka;
  hasil: readonly HasilProduksi[];
}): { produkId: string; alokasiAdonan: Decimal; hppAktual: Decimal | null }[] {
  const biayaAdonan = tidakNegatif(input.biayaAdonan, PESAN_BIAYA);

  const baris = input.hasil.map((h) => ({
    produkId: h.produkId,
    bobot: positif(h.gramPerPcs, 'Gram per pcs harus lebih dari 0').times(
      tidakNegatif(h.pcsRencana, PESAN_PCS),
    ),
    pcsAktual: tidakNegatif(h.pcsAktual, PESAN_PCS),
    biayaPerPcs: tidakNegatif(h.biayaBahanLangsungPerPcs, PESAN_BIAYA).plus(
      tidakNegatif(h.overheadPerPcs, PESAN_BIAYA),
    ),
  }));

  const totalBobot = baris.reduce<Decimal>((total, b) => total.plus(b.bobot), D(0));
  if (totalBobot.isZero()) {
    throw new HitungError('Total gram adonan rencana harus lebih dari 0');
  }

  return baris.map((b) => {
    const alokasiAdonan = biayaAdonan.times(b.bobot).div(totalBobot);
    const hppAktual = b.pcsAktual.isZero()
      ? null
      : alokasiAdonan.plus(b.biayaPerPcs.times(b.pcsAktual)).div(b.pcsAktual);
    return { produkId: b.produkId, alokasiAdonan, hppAktual };
  });
}
