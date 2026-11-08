import 'server-only';

import { and, asc, count, eq, ilike, or, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { bahan, supplier } from '@/db/schema';

export type BarisSupplier = {
  id: string;
  nama: string;
  kontak: string | null;
  catatan: string | null;
  aktif: boolean;
  jumlahBahan: number;
};

/** Escape `%`, `_`, dan `\` agar input pencarian dicocokkan apa adanya di ILIKE. */
function polaCari(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function daftarSupplier({
  q,
  aktif,
}: {
  q?: string;
  aktif?: boolean;
}): Promise<BarisSupplier[]> {
  const kata = q?.trim();
  const syarat = and(
    kata
      ? or(ilike(supplier.nama, polaCari(kata)), ilike(supplier.kontak, polaCari(kata)))
      : undefined,
    aktif === undefined ? undefined : eq(supplier.aktif, aktif),
  );

  return db
    .select({
      id: supplier.id,
      nama: supplier.nama,
      kontak: supplier.kontak,
      catatan: supplier.catatan,
      aktif: supplier.aktif,
      jumlahBahan: count(bahan.id),
    })
    .from(supplier)
    .leftJoin(bahan, eq(bahan.supplierUtamaId, supplier.id))
    .where(syarat)
    .groupBy(supplier.id)
    .orderBy(asc(sql`lower(${supplier.nama})`), asc(supplier.id));
}

/** Untuk dropdown supplier utama di form bahan: hanya yang aktif. */
export async function pilihanSupplier(): Promise<{ id: string; nama: string }[]> {
  return db
    .select({ id: supplier.id, nama: supplier.nama })
    .from(supplier)
    .where(eq(supplier.aktif, true))
    .orderBy(asc(sql`lower(${supplier.nama})`));
}
