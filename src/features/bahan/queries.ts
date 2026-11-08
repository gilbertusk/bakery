import 'server-only';

import { and, asc, count, desc, eq, exists, ilike, lt, lte, or, sql } from 'drizzle-orm';

import { type Db, type Tx, db } from '@/db/client';
import {
  type SatuanDasar,
  bahan,
  pengguna,
  produkKomponen,
  resepAdonanItem,
  riwayatHarga,
  stokMutasi,
  supplier,
} from '@/db/schema';

import { type FilterStok, type StatusStok, statusStok } from './status-stok';

export type BarisBahan = {
  id: string;
  nama: string;
  kategori: string;
  satuanDasar: SatuanDasar;
  stok: string;
  stokMinimal: string;
  hargaPerSatuan: string;
  aktif: boolean;
  supplierNama: string | null;
  status: StatusStok;
};

export type DetailBahan = BarisBahan & {
  supplierUtamaId: string | null;
  terkunci: boolean;
};

/** Escape `%`, `_`, dan `\` agar input pencarian dicocokkan apa adanya di ILIKE. */
function polaCari(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const kolomBahan = {
  id: bahan.id,
  nama: bahan.nama,
  kategori: bahan.kategori,
  satuanDasar: bahan.satuanDasar,
  stok: bahan.stok,
  stokMinimal: bahan.stokMinimal,
  hargaPerSatuan: bahan.hargaPerSatuan,
  aktif: bahan.aktif,
  supplierNama: supplier.nama,
};

const perluPerhatian = or(lt(bahan.stok, '0'), lte(bahan.stok, bahan.stokMinimal));

function denganStatus<T extends { stok: string; stokMinimal: string }>(
  baris: T,
): T & { status: StatusStok } {
  return { ...baris, status: statusStok(baris.stok, baris.stokMinimal) };
}

export async function daftarBahan({
  q,
  kategori,
  status = 'semua',
  aktif,
}: {
  q?: string;
  kategori?: string;
  status?: FilterStok;
  aktif?: boolean;
}): Promise<BarisBahan[]> {
  const kata = q?.trim();
  const syarat = and(
    kata ? ilike(bahan.nama, polaCari(kata)) : undefined,
    kategori ? eq(bahan.kategori, kategori) : undefined,
    status === 'menipis' ? perluPerhatian : undefined,
    status === 'minus' ? lt(bahan.stok, '0') : undefined,
    aktif === undefined ? undefined : eq(bahan.aktif, aktif),
  );

  const baris = await db
    .select(kolomBahan)
    .from(bahan)
    .leftJoin(supplier, eq(supplier.id, bahan.supplierUtamaId))
    .where(syarat)
    .orderBy(asc(sql`lower(${bahan.nama})`), asc(bahan.id));
  return baris.map(denganStatus);
}

/** Badge menu "Bahan": bahan aktif yang stoknya ≤ minimal (termasuk minus). */
export async function jumlahBahanPerluPerhatian(): Promise<number> {
  const [hasil] = await db
    .select({ jumlah: count() })
    .from(bahan)
    .where(and(eq(bahan.aktif, true), perluPerhatian));
  return hasil?.jumlah ?? 0;
}

/** Kategori yang sudah dipakai, untuk chip filter dan saran form. */
export async function kategoriBahan(): Promise<string[]> {
  const baris = await db
    .selectDistinct({ kategori: bahan.kategori })
    .from(bahan)
    .orderBy(asc(bahan.kategori));
  return baris.map((b) => b.kategori);
}

/**
 * Satuan dasar terkunci bila bahan sudah punya mutasi stok atau dipakai resep/produk,
 * karena angka lama tercatat dalam satuan tersebut.
 */
export async function bahanTerkunci(id: string, klien: Db | Tx = db): Promise<boolean> {
  const [hasil] = await klien
    .select({ id: bahan.id })
    .from(bahan)
    .where(
      and(
        eq(bahan.id, id),
        or(
          exists(
            klien
              .select({ x: sql`1` })
              .from(stokMutasi)
              .where(eq(stokMutasi.bahanId, id)),
          ),
          exists(
            klien
              .select({ x: sql`1` })
              .from(resepAdonanItem)
              .where(eq(resepAdonanItem.bahanId, id)),
          ),
          exists(
            klien
              .select({ x: sql`1` })
              .from(produkKomponen)
              .where(eq(produkKomponen.bahanId, id)),
          ),
        ),
      ),
    );
  return hasil !== undefined;
}

export async function detailBahan(id: string): Promise<DetailBahan | null> {
  const [baris] = await db
    .select({ ...kolomBahan, supplierUtamaId: bahan.supplierUtamaId })
    .from(bahan)
    .leftJoin(supplier, eq(supplier.id, bahan.supplierUtamaId))
    .where(eq(bahan.id, id));
  if (!baris) return null;
  return { ...denganStatus(baris), terkunci: await bahanTerkunci(id) };
}

export type BarisRiwayatHarga = {
  id: string;
  hargaLama: string;
  hargaBaru: string;
  sumber: 'pembelian' | 'manual';
  oleh: string;
  berlakuSejak: Date;
};

export async function riwayatHargaBahan(id: string): Promise<BarisRiwayatHarga[]> {
  return db
    .select({
      id: riwayatHarga.id,
      hargaLama: riwayatHarga.hargaLama,
      hargaBaru: riwayatHarga.hargaBaru,
      sumber: riwayatHarga.sumber,
      oleh: pengguna.nama,
      berlakuSejak: riwayatHarga.berlakuSejak,
    })
    .from(riwayatHarga)
    .innerJoin(pengguna, eq(pengguna.id, riwayatHarga.dibuatOleh))
    .where(eq(riwayatHarga.bahanId, id))
    .orderBy(desc(riwayatHarga.berlakuSejak), desc(riwayatHarga.id));
}
