import type { Db } from '@/db/client';
import { kategoriKas, pengaturanToko } from '@/db/schema';
import { KATEGORI_KAS } from '@/lib/kas/kategori';

const KATEGORI_DEFAULT: (typeof kategoriKas.$inferInsert)[] = [
  { nama: KATEGORI_KAS.PENJUALAN, jenis: 'masuk', kelompok: 'penjualan', sistem: true },
  { nama: KATEGORI_KAS.DP_PRE_ORDER, jenis: 'masuk', kelompok: 'penjualan', sistem: true },
  {
    nama: KATEGORI_KAS.PELUNASAN_PRE_ORDER,
    jenis: 'masuk',
    kelompok: 'penjualan',
    sistem: true,
  },
  {
    nama: KATEGORI_KAS.PEMASUKAN_BAHAN_SISA,
    jenis: 'masuk',
    kelompok: 'pendapatan_lain',
    sistem: true,
  },
  { nama: KATEGORI_KAS.PEMBELIAN_BAHAN, jenis: 'keluar', kelompok: 'hpp_bahan', sistem: true },
  { nama: KATEGORI_KAS.REFUND_PRE_ORDER, jenis: 'keluar', kelompok: 'penjualan', sistem: true },
  { nama: KATEGORI_KAS.TRANSFER_MASUK, jenis: 'masuk', kelompok: 'transfer', sistem: true },
  { nama: KATEGORI_KAS.TRANSFER_KELUAR, jenis: 'keluar', kelompok: 'transfer', sistem: true },
  { nama: 'Listrik', jenis: 'keluar', kelompok: 'operasional', sistem: false },
  { nama: 'Gas', jenis: 'keluar', kelompok: 'operasional', sistem: false },
  { nama: 'Gaji', jenis: 'keluar', kelompok: 'operasional', sistem: false },
  { nama: 'Sewa', jenis: 'keluar', kelompok: 'operasional', sistem: false },
  { nama: 'Iklan', jenis: 'keluar', kelompok: 'operasional', sistem: false },
  { nama: 'Lain-lain', jenis: 'keluar', kelompok: 'operasional', sistem: false },
];

export async function seedSistem(database: Db) {
  await database
    .insert(pengaturanToko)
    .values({
      id: 1,
      namaToko: 'Toko Kue Khansa',
      ukuranKertas: '58',
      metodeHarga: 'rata_rata',
      targetMarginDefault: '0.3000',
      izinkanStokProdukMinus: false,
      pembulatanSaranHarga: 500,
      footerStruk: 'Terima kasih, selamat menikmati!',
    })
    .onConflictDoNothing({ target: pengaturanToko.id });

  await database
    .insert(kategoriKas)
    .values(KATEGORI_DEFAULT)
    .onConflictDoNothing({ target: kategoriKas.nama });
}
