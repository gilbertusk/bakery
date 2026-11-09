import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { positif, tidakNegatif } from './_validasi';
import { HitungError } from './error';

export type AddOnItem = {
  addOnId: string;
  /** Harga per pcs yang dipakai (boleh diubah kasir). */
  harga: number;
  /** Harga normal dari master saat transaksi. */
  hargaNormal: number;
  hppSatuan: NilaiAngka;
};

export type DiskonItem = { jenis: 'rp' | 'persen'; nilai: NilaiAngka };

export type HasilItemAddOn = {
  hargaPerPcs: number;
  subtotalSebelumDiskon: number;
  diskonRp: number;
  subtotal: number;
  hppAddOnPerPcs: Decimal;
  /** qty × Σ(harga − hargaNormal); negatif bila kasir memberi harga lebih murah. */
  selisihHarga: number;
};

function bulatTidakNegatif(nilai: NilaiAngka, pesan: string): number {
  const d = D(nilai);
  if (d.lt(0) || !d.isInteger()) throw new HitungError(pesan);
  return d.toNumber() + 0;
}

/** PRD §7.12: HPP add-on per pcs = takaran dasar × harga per satuan bahan, tanpa overhead. */
export function hppAddOn({
  takaranDasar,
  hargaPerSatuan,
}: {
  takaranDasar: NilaiAngka;
  hargaPerSatuan: NilaiAngka;
}): Decimal {
  const takaran = positif(takaranDasar, 'Takaran add-on harus lebih dari 0');
  return takaran.times(tidakNegatif(hargaPerSatuan, 'Harga bahan tidak boleh negatif'));
}

function diskonKeRupiah(diskon: DiskonItem, subtotal: number): number {
  if (diskon.jenis === 'rp') {
    return bulatTidakNegatif(diskon.nilai, 'Diskon rupiah harus bilangan bulat ≥ 0');
  }
  const persen = D(diskon.nilai);
  if (persen.lt(0) || persen.gt(100)) throw new HitungError('Diskon persen harus 0 sampai 100');
  return persen.times(subtotal).div(100).floor().toNumber() + 0;
}

/**
 * PRD §7.12: harga per pcs = harga produk + Σ harga add-on; diskon berlaku untuk seluruh baris
 * termasuk add-on. Diskon persen dibulatkan ke bawah.
 */
export function hitungItemDenganAddOn({
  qty,
  hargaSatuan,
  addOns,
  diskon,
}: {
  qty: number;
  hargaSatuan: number;
  addOns: readonly AddOnItem[];
  diskon: DiskonItem;
}): HasilItemAddOn {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new HitungError('Jumlah harus bilangan bulat lebih dari 0');
  }
  const hargaProduk = bulatTidakNegatif(hargaSatuan, 'Harga produk harus bilangan bulat ≥ 0');

  const dipilih = new Set<string>();
  let hargaAddOn = 0;
  let selisihPerPcs = 0;
  let hppAddOnPerPcs = D(0);
  for (const addOn of addOns) {
    if (dipilih.has(addOn.addOnId)) {
      throw new HitungError('Add-on yang sama hanya boleh dipilih sekali per item');
    }
    dipilih.add(addOn.addOnId);
    const harga = bulatTidakNegatif(addOn.harga, 'Harga add-on harus bilangan bulat ≥ 0');
    const hargaNormal = bulatTidakNegatif(
      addOn.hargaNormal,
      'Harga normal add-on harus bilangan bulat ≥ 0',
    );
    hppAddOnPerPcs = hppAddOnPerPcs.plus(
      tidakNegatif(addOn.hppSatuan, 'HPP add-on tidak boleh negatif'),
    );
    hargaAddOn += harga;
    selisihPerPcs += harga - hargaNormal;
  }

  const hargaPerPcs = hargaProduk + hargaAddOn;
  const subtotalSebelumDiskon = qty * hargaPerPcs;
  const diskonRp = diskonKeRupiah(diskon, subtotalSebelumDiskon);
  if (diskonRp > subtotalSebelumDiskon) {
    throw new HitungError('Diskon tidak boleh melebihi subtotal');
  }

  return {
    hargaPerPcs,
    subtotalSebelumDiskon,
    diskonRp,
    subtotal: subtotalSebelumDiskon - diskonRp,
    hppAddOnPerPcs,
    selisihHarga: qty * selisihPerPcs + 0,
  };
}

/** Total takaran dasar bahan add-on per bahan: Σ takaran_dasar × qty. Untuk stok kasir & rekap PO. */
export function kebutuhanBahanAddOn(
  items: readonly {
    qty: NilaiAngka;
    addOns: readonly { bahanId: string; takaranDasar: NilaiAngka }[];
  }[],
): Map<string, Decimal> {
  const hasil = new Map<string, Decimal>();
  for (const item of items) {
    const pcs = tidakNegatif(item.qty, 'Jumlah pcs tidak boleh negatif');
    for (const addOn of item.addOns) {
      const qty = tidakNegatif(addOn.takaranDasar, 'Takaran tidak boleh negatif').times(pcs);
      hasil.set(addOn.bahanId, (hasil.get(addOn.bahanId) ?? D(0)).plus(qty));
    }
  }
  return hasil;
}
