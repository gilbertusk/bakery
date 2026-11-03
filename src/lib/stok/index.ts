import { eq, sql } from 'drizzle-orm';

import type { Tx } from '@/db/client';
import { type JenisMutasi, type SumberTipe, bahan, produk, stokMutasi } from '@/db/schema';
import { D, type Decimal, type NilaiAngka, keNumeric } from '@/lib/angka';
import { PesanError } from '@/lib/error';

import { StokTidakCukupError } from './error';

export { StokTidakCukupError };

export type TargetStok = { bahanId: string } | { produkId: string };

export type InputMutasi = {
  jenis: JenisMutasi;
  target: TargetStok;
  /** Bertanda: positif = masuk, negatif = keluar. Satuan dasar (g/ml/pcs). */
  qty: NilaiAngka;
  /** Harga bahan / HPP produk per satuan saat mutasi. */
  nilaiSatuan: NilaiAngka;
  alasan?: string | null;
  sumberTipe: SumberTipe | null;
  sumberId: string | null;
  dibuatOleh: string | null;
  izinkanMinus: boolean;
};

export type HasilMutasi = {
  saldoSesudah: string;
  /** True bila mutasi ini membuat saldo berpindah dari ≥ 0 ke < 0. */
  menjadiMinus: boolean;
};

async function kunciTarget(tx: Tx, target: TargetStok) {
  if ('bahanId' in target) {
    const [baris] = await tx
      .select({ nama: bahan.nama, stok: bahan.stok })
      .from(bahan)
      .where(eq(bahan.id, target.bahanId))
      .for('update');
    return baris;
  }
  const [baris] = await tx
    .select({ nama: produk.nama, stok: produk.stok })
    .from(produk)
    .where(eq(produk.id, target.produkId))
    .for('update');
  return baris;
}

/**
 * Satu-satunya jalan mengubah stok. Mengunci baris bahan/produk, memperbarui saldo cache,
 * dan menulis `stok_mutasi` dengan `saldo_sesudah`. Panggil di dalam transaksi.
 */
export async function catatMutasi(tx: Tx, input: InputMutasi): Promise<HasilMutasi> {
  const untukProduk = 'produkId' in input.target;
  const qty = D(input.qty).toDecimalPlaces(3);

  if (qty.isZero()) throw new PesanError('Jumlah mutasi stok tidak boleh nol');
  if (untukProduk && !qty.isInteger()) {
    throw new PesanError('Jumlah stok produk harus bilangan bulat');
  }

  const baris = await kunciTarget(tx, input.target);
  if (!baris) throw new PesanError('Bahan atau produk tidak ditemukan');

  const saldoLama = D(baris.stok);
  const saldoBaru = saldoLama.plus(qty);

  if (saldoBaru.lt(0) && !input.izinkanMinus) {
    throw new StokTidakCukupError({
      nama: baris.nama,
      stok: saldoLama.toString(),
      diminta: qty.neg().toString(),
    });
  }

  const saldoSesudah = untukProduk ? saldoBaru.toFixed(0) : keNumeric(saldoBaru, 3);

  if ('bahanId' in input.target) {
    await tx.update(bahan).set({ stok: saldoSesudah }).where(eq(bahan.id, input.target.bahanId));
  } else {
    await tx
      .update(produk)
      .set({ stok: saldoBaru.toNumber() })
      .where(eq(produk.id, input.target.produkId));
  }

  await tx.insert(stokMutasi).values({
    jenis: input.jenis,
    bahanId: 'bahanId' in input.target ? input.target.bahanId : null,
    produkId: 'produkId' in input.target ? input.target.produkId : null,
    qty: keNumeric(qty, 3),
    saldoSesudah: keNumeric(saldoBaru, 3),
    nilaiSatuan: keNumeric(input.nilaiSatuan, 4),
    alasan: input.alasan ?? null,
    sumberTipe: input.sumberTipe,
    sumberId: input.sumberId,
    dibuatOleh: input.dibuatOleh,
  });

  return { saldoSesudah, menjadiMinus: saldoBaru.lt(0) && saldoLama.gte(0) };
}

/** Σ qty dari buku besar `stok_mutasi`, untuk rekonsiliasi dengan saldo cache. */
export async function hitungUlangSaldo(tx: Tx, target: TargetStok): Promise<Decimal> {
  const kondisi =
    'bahanId' in target
      ? eq(stokMutasi.bahanId, target.bahanId)
      : eq(stokMutasi.produkId, target.produkId);
  const [hasil] = await tx
    .select({ total: sql<string>`coalesce(sum(${stokMutasi.qty}), 0)::text` })
    .from(stokMutasi)
    .where(kondisi);
  return D(hasil?.total ?? '0');
}
