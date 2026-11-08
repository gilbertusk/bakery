import { eq } from 'drizzle-orm';

import type { Tx } from '@/db/client';
import { bahan, konversiSatuan, produkKomponen, resepAdonan, resepAdonanItem } from '@/db/schema';
import { D, keNumeric } from '@/lib/angka';
import { PesanError } from '@/lib/error';
import { hasilOtomatis, keSatuanDasar } from '@/lib/hpp';

/**
 * Hitung ulang semua salinan takaran dasar yang memakai sebuah konversi.
 * Mengembalikan ID resep terdampak agar hasil otomatis dapat dihitung ulang di transaksi yang sama.
 */
export async function hitungUlangTakaranDasarKonversi(
  tx: Tx,
  konversiId: string,
): Promise<string[]> {
  const [konversi] = await tx
    .select({ nilaiDasar: konversiSatuan.nilaiDasar })
    .from(konversiSatuan)
    .where(eq(konversiSatuan.id, konversiId));
  if (!konversi) throw new PesanError('Konversi tidak ditemukan');

  const [itemResep, komponenProduk] = await Promise.all([
    tx
      .select({
        id: resepAdonanItem.id,
        resepId: resepAdonanItem.resepAdonanId,
        takaran: resepAdonanItem.takaran,
      })
      .from(resepAdonanItem)
      .where(eq(resepAdonanItem.konversiSatuanId, konversiId)),
    tx
      .select({ id: produkKomponen.id, takaran: produkKomponen.takaran })
      .from(produkKomponen)
      .where(eq(produkKomponen.konversiSatuanId, konversiId)),
  ]);

  for (const item of itemResep) {
    const takaranDasar = keNumeric(keSatuanDasar(item.takaran, konversi.nilaiDasar), 3);
    await tx.update(resepAdonanItem).set({ takaranDasar }).where(eq(resepAdonanItem.id, item.id));
  }
  for (const komponen of komponenProduk) {
    const takaranDasar = keNumeric(keSatuanDasar(komponen.takaran, konversi.nilaiDasar), 3);
    await tx.update(produkKomponen).set({ takaranDasar }).where(eq(produkKomponen.id, komponen.id));
  }

  return [...new Set(itemResep.map((item) => item.resepId))];
}

/** Hitung ulang `hasil_gram` resep mode otomatis dari takaran dasar terbarunya. */
export async function hitungUlangHasilResep(tx: Tx, resepId: string) {
  const [resep] = await tx
    .select({ modeHasil: resepAdonan.modeHasil, hasilGram: resepAdonan.hasilGram })
    .from(resepAdonan)
    .where(eq(resepAdonan.id, resepId));
  if (!resep) throw new PesanError('Resep tidak ditemukan');
  if (resep.modeHasil === 'timbang') {
    return { hasilGram: D(resep.hasilGram), peringatan: [] as string[] };
  }

  const items = await tx
    .select({
      takaranDasar: resepAdonanItem.takaranDasar,
      satuanDasar: bahan.satuanDasar,
      namaBahan: bahan.nama,
    })
    .from(resepAdonanItem)
    .innerJoin(bahan, eq(bahan.id, resepAdonanItem.bahanId))
    .where(eq(resepAdonanItem.resepAdonanId, resepId));
  const hasil = hasilOtomatis(items);
  if (!hasil.hasilGram.gt(0)) throw new PesanError('Hasil adonan otomatis harus lebih dari 0');

  await tx
    .update(resepAdonan)
    .set({ hasilGram: keNumeric(hasil.hasilGram, 3) })
    .where(eq(resepAdonan.id, resepId));
  return hasil;
}
