import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { dibuatPada, diubahPada, id } from './_kolom';
import { satuanDasarEnum } from './enums';

export const supplier = pgTable('supplier', {
  id: id(),
  nama: text('nama').notNull(),
  kontak: text('kontak'),
  catatan: text('catatan'),
  aktif: boolean('aktif').notNull().default(true),
  dibuatPada: dibuatPada(),
  diubahPada: diubahPada(),
});

export const bahan = pgTable(
  'bahan',
  {
    id: id(),
    nama: text('nama').notNull(),
    kategori: text('kategori').notNull(),
    satuanDasar: satuanDasarEnum('satuan_dasar').notNull(),
    hargaPerSatuan: numeric('harga_per_satuan', { precision: 14, scale: 4 }).notNull().default('0'),
    stok: numeric('stok', { precision: 14, scale: 3 }).notNull().default('0'),
    stokMinimal: numeric('stok_minimal', { precision: 14, scale: 3 }).notNull().default('0'),
    supplierUtamaId: uuid('supplier_utama_id').references(() => supplier.id, {
      onDelete: 'set null',
    }),
    aktif: boolean('aktif').notNull().default(true),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [
    uniqueIndex('bahan_nama_unique').on(sql`lower(${table.nama})`),
    check('bahan_harga_per_satuan_check', sql`${table.hargaPerSatuan} >= 0`),
    check('bahan_stok_minimal_check', sql`${table.stokMinimal} >= 0`),
  ],
);

export const konversiSatuan = pgTable(
  'konversi_satuan',
  {
    id: id(),
    bahanId: uuid('bahan_id')
      .notNull()
      .references(() => bahan.id, { onDelete: 'cascade' }),
    namaSatuan: text('nama_satuan').notNull(),
    nilaiDasar: numeric('nilai_dasar', { precision: 12, scale: 4 }).notNull(),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [
    uniqueIndex('konversi_satuan_bahan_nama_unique').on(
      table.bahanId,
      sql`lower(${table.namaSatuan})`,
    ),
    check('konversi_satuan_nilai_dasar_check', sql`${table.nilaiDasar} > 0`),
  ],
);

/** PRD §6.4a: tambahan pilihan pembeli, tepat satu bahan, berlaku untuk semua produk. */
export const addOn = pgTable(
  'add_on',
  {
    id: id(),
    nama: text('nama').notNull(),
    bahanId: uuid('bahan_id')
      .notNull()
      .references(() => bahan.id, { onDelete: 'restrict' }),
    takaran: numeric('takaran', { precision: 14, scale: 3 }).notNull(),
    konversiSatuanId: uuid('konversi_satuan_id').references(() => konversiSatuan.id, {
      onDelete: 'restrict',
    }),
    takaranDasar: numeric('takaran_dasar', { precision: 14, scale: 3 }).notNull(),
    harga: integer('harga').notNull(),
    aktif: boolean('aktif').notNull().default(true),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [
    uniqueIndex('add_on_nama_unique').on(sql`lower(${table.nama})`),
    check('add_on_takaran_check', sql`${table.takaran} > 0`),
    check('add_on_takaran_dasar_check', sql`${table.takaranDasar} > 0`),
    check('add_on_harga_check', sql`${table.harga} >= 0`),
  ],
);
