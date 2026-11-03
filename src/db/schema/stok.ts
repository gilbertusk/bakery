import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { dibuatOleh, dibuatPada, diubahPada, id } from './_kolom';
import {
  akunKasEnum,
  jenisMutasiEnum,
  statusOpnameEnum,
  statusProduksiEnum,
  statusTrxEnum,
  sumberHargaEnum,
  sumberTipeEnum,
  targetOpnameEnum,
} from './enums';
import { bahan, supplier } from './master';
import { produk, resepAdonan } from './resep';
import { pengguna } from './sistem';

export const pembelian = pgTable('pembelian', {
  id: id(),
  noPembelian: text('no_pembelian').notNull().unique(),
  tanggal: date('tanggal').notNull(),
  supplierId: uuid('supplier_id').references(() => supplier.id, { onDelete: 'set null' }),
  akunBayar: akunKasEnum('akun_bayar').notNull(),
  total: integer('total').notNull(),
  status: statusTrxEnum('status').notNull().default('selesai'),
  alasanBatal: text('alasan_batal'),
  dibuatOleh: dibuatOleh(() => pengguna.id),
  dibuatPada: dibuatPada(),
  diubahPada: diubahPada(),
});

export const pembelianItem = pgTable(
  'pembelian_item',
  {
    id: id(),
    pembelianId: uuid('pembelian_id')
      .notNull()
      .references(() => pembelian.id, { onDelete: 'cascade' }),
    bahanId: uuid('bahan_id')
      .notNull()
      .references(() => bahan.id, { onDelete: 'restrict' }),
    jumlahKemasan: numeric('jumlah_kemasan', { precision: 14, scale: 3 }).notNull(),
    isiPerKemasan: numeric('isi_per_kemasan', { precision: 14, scale: 3 }).notNull(),
    qtyDasar: numeric('qty_dasar', { precision: 14, scale: 3 }).notNull(),
    totalHarga: integer('total_harga').notNull(),
    hargaPerSatuan: numeric('harga_per_satuan', { precision: 14, scale: 4 }).notNull(),
    dibuatPada: dibuatPada(),
  },
  (table) => [
    check('pembelian_item_jumlah_kemasan_check', sql`${table.jumlahKemasan} > 0`),
    check('pembelian_item_isi_per_kemasan_check', sql`${table.isiPerKemasan} > 0`),
    check('pembelian_item_total_harga_check', sql`${table.totalHarga} >= 0`),
  ],
);

export const riwayatHarga = pgTable(
  'riwayat_harga',
  {
    id: id(),
    bahanId: uuid('bahan_id')
      .notNull()
      .references(() => bahan.id, { onDelete: 'restrict' }),
    hargaLama: numeric('harga_lama', { precision: 14, scale: 4 }).notNull(),
    hargaBeli: numeric('harga_beli', { precision: 14, scale: 4 }),
    hargaBaru: numeric('harga_baru', { precision: 14, scale: 4 }).notNull(),
    sumber: sumberHargaEnum('sumber').notNull(),
    pembelianItemId: uuid('pembelian_item_id').references(() => pembelianItem.id, {
      onDelete: 'restrict',
    }),
    berlakuSejak: timestamp('berlaku_sejak', { withTimezone: true }).notNull().defaultNow(),
    dibuatOleh: dibuatOleh(() => pengguna.id),
  },
  (table) => [
    index('riwayat_harga_bahan_berlaku_idx').on(table.bahanId, table.berlakuSejak.desc()),
    check(
      'riwayat_harga_sumber_pembelian_check',
      sql`${table.sumber} <> 'pembelian' OR ${table.pembelianItemId} IS NOT NULL`,
    ),
  ],
);

export const produksi = pgTable(
  'produksi',
  {
    id: id(),
    noProduksi: text('no_produksi').notNull().unique(),
    tanggal: date('tanggal').notNull(),
    resepAdonanId: uuid('resep_adonan_id')
      .notNull()
      .references(() => resepAdonan.id, { onDelete: 'restrict' }),
    faktorSkala: numeric('faktor_skala', { precision: 6, scale: 3 }).notNull(),
    biayaAdonan: numeric('biaya_adonan', { precision: 14, scale: 2 }).notNull().default('0'),
    status: statusProduksiEnum('status').notNull().default('draft'),
    catatan: text('catatan'),
    dibuatOleh: dibuatOleh(() => pengguna.id),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [check('produksi_faktor_skala_check', sql`${table.faktorSkala} > 0`)],
);

export const produksiHasil = pgTable(
  'produksi_hasil',
  {
    id: id(),
    produksiId: uuid('produksi_id')
      .notNull()
      .references(() => produksi.id, { onDelete: 'cascade' }),
    produkId: uuid('produk_id')
      .notNull()
      .references(() => produk.id, { onDelete: 'restrict' }),
    pcsRencana: integer('pcs_rencana').notNull(),
    pcsAktual: integer('pcs_aktual').notNull(),
    pcsAfkir: integer('pcs_afkir').notNull(),
    hppRencana: numeric('hpp_rencana', { precision: 14, scale: 2 }).notNull(),
    hppAktual: numeric('hpp_aktual', { precision: 14, scale: 2 }).notNull(),
    dibuatPada: dibuatPada(),
  },
  (table) => [
    unique('produksi_hasil_produksi_produk_unique').on(table.produksiId, table.produkId),
    check(
      'produksi_hasil_pcs_check',
      sql`${table.pcsRencana} >= 0 AND ${table.pcsAktual} >= 0 AND ${table.pcsAfkir} >= 0`,
    ),
  ],
);

export const stokMutasi = pgTable(
  'stok_mutasi',
  {
    id: id(),
    waktu: timestamp('waktu', { withTimezone: true }).notNull().defaultNow(),
    jenis: jenisMutasiEnum('jenis').notNull(),
    bahanId: uuid('bahan_id').references(() => bahan.id, { onDelete: 'restrict' }),
    produkId: uuid('produk_id').references(() => produk.id, { onDelete: 'restrict' }),
    qty: numeric('qty', { precision: 14, scale: 3 }).notNull(),
    saldoSesudah: numeric('saldo_sesudah', { precision: 14, scale: 3 }).notNull(),
    nilaiSatuan: numeric('nilai_satuan', { precision: 14, scale: 4 }).notNull(),
    alasan: text('alasan'),
    sumberTipe: sumberTipeEnum('sumber_tipe'),
    sumberId: uuid('sumber_id'),
    dibuatOleh: uuid('dibuat_oleh').references(() => pengguna.id, { onDelete: 'restrict' }),
  },
  (table) => [
    check(
      'stok_mutasi_satu_target_check',
      sql`num_nonnulls(${table.bahanId}, ${table.produkId}) = 1`,
    ),
    check('stok_mutasi_qty_check', sql`${table.qty} <> 0`),
    check(
      'stok_mutasi_alasan_penyesuaian_check',
      sql`${table.jenis} <> 'penyesuaian' OR nullif(btrim(${table.alasan}), '') IS NOT NULL`,
    ),
    index('stok_mutasi_bahan_waktu_idx').on(table.bahanId, table.waktu),
    index('stok_mutasi_produk_waktu_idx').on(table.produkId, table.waktu),
    index('stok_mutasi_sumber_idx').on(table.sumberTipe, table.sumberId),
  ],
);

export const stokOpname = pgTable('stok_opname', {
  id: id(),
  tanggal: date('tanggal').notNull(),
  target: targetOpnameEnum('target').notNull(),
  status: statusOpnameEnum('status').notNull().default('draft'),
  catatan: text('catatan'),
  dibuatOleh: dibuatOleh(() => pengguna.id),
  dibuatPada: dibuatPada(),
  diubahPada: diubahPada(),
});

export const stokOpnameItem = pgTable(
  'stok_opname_item',
  {
    id: id(),
    stokOpnameId: uuid('stok_opname_id')
      .notNull()
      .references(() => stokOpname.id, { onDelete: 'cascade' }),
    bahanId: uuid('bahan_id').references(() => bahan.id, { onDelete: 'restrict' }),
    produkId: uuid('produk_id').references(() => produk.id, { onDelete: 'restrict' }),
    stokSistem: numeric('stok_sistem', { precision: 14, scale: 3 }).notNull(),
    stokFisik: numeric('stok_fisik', { precision: 14, scale: 3 }).notNull(),
    selisih: numeric('selisih', { precision: 14, scale: 3 }).notNull(),
    nilaiSelisih: numeric('nilai_selisih', { precision: 14, scale: 4 }).notNull(),
    dibuatPada: dibuatPada(),
  },
  (table) => [
    check(
      'stok_opname_item_satu_target_check',
      sql`num_nonnulls(${table.bahanId}, ${table.produkId}) = 1`,
    ),
  ],
);
