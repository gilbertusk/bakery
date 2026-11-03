import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { dibuatPada, diubahPada, id } from './_kolom';
import { aksiAuditEnum, metodeHargaEnum, peranEnum, ukuranKertasEnum } from './enums';

const authSchema = pgSchema('auth');

export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
});

export const pengguna = pgTable('pengguna', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  email: text('email').notNull().unique(),
  peran: peranEnum('peran').notNull().default('kasir'),
  aktif: boolean('aktif').notNull().default(true),
  dibuatPada: dibuatPada(),
  diubahPada: diubahPada(),
});

export const pengaturanToko = pgTable(
  'pengaturan_toko',
  {
    id: integer('id').primaryKey().default(1),
    namaToko: text('nama_toko').notNull().default('Toko Kue Khansa'),
    alamat: text('alamat'),
    telepon: text('telepon'),
    logoUrl: text('logo_url'),
    footerStruk: text('footer_struk').notNull().default('Terima kasih, selamat menikmati!'),
    infoPembayaran: text('info_pembayaran'),
    ukuranKertas: ukuranKertasEnum('ukuran_kertas').notNull().default('58'),
    metodeHarga: metodeHargaEnum('metode_harga').notNull().default('rata_rata'),
    targetMarginDefault: numeric('target_margin_default', { precision: 5, scale: 4 })
      .notNull()
      .default('0.3000'),
    izinkanStokProdukMinus: boolean('izinkan_stok_produk_minus').notNull().default(false),
    pembulatanSaranHarga: integer('pembulatan_saran_harga').notNull().default(500),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [check('pengaturan_toko_id_check', sql`${table.id} = 1`)],
);

export const nomorUrut = pgTable(
  'nomor_urut',
  {
    prefix: text('prefix').notNull(),
    tanggal: date('tanggal').notNull(),
    terakhir: integer('terakhir').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.prefix, table.tanggal] })],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    waktu: timestamp('waktu', { withTimezone: true }).notNull().defaultNow(),
    penggunaId: uuid('pengguna_id')
      .notNull()
      .references(() => pengguna.id, { onDelete: 'restrict' }),
    tabel: text('tabel').notNull(),
    recordId: uuid('record_id').notNull(),
    aksi: aksiAuditEnum('aksi').notNull(),
    dataLama: jsonb('data_lama'),
    dataBaru: jsonb('data_baru'),
  },
  (table) => [
    index('audit_log_tabel_record_id_idx').on(table.tabel, table.recordId),
    index('audit_log_waktu_idx').on(table.waktu.desc()),
  ],
);
