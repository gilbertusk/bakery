import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { dibuatOleh, dibuatPada, diubahPada, id } from './_kolom';
import { jenisBayarPoEnum, metodeBayarEnum, statusBayarEnum, statusPoEnum } from './enums';
import { addOn } from './master';
import { penjualan } from './penjualan';
import { produk } from './resep';
import { pengguna } from './sistem';

export const preOrder = pgTable(
  'pre_order',
  {
    id: id(),
    noPo: text('no_po').notNull().unique(),
    namaPemesan: text('nama_pemesan').notNull(),
    kontak: text('kontak').notNull(),
    tanggalAmbil: date('tanggal_ambil').notNull(),
    jamAmbil: time('jam_ambil'),
    diantar: boolean('diantar').notNull().default(false),
    alamat: text('alamat'),
    catatan: text('catatan'),
    status: statusPoEnum('status').notNull().default('dipesan'),
    total: integer('total').notNull(),
    diskon: integer('diskon').notNull().default(0),
    dibayar: integer('dibayar').notNull().default(0),
    statusBayar: statusBayarEnum('status_bayar').notNull().default('belum'),
    alasanBatal: text('alasan_batal'),
    dibatalkanPada: timestamp('dibatalkan_pada', { withTimezone: true }),
    dibuatOleh: dibuatOleh(() => pengguna.id),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [
    check(
      'pre_order_batal_check',
      sql`${table.status} <> 'batal' OR (${table.alasanBatal} IS NOT NULL AND ${table.dibatalkanPada} IS NOT NULL)`,
    ),
    index('pre_order_tanggal_ambil_idx').on(table.tanggalAmbil),
    index('pre_order_status_idx').on(table.status),
  ],
);

export const preOrderItem = pgTable(
  'pre_order_item',
  {
    id: id(),
    preOrderId: uuid('pre_order_id')
      .notNull()
      .references(() => preOrder.id, { onDelete: 'cascade' }),
    produkId: uuid('produk_id')
      .notNull()
      .references(() => produk.id, { onDelete: 'restrict' }),
    qty: integer('qty').notNull(),
    hargaSatuan: integer('harga_satuan').notNull(),
    subtotal: integer('subtotal').notNull(),
    catatanKue: text('catatan_kue'),
    dibuatPada: dibuatPada(),
  },
  (table) => [check('pre_order_item_qty_check', sql`${table.qty} > 0`)],
);

/** HPP tidak disimpan; disalin saat PO diambil menjadi penjualan. */
export const preOrderItemAddOn = pgTable(
  'pre_order_item_add_on',
  {
    id: id(),
    preOrderItemId: uuid('pre_order_item_id')
      .notNull()
      .references(() => preOrderItem.id, { onDelete: 'cascade' }),
    addOnId: uuid('add_on_id')
      .notNull()
      .references(() => addOn.id, { onDelete: 'restrict' }),
    hargaNormal: integer('harga_normal').notNull(),
    harga: integer('harga').notNull(),
    dibuatPada: dibuatPada(),
  },
  (table) => [
    unique('pre_order_item_add_on_item_add_on_unique').on(table.preOrderItemId, table.addOnId),
    index('pre_order_item_add_on_add_on_idx').on(table.addOnId),
    check('pre_order_item_add_on_harga_normal_check', sql`${table.hargaNormal} >= 0`),
    check('pre_order_item_add_on_harga_check', sql`${table.harga} >= 0`),
  ],
);

export const poPembayaran = pgTable(
  'po_pembayaran',
  {
    id: id(),
    preOrderId: uuid('pre_order_id')
      .notNull()
      .references(() => preOrder.id, { onDelete: 'restrict' }),
    jenis: jenisBayarPoEnum('jenis').notNull(),
    nominal: integer('nominal').notNull(),
    metode: metodeBayarEnum('metode').notNull(),
    waktu: timestamp('waktu', { withTimezone: true }).notNull().defaultNow(),
    dibuatOleh: dibuatOleh(() => pengguna.id),
  },
  (table) => [check('po_pembayaran_nominal_check', sql`${table.nominal} > 0`)],
);

export const invoice = pgTable(
  'invoice',
  {
    id: id(),
    noInvoice: text('no_invoice').notNull().unique(),
    preOrderId: uuid('pre_order_id').references(() => preOrder.id, { onDelete: 'restrict' }),
    penjualanId: uuid('penjualan_id').references(() => penjualan.id, { onDelete: 'restrict' }),
    tanggal: date('tanggal').notNull(),
    jatuhTempo: date('jatuh_tempo'),
    dibuatPada: dibuatPada(),
  },
  (table) => [
    check(
      'invoice_satu_sumber_check',
      sql`num_nonnulls(${table.preOrderId}, ${table.penjualanId}) = 1`,
    ),
  ],
);
