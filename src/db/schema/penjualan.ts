import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { dibuatOleh, dibuatPada, id } from './_kolom';
import { metodeBayarEnum, statusTrxEnum } from './enums';
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
    diskonItem: integer('diskon_item').notNull().default(0),
    subtotal: integer('subtotal').notNull(),
    hppSatuan: numeric('hpp_satuan', { precision: 14, scale: 2 }).notNull(),
    dibuatPada: dibuatPada(),
  },
  (table) => [
    check('penjualan_item_qty_check', sql`${table.qty} > 0`),
    check(
      'penjualan_item_subtotal_check',
      sql`${table.subtotal} = ${table.qty} * ${table.hargaSatuan} - ${table.diskonItem}`,
    ),
    check(
      'penjualan_item_diskon_check',
      sql`${table.diskonItem} >= 0 AND ${table.diskonItem} <= ${table.qty} * ${table.hargaSatuan}`,
    ),
  ],
);
