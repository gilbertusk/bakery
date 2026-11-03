import { pgEnum } from 'drizzle-orm/pg-core';

export const satuanDasarEnum = pgEnum('satuan_dasar', ['g', 'ml', 'pcs']);
export const modeHasilEnum = pgEnum('mode_hasil', ['otomatis', 'timbang']);
export const bentukLoyangEnum = pgEnum('bentuk_loyang', ['bulat', 'kotak']);
export const peranKomponenEnum = pgEnum('peran_komponen', [
  'adonan',
  'topping',
  'filling',
  'kemasan',
  'lainnya',
]);
export const metodeBiayaEnum = pgEnum('metode_biaya', ['per_pcs', 'persen', 'per_batch']);
export const sumberHargaEnum = pgEnum('sumber_harga', ['pembelian', 'manual']);
export const statusTrxEnum = pgEnum('status_trx', ['selesai', 'batal']);
export const statusProduksiEnum = pgEnum('status_produksi', ['draft', 'selesai', 'batal']);
export const jenisMutasiEnum = pgEnum('jenis_mutasi', [
  'stok_awal',
  'pembelian',
  'batal_pembelian',
  'produksi_pakai',
  'produksi_hasil',
  'batal_produksi',
  'penjualan',
  'batal_penjualan',
  'penyesuaian',
  'opname',
]);
export const sumberTipeEnum = pgEnum('sumber_tipe', [
  'pembelian',
  'produksi',
  'penjualan',
  'opname',
  'po_pembayaran',
  'transfer',
  'manual',
]);
export const targetOpnameEnum = pgEnum('target_opname', ['bahan', 'produk']);
export const statusOpnameEnum = pgEnum('status_opname', ['draft', 'final']);
export const metodeBayarEnum = pgEnum('metode_bayar', ['tunai', 'transfer', 'qris']);
export const statusPoEnum = pgEnum('status_po', [
  'dipesan',
  'diproduksi',
  'siap',
  'diambil',
  'batal',
]);
export const statusBayarEnum = pgEnum('status_bayar', ['belum', 'dp', 'lunas']);
export const jenisBayarPoEnum = pgEnum('jenis_bayar_po', ['dp', 'pelunasan', 'refund']);
export const jenisKasEnum = pgEnum('jenis_kas', ['masuk', 'keluar']);
export const kelompokKasEnum = pgEnum('kelompok_kas', [
  'penjualan',
  'pendapatan_lain',
  'hpp_bahan',
  'operasional',
  'transfer',
]);
export const akunKasEnum = pgEnum('akun_kas', ['tunai', 'rekening']);
export const peranEnum = pgEnum('peran', ['pemilik', 'kasir']);
export const ukuranKertasEnum = pgEnum('ukuran_kertas', ['58', '80']);
export const metodeHargaEnum = pgEnum('metode_harga', ['rata_rata', 'terakhir']);
export const aksiAuditEnum = pgEnum('aksi_audit', ['insert', 'update', 'batal']);

export type SatuanDasar = (typeof satuanDasarEnum.enumValues)[number];
export type ModeHasil = (typeof modeHasilEnum.enumValues)[number];
export type BentukLoyang = (typeof bentukLoyangEnum.enumValues)[number];
export type PeranKomponen = (typeof peranKomponenEnum.enumValues)[number];
export type MetodeBiaya = (typeof metodeBiayaEnum.enumValues)[number];
export type SumberHarga = (typeof sumberHargaEnum.enumValues)[number];
export type StatusTrx = (typeof statusTrxEnum.enumValues)[number];
export type StatusProduksi = (typeof statusProduksiEnum.enumValues)[number];
export type JenisMutasi = (typeof jenisMutasiEnum.enumValues)[number];
export type SumberTipe = (typeof sumberTipeEnum.enumValues)[number];
export type TargetOpname = (typeof targetOpnameEnum.enumValues)[number];
export type StatusOpname = (typeof statusOpnameEnum.enumValues)[number];
export type MetodeBayar = (typeof metodeBayarEnum.enumValues)[number];
export type StatusPo = (typeof statusPoEnum.enumValues)[number];
export type StatusBayar = (typeof statusBayarEnum.enumValues)[number];
export type JenisBayarPo = (typeof jenisBayarPoEnum.enumValues)[number];
export type JenisKas = (typeof jenisKasEnum.enumValues)[number];
export type KelompokKas = (typeof kelompokKasEnum.enumValues)[number];
export type AkunKas = (typeof akunKasEnum.enumValues)[number];
export type Peran = (typeof peranEnum.enumValues)[number];
export type UkuranKertas = (typeof ukuranKertasEnum.enumValues)[number];
export type MetodeHarga = (typeof metodeHargaEnum.enumValues)[number];
export type AksiAudit = (typeof aksiAuditEnum.enumValues)[number];
