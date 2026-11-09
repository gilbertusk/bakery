import type { PeranKomponen } from '@/db/schema';
import { D, type Decimal, type NilaiAngka } from '@/lib/angka';

import { biayaAdonan } from './adonan';
import { HitungError } from './error';
import { hitungMargin } from './margin';
import {
  type InputBiayaTambahan,
  type InputHppProduk,
  type RincianHpp,
  hitungHppProduk,
} from './produk';

/** Data mentah untuk menghitung ulang biaya adonan dan HPP. Diisi oleh query di 1.8. */
export type KonteksHpp = {
  bahan: readonly { id: string; nama: string; hargaPerSatuan: NilaiAngka }[];
  resep: readonly {
    id: string;
    nama: string;
    hasilGram: NilaiAngka;
    items: readonly { bahanId: string; takaranDasar: NilaiAngka }[];
  }[];
  produk: readonly {
    id: string;
    nama: string;
    hargaJual: NilaiAngka;
    /** Target produk, atau default pengaturan bila produk tidak punya. */
    targetMargin: NilaiAngka;
    komponen: readonly (
      | { jenis: 'adonan'; resepId: string; gramPerPcs: NilaiAngka }
      | {
          jenis: 'bahan';
          peran: Exclude<PeranKomponen, 'adonan'>;
          bahanId: string;
          takaranDasar: NilaiAngka;
        }
    )[];
    /** `id` diisi query agar simulasi bisa mengganti biaya yang sedang diubah. */
    biayaTambahan: readonly (InputBiayaTambahan & { id?: string })[];
  }[];
};

type HargaBahan = Map<string, { nama: string; harga: Decimal }>;

/** Rincian HPP tiap produk, urutan sama dengan `konteks.produk`. */
function hitungDenganHarga(konteks: KonteksHpp, bahan: HargaBahan): RincianHpp[] {
  const ambilBahan = (bahanId: string) => {
    const b = bahan.get(bahanId);
    if (!b) throw new HitungError(`Bahan ${bahanId} tidak ditemukan di data hitung`);
    return b;
  };

  const resep = new Map(
    konteks.resep.map((r) => {
      const items = r.items.map((i) => ({
        takaranDasar: i.takaranDasar,
        hargaPerSatuan: ambilBahan(i.bahanId).harga,
      }));
      const { biayaPerGram } = biayaAdonan({ items, hasilGram: r.hasilGram });
      return [r.id, { nama: r.nama, hasilGram: r.hasilGram, biayaPerGram }] as const;
    }),
  );

  return konteks.produk.map((p) => {
    const komponen: InputHppProduk['komponen'] = p.komponen.map((k) => {
      if (k.jenis === 'bahan') {
        const b = ambilBahan(k.bahanId);
        return { ...k, namaBahan: b.nama, hargaPerSatuan: b.harga };
      }
      const r = resep.get(k.resepId);
      if (!r) throw new HitungError(`Resep ${k.resepId} tidak ditemukan di data hitung`);
      return { ...k, namaResep: r.nama, hasilGram: r.hasilGram, biayaPerGram: r.biayaPerGram };
    });
    return hitungHppProduk({ komponen, biayaTambahan: p.biayaTambahan });
  });
}

function hargaSaatIni(konteks: KonteksHpp): HargaBahan {
  return new Map(konteks.bahan.map((b) => [b.id, { nama: b.nama, harga: D(b.hargaPerSatuan) }]));
}

/** Rincian HPP semua produk dengan harga bahan saat ini, per produkId. */
export function hitungHppSemua(konteks: KonteksHpp): Map<string, RincianHpp> {
  const rincian = hitungDenganHarga(konteks, hargaSaatIni(konteks));
  return new Map(konteks.produk.map((p, i) => [p.id, rincian[i] as RincianHpp]));
}

export type DampakSimulasi = {
  produkId: string;
  hppLama: Decimal;
  hppBaru: Decimal;
  selisih: Decimal;
  marginLama: Decimal | null;
  marginBaru: Decimal | null;
  diBawahTarget: boolean;
};

/**
 * F-PRD-07: harga bahan dinaikkan (atau diturunkan bila persen negatif), tanpa menyimpan apa pun.
 * Hanya produk yang HPP-nya berubah, urut selisih menurun.
 */
export function simulasiKenaikan(
  konteks: KonteksHpp,
  perubahan: readonly { bahanId: string; persen: NilaiAngka }[],
): DampakSimulasi[] {
  const hargaLama = hargaSaatIni(konteks);
  const hargaBaru: HargaBahan = new Map(hargaLama);
  for (const { bahanId, persen } of perubahan) {
    const p = D(persen);
    if (p.lt(-100)) throw new HitungError('Penurunan harga maksimal 100%');
    const b = hargaBaru.get(bahanId);
    if (b) hargaBaru.set(bahanId, { ...b, harga: b.harga.times(D(1).plus(p.div(100))) });
  }

  const dampak = bandingkan(
    konteks,
    hitungDenganHarga(konteks, hargaLama),
    hitungDenganHarga(konteks, hargaBaru),
  );
  return dampak.sort((a, b) => b.selisih.comparedTo(a.selisih));
}

export type PerubahanBiayaTambahan = {
  /** Null = biaya baru. */
  id: string | null;
  /** Null = berlaku untuk semua produk. */
  produkId: string | null;
  aktif: boolean;
  biaya: InputBiayaTambahan;
};

/**
 * F-PRD-06: dampak menambah/mengubah satu biaya tambahan, tanpa menyimpan apa pun.
 * Hanya produk yang HPP-nya berubah, urut besar selisih menurun.
 */
export function simulasiBiayaTambahan(
  konteks: KonteksHpp,
  perubahan: PerubahanBiayaTambahan,
): DampakSimulasi[] {
  const sesudah: KonteksHpp = {
    ...konteks,
    produk: konteks.produk.map((p) => {
      const biaya = p.biayaTambahan.filter((b) => perubahan.id === null || b.id !== perubahan.id);
      const berlaku =
        perubahan.aktif && (perubahan.produkId === null || perubahan.produkId === p.id);
      return { ...p, biayaTambahan: berlaku ? [...biaya, perubahan.biaya] : biaya };
    }),
  };

  const harga = hargaSaatIni(konteks);
  const dampak = bandingkan(
    konteks,
    hitungDenganHarga(konteks, harga),
    hitungDenganHarga(sesudah, harga),
  );
  return dampak.sort((a, b) => b.selisih.abs().comparedTo(a.selisih.abs()));
}

function bandingkan(
  konteks: KonteksHpp,
  sebelum: RincianHpp[],
  sesudah: RincianHpp[],
): DampakSimulasi[] {
  const dampak: DampakSimulasi[] = [];
  konteks.produk.forEach((p, i) => {
    const hppLama = (sebelum[i] as RincianHpp).hpp;
    const hppBaru = (sesudah[i] as RincianHpp).hpp;
    if (hppBaru.eq(hppLama)) return;

    const marginBaru = hitungMargin(hppBaru, p.hargaJual).marginPersen;
    dampak.push({
      produkId: p.id,
      hppLama,
      hppBaru,
      selisih: hppBaru.minus(hppLama),
      marginLama: hitungMargin(hppLama, p.hargaJual).marginPersen,
      marginBaru,
      diBawahTarget: marginBaru === null || marginBaru.lt(D(p.targetMargin)),
    });
  });
  return dampak;
}
