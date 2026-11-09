import 'server-only';

import { asc, eq, inArray, sql } from 'drizzle-orm';

import { type Db, type Tx } from '@/db/client';
import {
  bahan,
  biayaTambahan,
  pengaturanToko,
  produk,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
} from '@/db/schema';
import { D, type Decimal, type NilaiAngka } from '@/lib/angka';
import { biayaAdonan } from '@/lib/hpp/adonan';
import { hitungMargin, saranHarga } from '@/lib/hpp/margin';
import { hitungHppProduk } from '@/lib/hpp/produk';
import { hitungHppSemua } from '@/lib/hpp/simulasi';
import type { KonteksHpp } from '@/lib/hpp/simulasi';
import type { RincianHpp } from '@/lib/hpp/produk';

type Klien = Db | Tx;

export type HppRingkasanProduk = {
  hpp: Decimal;
  marginRp: Decimal;
  marginPersen: Decimal | null;
  target: Decimal;
  diBawahTarget: boolean;
  saranHarga: number;
  rincian: RincianHpp;
};

type KomponenKonteks =
  | { jenis: 'adonan'; resepId: string; gramPerPcs: NilaiAngka }
  | {
      jenis: 'bahan';
      peran: Extract<
        (typeof produkKomponen.$inferSelect)['peran'],
        'topping' | 'filling' | 'kemasan' | 'lainnya'
      >;
      bahanId: string;
      takaranDasar: NilaiAngka;
    };

/** Muat data mentah HPP dalam ≤ 5 query, tanpa N+1. */
export async function ambilKonteksHpp(
  klien: Klien,
  { produkIds }: { produkIds?: string[] } = {},
): Promise<KonteksHpp> {
  // Query 1: produk
  const daftarProduk = await klien
    .select({
      id: produk.id,
      nama: produk.nama,
      hargaJual: produk.hargaJual,
      targetMargin: sql<string>`coalesce(
        ${produk.targetMargin},
        (select ${pengaturanToko.targetMarginDefault}
         from ${pengaturanToko}
         where ${pengaturanToko.id} = 1),
        '0.3000'
      )`,
    })
    .from(produk)
    .where(produkIds?.length ? inArray(produk.id, produkIds) : sql`true`)
    .orderBy(asc(produk.nama));

  if (daftarProduk.length === 0) {
    return { bahan: [], resep: [], produk: [] };
  }

  const idsProduk = daftarProduk.map((p) => p.id);

  // Query 2: komponen produk dengan join resep dan bahan
  const komponenBaris = await klien
    .select({
      produkId: produkKomponen.produkId,
      peran: produkKomponen.peran,
      resepAdonanId: produkKomponen.resepAdonanId,
      bahanId: produkKomponen.bahanId,
      takaranDasar: produkKomponen.takaranDasar,
    })
    .from(produkKomponen)
    .leftJoin(resepAdonan, eq(resepAdonan.id, produkKomponen.resepAdonanId))
    .leftJoin(bahan, eq(bahan.id, produkKomponen.bahanId))
    .where(inArray(produkKomponen.produkId, idsProduk));

  const resepIdsSet = new Set<string>();
  for (const k of komponenBaris) {
    if (k.resepAdonanId) resepIdsSet.add(k.resepAdonanId);
  }
  const resepIds = [...resepIdsSet];

  // Query 3: resep dengan item dan bahan
  const resepMap = new Map<
    string,
    {
      id: string;
      nama: string;
      hasilGram: string;
      items: { bahanId: string; takaranDasar: string }[];
    }
  >();
  if (resepIds.length > 0) {
    const resepItemBaris = await klien
      .select({
        id: resepAdonan.id,
        nama: resepAdonan.nama,
        hasilGram: resepAdonan.hasilGram,
        itemBahanId: resepAdonanItem.bahanId,
        itemTakaranDasar: resepAdonanItem.takaranDasar,
      })
      .from(resepAdonan)
      .innerJoin(resepAdonanItem, eq(resepAdonanItem.resepAdonanId, resepAdonan.id))
      .where(inArray(resepAdonan.id, resepIds))
      .orderBy(asc(resepAdonan.nama), asc(resepAdonanItem.urutan));

    for (const baris of resepItemBaris) {
      let entri = resepMap.get(baris.id);
      if (!entri) {
        entri = { id: baris.id, nama: baris.nama, hasilGram: baris.hasilGram, items: [] };
        resepMap.set(baris.id, entri);
      }
      entri.items.push({ bahanId: baris.itemBahanId, takaranDasar: baris.itemTakaranDasar });
    }
  }

  // Query 4: semua bahan dengan harga per satuan
  const daftarBahan = await klien
    .select({
      id: bahan.id,
      nama: bahan.nama,
      hargaPerSatuan: bahan.hargaPerSatuan,
    })
    .from(bahan)
    .orderBy(asc(bahan.nama));

  // Query 5: biaya tambahan aktif
  const daftarBiayaTambahan = await klien
    .select({
      produkId: biayaTambahan.produkId,
      nama: biayaTambahan.nama,
      metode: biayaTambahan.metode,
      nilai: biayaTambahan.nilai,
    })
    .from(biayaTambahan)
    .where(eq(biayaTambahan.aktif, true))
    .orderBy(asc(biayaTambahan.nama));

  const biayaByProdukId = new Map<string, Array<{ nama: string; metode: string; nilai: string }>>();
  for (const b of daftarBiayaTambahan) {
    const daftar = biayaByProdukId.get(b.produkId ?? '') ?? [];
    daftar.push({ nama: b.nama, metode: b.metode, nilai: b.nilai });
    biayaByProdukId.set(b.produkId ?? '', daftar);
  }

  const produkKonteks = daftarProduk.map((p) => {
    const komponen = komponenBaris
      .filter((k) => k.produkId === p.id)
      .map((k) => {
        if (k.resepAdonanId) {
          return {
            jenis: 'adonan' as const,
            resepId: k.resepAdonanId,
            gramPerPcs: k.takaranDasar,
          } as KomponenKonteks;
        }
        return {
          jenis: 'bahan' as const,
          peran: k.peran,
          bahanId: k.bahanId!,
          takaranDasar: k.takaranDasar,
        } as KomponenKonteks;
      });

    return {
      id: p.id,
      nama: p.nama,
      hargaJual: p.hargaJual,
      targetMargin: D(p.targetMargin),
      komponen,
      biayaTambahan: [...(biayaByProdukId.get('') ?? []), ...(biayaByProdukId.get(p.id) ?? [])].map(
        (b) => ({
          nama: b.nama,
          metode: b.metode as 'per_pcs' | 'persen' | 'per_batch',
          nilai: b.nilai,
        }),
      ),
    };
  });

  return {
    bahan: daftarBahan.map((b) => ({
      id: b.id,
      nama: b.nama,
      hargaPerSatuan: b.hargaPerSatuan,
    })),
    resep: [...resepMap.values()],
    produk: produkKonteks,
  };
}

/** Hitung RincianHpp untuk satu produk dari konteks. */
export function hitungHppProdukDariKonteks(
  konteks: KonteksHpp,
  produkId: string,
): RincianHpp | null {
  const entri = konteks.produk.find((p) => p.id === produkId);
  if (!entri) return null;

  const bahanMap = new Map(
    konteks.bahan.map((b) => [b.id, { nama: b.nama, harga: D(b.hargaPerSatuan) }]),
  );
  const resepMap = new Map<string, { nama: string; hasilGram: string; biayaPerGram: Decimal }>();
  for (const r of konteks.resep) {
    const items = r.items.map((i) => ({
      takaranDasar: i.takaranDasar,
      hargaPerSatuan: bahanMap.get(i.bahanId)?.harga ?? D(0),
    }));
    const { biayaPerGram } = biayaAdonan({ items, hasilGram: r.hasilGram });
    resepMap.set(r.id, { nama: r.nama, hasilGram: String(r.hasilGram), biayaPerGram });
  }

  const komponen = entri.komponen.map((k) => {
    if (k.jenis === 'adonan') {
      const r = resepMap.get(k.resepId);
      if (!r) throw new Error(`Resep ${k.resepId} tidak ditemukan`);
      return {
        jenis: 'adonan' as const,
        resepId: k.resepId,
        namaResep: r.nama,
        gramPerPcs: k.gramPerPcs,
        biayaPerGram: r.biayaPerGram,
        hasilGram: r.hasilGram,
      };
    }
    const infoBahan = bahanMap.get(k.bahanId!);
    if (!infoBahan) throw new Error(`Bahan ${k.bahanId} tidak ditemukan`);
    return {
      jenis: 'bahan' as const,
      peran: k.peran,
      bahanId: k.bahanId!,
      namaBahan: infoBahan.nama,
      takaranDasar: k.takaranDasar,
      hargaPerSatuan: infoBahan.harga,
    };
  });

  return hitungHppProduk({
    komponen,
    biayaTambahan: entri.biayaTambahan,
  });
}

/** Ringkasan HPP + margin untuk semua produk (atau subset via opsi.produkIds). */
export async function hppSemuaProduk(
  klien: Klien,
  opsi: { produkIds?: string[] } = {},
): Promise<Map<string, HppRingkasanProduk>> {
  const konteks = await ambilKonteksHpp(klien, opsi);
  const rincian = hitungHppSemua(konteks);

  const hasil = new Map<string, HppRingkasanProduk>();
  for (const p of konteks.produk) {
    const r = rincian.get(p.id);
    if (!r) continue;

    const target = D(p.targetMargin);
    const { marginRp, marginPersen } = hitungMargin(r.hpp, p.hargaJual as NilaiAngka);
    const diBawahTarget = marginPersen === null || marginPersen.lt(target);
    const saran = saranHarga(r.hpp, target as NilaiAngka);

    hasil.set(p.id, {
      hpp: r.hpp,
      marginRp,
      marginPersen,
      target,
      diBawahTarget,
      saranHarga: saran,
      rincian: r,
    });
  }
  return hasil;
}

/** HPP dalam 2 desimal untuk snapshot transaksi (kasir & produksi). */
export async function hppUntukSnapshot(
  klien: Klien,
  produkIds: string[],
): Promise<Map<string, string>> {
  if (produkIds.length === 0) return new Map();
  const ringkasan = await hppSemuaProduk(klien, { produkIds });
  const hasil = new Map<string, string>();
  for (const [id, r] of ringkasan) {
    hasil.set(id, r.hpp.toDecimalPlaces(2).toFixed());
  }
  return hasil;
}
