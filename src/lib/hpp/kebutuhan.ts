import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { positif, tidakNegatif } from './_validasi';

export type ItemResep = { bahanId: string; takaranDasar: NilaiAngka };

export type KomponenKebutuhan =
  | {
      jenis: 'adonan';
      resepId: string;
      gramPerPcs: NilaiAngka;
      hasilGram: NilaiAngka;
      items: readonly ItemResep[];
    }
  | { jenis: 'bahan'; bahanId: string; takaranDasar: NilaiAngka };

const PESAN_TAKARAN = 'Takaran tidak boleh negatif';
const PESAN_PCS = 'Jumlah pcs tidak boleh negatif';

function tambah(peta: Map<string, Decimal>, bahanId: string, qty: Decimal) {
  peta.set(bahanId, (peta.get(bahanId) ?? D(0)).plus(qty));
}

function tambahKomponen(peta: Map<string, Decimal>, komponen: KomponenKebutuhan, pcs: Decimal) {
  if (komponen.jenis === 'bahan') {
    tambah(peta, komponen.bahanId, tidakNegatif(komponen.takaranDasar, PESAN_TAKARAN).times(pcs));
    return;
  }
  const porsi = positif(komponen.gramPerPcs, 'Gram per pcs harus lebih dari 0')
    .times(pcs)
    .div(positif(komponen.hasilGram, 'Hasil adonan harus lebih dari 0'));
  for (const item of komponen.items) {
    tambah(peta, item.bahanId, tidakNegatif(item.takaranDasar, PESAN_TAKARAN).times(porsi));
  }
}

/**
 * F-PRO-02: bahan resep utama × skala (sekali), adonan lain proporsional terhadap gram terpakai,
 * bahan langsung × pcs aktual. Hasil per bahanId dalam satuan dasar.
 */
export function pemakaianBahanProduksi(input: {
  resepUtama: { resepId: string; hasilGram: NilaiAngka; items: readonly ItemResep[] };
  faktorSkala: NilaiAngka;
  produk: readonly { pcsAktual: NilaiAngka; komponen: readonly KomponenKebutuhan[] }[];
}): Map<string, Decimal> {
  const faktor = positif(input.faktorSkala, 'Faktor skala harus lebih dari 0');
  const peta = new Map<string, Decimal>();

  for (const item of input.resepUtama.items) {
    tambah(peta, item.bahanId, tidakNegatif(item.takaranDasar, PESAN_TAKARAN).times(faktor));
  }
  for (const p of input.produk) {
    const pcs = tidakNegatif(p.pcsAktual, PESAN_PCS);
    for (const komponen of p.komponen) {
      if (komponen.jenis === 'adonan' && komponen.resepId === input.resepUtama.resepId) continue;
      tambahKomponen(peta, komponen, pcs);
    }
  }
  return peta;
}

/** Kebutuhan bahan untuk sejumlah pesanan: semua adonan proporsional (rekap PO). */
export function kebutuhanUntukPesanan(
  produk: readonly { qty: NilaiAngka; komponen: readonly KomponenKebutuhan[] }[],
): Map<string, Decimal> {
  const peta = new Map<string, Decimal>();
  for (const p of produk) {
    const qty = tidakNegatif(p.qty, PESAN_PCS);
    for (const komponen of p.komponen) tambahKomponen(peta, komponen, qty);
  }
  return peta;
}
