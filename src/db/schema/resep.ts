import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { dibuatPada, diubahPada, id } from './_kolom';
import { bentukLoyangEnum, metodeBiayaEnum, modeHasilEnum, peranKomponenEnum } from './enums';
import { bahan, konversiSatuan } from './master';

export const resepAdonan = pgTable(
  'resep_adonan',
  {
    id: id(),
    nama: text('nama').notNull(),
    modeHasil: modeHasilEnum('mode_hasil').notNull(),
    hasilGram: numeric('hasil_gram', { precision: 14, scale: 3 }).notNull(),
    caraBuat: text('cara_buat'),
    bentukLoyang: bentukLoyangEnum('bentuk_loyang'),
    diameterCm: numeric('diameter_cm', { precision: 8, scale: 2 }),
    panjangCm: numeric('panjang_cm', { precision: 8, scale: 2 }),
    lebarCm: numeric('lebar_cm', { precision: 8, scale: 2 }),
    indukResepId: uuid('induk_resep_id'),
    aktif: boolean('aktif').notNull().default(true),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [
    uniqueIndex('resep_adonan_nama_unique').on(sql`lower(${table.nama})`),
    check('resep_adonan_hasil_gram_check', sql`${table.hasilGram} > 0`),
    check(
      'resep_adonan_loyang_check',
      sql`(${table.bentukLoyang} IS NULL)
        OR (${table.bentukLoyang} = 'bulat' AND ${table.diameterCm} IS NOT NULL)
        OR (${table.bentukLoyang} = 'kotak' AND ${table.panjangCm} IS NOT NULL AND ${table.lebarCm} IS NOT NULL)`,
    ),
    foreignKey({
      name: 'resep_adonan_induk_resep_id_fk',
      columns: [table.indukResepId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  ],
);

export const resepAdonanItem = pgTable(
  'resep_adonan_item',
  {
    id: id(),
    resepAdonanId: uuid('resep_adonan_id')
      .notNull()
      .references(() => resepAdonan.id, { onDelete: 'cascade' }),
    bahanId: uuid('bahan_id')
      .notNull()
      .references(() => bahan.id, { onDelete: 'restrict' }),
    takaran: numeric('takaran', { precision: 14, scale: 3 }).notNull(),
    konversiSatuanId: uuid('konversi_satuan_id').references(() => konversiSatuan.id, {
      onDelete: 'restrict',
    }),
    takaranDasar: numeric('takaran_dasar', { precision: 14, scale: 3 }).notNull(),
    urutan: integer('urutan').notNull(),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [check('resep_adonan_item_takaran_check', sql`${table.takaran} > 0`)],
);

export const produk = pgTable(
  'produk',
  {
    id: id(),
    nama: text('nama').notNull(),
    kategori: text('kategori').notNull(),
    cetakan: text('cetakan'),
    hargaJual: integer('harga_jual').notNull(),
    targetMargin: numeric('target_margin', { precision: 5, scale: 4 }),
    stok: integer('stok').notNull().default(0),
    fotoUrl: text('foto_url'),
    dijual: boolean('dijual').notNull().default(true),
    aktif: boolean('aktif').notNull().default(true),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [
    uniqueIndex('produk_nama_unique').on(sql`lower(${table.nama})`),
    check('produk_harga_jual_check', sql`${table.hargaJual} >= 0`),
    check(
      'produk_target_margin_check',
      sql`${table.targetMargin} IS NULL OR (${table.targetMargin} >= 0 AND ${table.targetMargin} <= 0.95)`,
    ),
  ],
);

export const produkKomponen = pgTable(
  'produk_komponen',
  {
    id: id(),
    produkId: uuid('produk_id')
      .notNull()
      .references(() => produk.id, { onDelete: 'cascade' }),
    peran: peranKomponenEnum('peran').notNull(),
    resepAdonanId: uuid('resep_adonan_id').references(() => resepAdonan.id, {
      onDelete: 'restrict',
    }),
    bahanId: uuid('bahan_id').references(() => bahan.id, { onDelete: 'restrict' }),
    takaran: numeric('takaran', { precision: 14, scale: 3 }).notNull(),
    konversiSatuanId: uuid('konversi_satuan_id').references(() => konversiSatuan.id, {
      onDelete: 'restrict',
    }),
    takaranDasar: numeric('takaran_dasar', { precision: 14, scale: 3 }).notNull(),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [
    check(
      'produk_komponen_satu_sumber_check',
      sql`num_nonnulls(${table.resepAdonanId}, ${table.bahanId}) = 1`,
    ),
    check(
      'produk_komponen_peran_adonan_check',
      sql`${table.peran} <> 'adonan' OR ${table.resepAdonanId} IS NOT NULL`,
    ),
    check('produk_komponen_takaran_check', sql`${table.takaran} > 0`),
  ],
);

export const biayaTambahan = pgTable(
  'biaya_tambahan',
  {
    id: id(),
    nama: text('nama').notNull(),
    metode: metodeBiayaEnum('metode').notNull(),
    nilai: numeric('nilai', { precision: 14, scale: 4 }).notNull(),
    produkId: uuid('produk_id').references(() => produk.id, { onDelete: 'cascade' }),
    aktif: boolean('aktif').notNull().default(true),
    dibuatPada: dibuatPada(),
    diubahPada: diubahPada(),
  },
  (table) => [
    check('biaya_tambahan_nilai_check', sql`${table.nilai} >= 0`),
    check('biaya_tambahan_persen_check', sql`${table.metode} <> 'persen' OR ${table.nilai} <= 1`),
  ],
);
