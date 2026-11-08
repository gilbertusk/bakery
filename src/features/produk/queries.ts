import 'server-only';

import { asc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { bahan, konversiSatuan, produk, produkKomponen, resepAdonan } from '@/db/schema';
import { D } from '@/lib/angka';
import { ambilBiayaResep, pilihanBahan as pilihanBahanResep } from '@/features/resep/queries';
import { hppSemuaProduk } from '@/features/hpp/queries';

export type KomponenProdukTampil = {
  id: string;
  jenis: 'adonan' | 'bahan';
  peran: (typeof produkKomponen.$inferSelect)['peran'];
  resepAdonanId: string | null;
  bahanId: string | null;
  namaResep: string | null;
  namaBahan: string | null;
  satuanDasar: (typeof bahan.$inferSelect)['satuanDasar'] | null;
  namaSatuan: string | null;
  takaran: string | null;
  gramPerPcs: string | null;
  takaranDasar: string;
  konversi: Array<{ id: string; namaSatuan: string; nilaiDasar: string }>;
  biayaPerPcs: string;
};

export type DetailProduk = {
  id: string;
  nama: string;
  kategori: string;
  cetakan: string | null;
  hargaJual: number;
  targetMargin: string | null;
  stok: number;
  fotoUrl: string | null;
  dijual: boolean;
  aktif: boolean;
  komponen: KomponenProdukTampil[];
};

export type BarisProduk = {
  id: string;
  nama: string;
  kategori: string;
  cetakan: string | null;
  hargaJual: number;
  stok: number;
  fotoUrl: string | null;
  dijual: boolean;
  aktif: boolean;
  hpp: string;
  marginRp: string;
  marginPersen: string;
  target: string;
  diBawahTarget: boolean;
  saranHarga: number;
};

export async function daftarProduk({
  q,
  kategori,
  dijual,
  aktif,
  marginDiBawahTarget,
}: {
  q?: string;
  kategori?: string;
  dijual?: boolean;
  aktif?: boolean;
  marginDiBawahTarget?: boolean;
}): Promise<BarisProduk[]> {
  const syarat = [];
  if (q) syarat.push(sql`lower(${produk.nama}) LIKE ${'%' + q.toLowerCase() + '%'}`);
  if (kategori) syarat.push(eq(produk.kategori, kategori));
  if (dijual !== undefined) syarat.push(eq(produk.dijual, dijual));
  if (aktif !== undefined) syarat.push(eq(produk.aktif, aktif));

  const data = await db
    .select({
      id: produk.id,
      nama: produk.nama,
      kategori: produk.kategori,
      cetakan: produk.cetakan,
      hargaJual: produk.hargaJual,
      stok: produk.stok,
      fotoUrl: produk.fotoUrl,
      dijual: produk.dijual,
      aktif: produk.aktif,
    })
    .from(produk)
    .where(syarat.length ? sql.join(syarat, sql` AND `) : undefined)
    .orderBy(asc(sql`lower(${produk.nama})`), asc(produk.id));

  if (data.length === 0) return [];

  const hpp = await hppSemuaProduk(db, {
    produkIds: data.map((item) => item.id),
  });

  const hasil = data.map((item) => {
    const ringkasan = hpp.get(item.id);
    return {
      ...item,
      hargaJual: Number(item.hargaJual),
      stok: Number(item.stok),
      hpp: ringkasan?.hpp.toString() ?? '0',
      marginRp: ringkasan?.marginRp.toString() ?? '0',
      marginPersen: ringkasan?.marginPersen?.toFixed(4) ?? '0',
      target: ringkasan?.target.toFixed(4) ?? '0.3000',
      diBawahTarget: ringkasan?.diBawahTarget ?? false,
      saranHarga: ringkasan?.saranHarga ?? 0,
    };
  });

  if (marginDiBawahTarget) {
    return hasil.filter((item) => item.diBawahTarget);
  }
  return hasil;
}

export async function detailProduk(id: string): Promise<DetailProduk | null> {
  const [produkBaris] = await db.select().from(produk).where(eq(produk.id, id));
  if (!produkBaris) return null;

  const baris = await db
    .select({
      id: produkKomponen.id,
      peran: produkKomponen.peran,
      resepAdonanId: produkKomponen.resepAdonanId,
      bahanId: produkKomponen.bahanId,
      namaResep: resepAdonan.nama,
      namaBahan: bahan.nama,
      satuanDasar: bahan.satuanDasar,
      namaSatuan: konversiSatuan.namaSatuan,
      takaran: produkKomponen.takaran,
      gramPerPcs: produkKomponen.takaran,
      takaranDasar: produkKomponen.takaranDasar,
      konversiId: konversiSatuan.id,
      konversiNama: konversiSatuan.namaSatuan,
      konversiNilai: konversiSatuan.nilaiDasar,
    })
    .from(produkKomponen)
    .leftJoin(resepAdonan, eq(resepAdonan.id, produkKomponen.resepAdonanId))
    .leftJoin(bahan, eq(bahan.id, produkKomponen.bahanId))
    .leftJoin(konversiSatuan, eq(konversiSatuan.id, produkKomponen.konversiSatuanId))
    .where(eq(produkKomponen.produkId, id))
    .orderBy(asc(produkKomponen.id));

  const resepIds = [...new Set(baris.filter((b) => b.resepAdonanId).map((b) => b.resepAdonanId!))];
  const biayaResep = await ambilBiayaResep(db, resepIds);
  const pilihanBahan = await pilihanBahanResep();
  const hargaByBahanId = new Map(pilihanBahan.map((b) => [b.id, b.hargaPerSatuan]));

  const komponenMap = new Map<string, KomponenProdukTampil>();
  const urutan: string[] = [];

  for (const item of baris) {
    let komponen = komponenMap.get(item.id);
    if (!komponen) {
      const jenis = item.resepAdonanId ? 'adonan' : 'bahan';
      komponen = {
        id: item.id,
        jenis,
        peran: item.peran,
        resepAdonanId: item.resepAdonanId ?? null,
        bahanId: item.bahanId ?? null,
        namaResep: item.namaResep ?? null,
        namaBahan: item.namaBahan ?? null,
        satuanDasar: item.satuanDasar ?? null,
        namaSatuan: item.namaSatuan ?? null,
        takaran: item.takaran ?? null,
        gramPerPcs: item.gramPerPcs ?? null,
        takaranDasar: item.takaranDasar,
        konversi: [],
        biayaPerPcs: '0',
      };
      komponenMap.set(item.id, komponen);
      urutan.push(item.id);
    }
    if (item.konversiId && item.konversiNama && item.konversiNilai) {
      komponen.konversi.push({
        id: item.konversiId,
        namaSatuan: item.konversiNama,
        nilaiDasar: item.konversiNilai,
      });
    }
  }

  for (const komponen of komponenMap.values()) {
    if (komponen.jenis === 'adonan' && komponen.resepAdonanId && komponen.gramPerPcs) {
      const biayaPerGram = biayaResep.get(komponen.resepAdonanId)?.biayaPerGram ?? D(0);
      komponen.biayaPerPcs = D(komponen.gramPerPcs).times(biayaPerGram).toString();
    } else if (komponen.jenis === 'bahan' && komponen.bahanId) {
      const harga = hargaByBahanId.get(komponen.bahanId) ?? '0';
      komponen.biayaPerPcs = D(komponen.takaranDasar).times(harga).toString();
    }
  }

  return {
    ...produkBaris,
    hargaJual: Number(produkBaris.hargaJual),
    stok: Number(produkBaris.stok),
    komponen: urutan.map((id) => komponenMap.get(id)!),
  };
}

export async function pilihanResep(): Promise<
  Array<{ id: string; nama: string; hasilGram: string; biayaPerGram: string; aktif: boolean }>
> {
  const resep = await db
    .select({
      id: resepAdonan.id,
      nama: resepAdonan.nama,
      hasilGram: resepAdonan.hasilGram,
      aktif: resepAdonan.aktif,
    })
    .from(resepAdonan)
    .where(eq(resepAdonan.aktif, true))
    .orderBy(asc(sql`lower(${resepAdonan.nama})`), asc(resepAdonan.id));

  if (resep.length === 0) return [];

  const biaya = await ambilBiayaResep(
    db,
    resep.map((item) => item.id),
  );

  return resep.map((item) => ({
    id: item.id,
    nama: item.nama,
    hasilGram: item.hasilGram,
    biayaPerGram: biaya.get(item.id)?.biayaPerGram.toString() ?? '0',
    aktif: item.aktif,
  }));
}
