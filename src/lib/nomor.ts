import { sql } from 'drizzle-orm';

import type { Tx } from '@/db/client';
import { nomorUrut } from '@/db/schema';

export type PrefixNomor = 'NT' | 'PB' | 'PR' | 'PO' | 'INV';

/** ("NT", "2026-11-03", 7) → "NT-261103-007"; lanjut 4 digit setelah 999. */
export function formatNomor(prefix: PrefixNomor, tanggal: string, urutan: number): string {
  if (!Number.isInteger(urutan) || urutan < 1) {
    throw new Error(`Urutan nomor harus bilangan bulat positif: ${urutan}`);
  }
  const yymmdd = tanggal.slice(2).replaceAll('-', '');
  return `${prefix}-${yymmdd}-${String(urutan).padStart(3, '0')}`;
}

/**
 * Ambil nomor dokumen berikutnya, urut per hari WIB tanpa celah.
 * Wajib dipanggil di dalam transaksi yang sama dengan penyimpanan dokumen:
 * baris `nomor_urut` terkunci sampai transaksi selesai, dan ikut di-rollback bila gagal.
 * `tanggal` hanya untuk test/migrasi data; default memakai tanggal WIB dari jam database.
 */
export async function ambilNomor(tx: Tx, prefix: PrefixNomor, tanggal?: string): Promise<string> {
  const [baris] = await tx
    .insert(nomorUrut)
    .values({
      prefix,
      tanggal: tanggal ?? sql`(now() AT TIME ZONE 'Asia/Jakarta')::date`,
      terakhir: 1,
    })
    .onConflictDoUpdate({
      target: [nomorUrut.prefix, nomorUrut.tanggal],
      set: { terakhir: sql`${nomorUrut.terakhir} + 1` },
    })
    .returning({ tanggal: nomorUrut.tanggal, terakhir: nomorUrut.terakhir });

  if (!baris) throw new Error(`Gagal mengambil nomor ${prefix}`);
  return formatNomor(prefix, baris.tanggal, baris.terakhir);
}
