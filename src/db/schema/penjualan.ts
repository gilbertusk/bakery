import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { dibuatOleh, dibuatPada, id } from './_kolom';
import { metodeBayarEnum, statusTrxEnum } from './enums';
import { addOn } from './master';
import { preOrder } from './po';
import { produk } from './resep';
import { pengguna } from './sistem';

export const penjualan = pgTable(
  'penjualan',
  {
    id: id(),
    noNota: text('no_nota').notNull().unique(),
    waktu: timestamp('waktu', { withTimezone: true }).notNull().defaultNow(),
    subtotal: integer('subtotal').notNull(),
    diskonNota: integer('diskon_nota').notNull().default(0),
    total: integer('total').notNull(),
    metodeBayar: metodeBayarEnum('metode_bayar').notNull(),
    dibayar: integer('dibayar').notNull().default(0),
    kembalian: integer('kembalian').notNull().default(0),
    catatan: text('catatan'),
    preOrderId: uuid('pre_order_id')
      .unique()
      .references(() => preOrder.id, { onDelete: 'restrict' }),
    kunciIdempoten: uuid('kunci_idempoten').unique(),
    status: statusTrxEnum('status').notNull().default('selesai'),
    alasanBatal: text('alasan_batal'),
    dibatalkanOleh: uuid('dibatalkan_oleh').references(() => pengguna.id, {
      onDelete: 'restrict',
    }),
    dibatalkanPada: timestamp('dibatalkan_pada', { withTimezone: true }),
    dibuatOleh: dibuatOleh(() => pengguna.id),
    dibuatPada: dibuatPada(),
  },
  (table) => [
    check(
      'penjualan_diskon_nota_check',
      sql`${table.diskonNota} >= 0 AND ${table.diskonNota} <= ${table.subtotal}`,
    ),
    check('penjualan_total_check', sql`${table.total} = ${table.subtotal} - ${table.diskonNota}`),
    check(
      'penjualan_batal_check',
      sql`${table.status} <> 'batal' OR (${table.alasanBatal} IS NOT NULL AND ${table.dibatalkanOleh} IS NOT NULL AND ${table.dibatalkanPada} IS NOT NULL)`,
    ),
    index('penjualan_waktu_idx').on(table.waktu),
  ],
);

export const penjualanItem = pgTable(
  'penjualan_item',
  {
    id: id(),
    penjualanId: uuid('penjualan_id')
      .notNull()
      .references(() => penjualan.id, { onDelete: 'cascade' }),
    produkId: uuid('produk_id')
      .notNull()
      .references(() => produk.id, { onDelete: 'restrict' }),
    namaProduk: text('nama_produk').notNull(),
    qty: integer('qty').notNull(),
    hargaSatuan: integer('harga_satuan').notNull(),
    /** Σ harga add-on per pcs (cache dari penjualan_item_add_on.harga). */
    hargaAddOn: integer('harga_add_on').notNull().default(0),
    diskonItem: integer('diskon_item').notNull().default(0),
    subtotal: integer('subtotal').notNull(),
    hppSatuan: numeric('hpp_satuan', { precision: 14, scale: 2 }).notNull(),
    dibuatPada: dibuatPada(),
  },
  (table) => [
    check('penjualan_item_qty_check', sql`${table.qty} > 0`),
    check('penjualan_item_harga_add_on_check', sql`${table.hargaAddOn} >= 0`),
    check(
      'penjualan_item_subtotal_check',
      sql`${table.subtotal} = ${table.qty} * (${table.hargaSatuan} + ${table.hargaAddOn}) - ${table.diskonItem}`,
    ),
    check(
      'penjualan_item_diskon_check',
      sql`${table.diskonItem} >= 0 AND ${table.diskonItem} <= ${table.qty} * (${table.hargaSatuan} + ${table.hargaAddOn})`,
    ),
  ],
);

export const penjualanItemAddOn = pgTable(
  'penjualan_item_add_on',
  {
    id: id(),
    penjualanItemId: uuid('penjualan_item_id')
      .notNull()
      .references(() => penjualanItem.id, { onDelete: 'cascade' }),
    addOnId: uuid('add_on_id')
      .notNull()
      .references(() => addOn.id, { onDelete: 'restrict' }),
    namaAddOn: text('nama_add_on').notNull(),
    hargaNormal: integer('harga_normal').notNull(),
    harga: integer('harga').notNull(),
    hppSatuan: numeric('hpp_satuan', { precision: 14, scale: 2 }).notNull(),
    dibuatPada: dibuatPada(),
  },
  (table) => [
    unique('penjualan_item_add_on_item_add_on_unique').on(table.penjualanItemId, table.addOnId),
    index('penjualan_item_add_on_add_on_idx').on(table.addOnId),
    check('penjualan_item_add_on_harga_normal_check', sql`${table.hargaNormal} >= 0`),
    check('penjualan_item_add_on_harga_check', sql`${table.harga} >= 0`),
  ],
);
