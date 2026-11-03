import type { MetodeBiaya, PeranKomponen } from '@/db/schema';
import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { positif, tidakNegatif } from './_validasi';
import { HitungError } from './error';

export type KomponenAdonan = {
  jenis: 'adonan';
  resepId: string;
  namaResep: string;
  gramPerPcs: NilaiAngka;
  biayaPerGram: NilaiAngka;
  hasilGram: NilaiAngka;
};

export type KomponenBahan = {
  jenis: 'bahan';
  peran: Exclude<PeranKomponen, 'adonan'>;
  bahanId: string;
  namaBahan: string;
  takaranDasar: NilaiAngka;
  hargaPerSatuan: NilaiAngka;
};

export type InputBiayaTambahan = { nama: string; metode: MetodeBiaya; nilai: NilaiAngka };

export type InputHppProduk = {
  komponen: readonly (KomponenAdonan | KomponenBahan)[];
  biayaTambahan: readonly InputBiayaTambahan[];
};

export type RincianHpp = {
  perPeran: Record<PeranKomponen, Decimal>;
  perKomponen: { label: string; biaya: Decimal }[];
  biayaBahan: Decimal;
  overhead: { perPcs: Decimal; persen: Decimal; perBatch: Decimal; total: Decimal };
  hpp: Decimal;
  adonanUtama: { resepId: string; pcsPerResep: number } | null;
  peringatan: string[];
};

function rincianKosong(): RincianHpp {
  const nol = D(0);
  return {
    perPeran: { adonan: nol, topping: nol, filling: nol, kemasan: nol, lainnya: nol },
    perKomponen: [],
    biayaBahan: nol,
    overhead: { perPcs: nol, persen: nol, perBatch: nol, total: nol },
    hpp: nol,
    adonanUtama: null,
    peringatan: [],
  };
}

function biayaKomponen(komponen: KomponenAdonan | KomponenBahan): Decimal {
  if (komponen.jenis === 'adonan') {
    positif(komponen.hasilGram, 'Hasil adonan harus lebih dari 0');
    return positif(komponen.gramPerPcs, 'Gram per pcs harus lebih dari 0').times(
      tidakNegatif(komponen.biayaPerGram, 'Biaya tidak boleh negatif'),
    );
  }
  return tidakNegatif(komponen.takaranDasar, 'Takaran tidak boleh negatif').times(
    tidakNegatif(komponen.hargaPerSatuan, 'Harga tidak boleh negatif'),
  );
}

/** Adonan dengan gram per pcs terbesar; bila sama, yang pertama. */
function cariAdonanUtama(komponen: InputHppProduk['komponen']): KomponenAdonan | null {
  let utama: KomponenAdonan | null = null;
  for (const k of komponen) {
    if (k.jenis === 'adonan' && (utama === null || D(k.gramPerPcs).gt(D(utama.gramPerPcs)))) {
      utama = k;
    }
  }
  return utama;
}

/** PRD §7.4 dan F-PRD-03, F-PRD-05, F-PRD-06. */
export function hitungHppProduk(input: InputHppProduk): RincianHpp {
  const rincian = rincianKosong();
  if (input.komponen.length === 0) {
    rincian.peringatan.push('Produk belum punya komponen');
    return rincian;
  }

  for (const komponen of input.komponen) {
    const biaya = biayaKomponen(komponen);
    const peran = komponen.jenis === 'adonan' ? 'adonan' : komponen.peran;
    rincian.perPeran[peran] = rincian.perPeran[peran].plus(biaya);
    rincian.perKomponen.push({
      label: komponen.jenis === 'adonan' ? komponen.namaResep : komponen.namaBahan,
      biaya,
    });
    rincian.biayaBahan = rincian.biayaBahan.plus(biaya);
  }

  let totalPerBatch = D(0);
  let adaPerBatch = false;
  for (const biaya of input.biayaTambahan) {
    const nilai = tidakNegatif(biaya.nilai, 'Biaya tambahan tidak boleh negatif');
    if (biaya.metode === 'per_pcs') {
      rincian.overhead.perPcs = rincian.overhead.perPcs.plus(nilai);
    } else if (biaya.metode === 'persen') {
      if (nilai.gt(1)) throw new HitungError('Persen biaya tambahan maksimal 100%');
      rincian.overhead.persen = rincian.overhead.persen.plus(rincian.biayaBahan.times(nilai));
    } else {
      adaPerBatch = true;
      totalPerBatch = totalPerBatch.plus(nilai);
    }
  }

  const utama = cariAdonanUtama(input.komponen);
  if (utama) {
    const pcsPerResep = D(utama.hasilGram).div(D(utama.gramPerPcs)).floor();
    rincian.adonanUtama = { resepId: utama.resepId, pcsPerResep: pcsPerResep.toNumber() };
    if (pcsPerResep.isZero()) {
      const pesan = `Gram per pcs melebihi hasil resep ${utama.namaResep}`;
      rincian.peringatan.push(adaPerBatch ? `${pesan}. Biaya per batch diabaikan` : pesan);
    } else {
      rincian.overhead.perBatch = totalPerBatch.div(pcsPerResep);
    }
  } else if (adaPerBatch) {
    rincian.peringatan.push('Biaya per batch diabaikan karena produk tidak memakai adonan');
  }

  const { perPcs, persen, perBatch } = rincian.overhead;
  rincian.overhead.total = perPcs.plus(persen).plus(perBatch);
  rincian.hpp = rincian.biayaBahan.plus(rincian.overhead.total);
  return rincian;
}
