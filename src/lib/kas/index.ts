import { and, eq, sql } from 'drizzle-orm';

import type { Db, Tx } from '@/db/client';
import {
  type AkunKas,
  type JenisKas,
  type MetodeBayar,
  type SumberTipe,
  kas,
  kategoriKas,
} from '@/db/schema';
import { PesanError } from '@/lib/error';

import { KATEGORI_KAS } from './kategori';

export { KATEGORI_KAS };

export type NamaKategoriKas = (typeof KATEGORI_KAS)[keyof typeof KATEGORI_KAS];

export type InputKas = {
  /** Nama kategori (mis. `KATEGORI_KAS.PENJUALAN`) atau id kategori. */
  kategori: NamaKategoriKas | (string & {});
  /** Opsional; bila diisi harus sama dengan jenis kategori. */
  jenis?: JenisKas;
  akun: AkunKas;
  /** Rupiah integer > 0. */
  nominal: number;
  keterangan: string | null;
  sumberTipe?: SumberTipe | null;
  sumberId?: string | null;
  dibuatOleh: string;
  waktu?: Date;
};

const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Satu-satunya jalan menulis kas. Jenis kas selalu mengikuti jenis kategori. */
export async function catatKas(tx: Tx, input: InputKas) {
  if (!Number.isInteger(input.nominal) || input.nominal <= 0) {
    throw new PesanError('Nominal kas harus bilangan bulat lebih dari 0');
  }

  const [kategori] = await tx
    .select({ id: kategoriKas.id, nama: kategoriKas.nama, jenis: kategoriKas.jenis })
    .from(kategoriKas)
    .where(
      POLA_UUID.test(input.kategori)
        ? eq(kategoriKas.id, input.kategori)
        : eq(kategoriKas.nama, input.kategori),
    )
    .limit(1);
  if (!kategori) throw new PesanError(`Kategori kas "${input.kategori}" tidak ditemukan`);

  if (input.jenis && input.jenis !== kategori.jenis) {
    throw new PesanError(
      `Jenis kas ${input.jenis} tidak sesuai dengan kategori ${kategori.nama} (${kategori.jenis})`,
    );
  }

  const [baris] = await tx
    .insert(kas)
    .values({
      jenis: kategori.jenis,
      kategoriKasId: kategori.id,
      akun: input.akun,
      nominal: input.nominal,
      keterangan: input.keterangan,
      sumberTipe: input.sumberTipe ?? null,
      sumberId: input.sumberId ?? null,
      dibuatOleh: input.dibuatOleh,
      ...(input.waktu ? { waktu: input.waktu } : {}),
    })
    .returning();
  if (!baris) throw new Error('Gagal menyimpan kas');
  return baris;
}

/** Tunai masuk laci; transfer dan QRIS masuk rekening. */
export function akunDariMetode(metode: MetodeBayar): AkunKas {
  return metode === 'tunai' ? 'tunai' : 'rekening';
}

/** Tandai kas dari transaksi sumber sebagai dibatalkan. Mengembalikan jumlah baris yang berubah. */
export async function batalkanKasDariSumber(
  tx: Tx,
  sumberTipe: SumberTipe,
  sumberId: string,
): Promise<number> {
  const diubah = await tx
    .update(kas)
    .set({ dibatalkan: true })
    .where(
      and(eq(kas.sumberTipe, sumberTipe), eq(kas.sumberId, sumberId), eq(kas.dibatalkan, false)),
    )
    .returning({ id: kas.id });
  return diubah.length;
}

/** Saldo = Σ masuk − Σ keluar untuk kas yang tidak dibatalkan. */
export async function saldoAkun(db: Db | Tx): Promise<Record<AkunKas, number>>;
export async function saldoAkun(db: Db | Tx, akun: AkunKas): Promise<number>;
export async function saldoAkun(
  db: Db | Tx,
  akun?: AkunKas,
): Promise<number | Record<AkunKas, number>> {
  const baris = await db
    .select({
      akun: kas.akun,
      saldo: sql<string>`coalesce(sum(case when ${kas.jenis} = 'masuk' then ${kas.nominal} else -${kas.nominal} end), 0)::text`,
    })
    .from(kas)
    .where(and(eq(kas.dibatalkan, false), akun ? eq(kas.akun, akun) : undefined))
    .groupBy(kas.akun);

  const saldo: Record<AkunKas, number> = { tunai: 0, rekening: 0 };
  for (const { akun: namaAkun, saldo: nilai } of baris) saldo[namaAkun] = Number(nilai);
  return akun ? saldo[akun] : saldo;
}
