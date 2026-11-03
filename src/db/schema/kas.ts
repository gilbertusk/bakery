import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { dibuatOleh, dibuatPada, diubahPada, id } from './_kolom';
import { akunKasEnum, jenisKasEnum, kelompokKasEnum, sumberTipeEnum } from './enums';
import { pengguna } from './sistem';

export const kategoriKas = pgTable('kategori_kas', {
  id: id(),
  nama: text('nama').notNull().unique(),
  jenis: jenisKasEnum('jenis').notNull(),
  kelompok: kelompokKasEnum('kelompok').notNull(),
  sistem: boolean('sistem').notNull().default(false),
  dibuatPada: dibuatPada(),
  diubahPada: diubahPada(),
});

export const kas = pgTable(
  'kas',
  {
    id: id(),
    waktu: timestamp('waktu', { withTimezone: true }).notNull().defaultNow(),
    jenis: jenisKasEnum('jenis').notNull(),
    kategoriKasId: uuid('kategori_kas_id')
      .notNull()
      .references(() => kategoriKas.id, { onDelete: 'restrict' }),
    akun: akunKasEnum('akun').notNull(),
    nominal: integer('nominal').notNull(),
    keterangan: text('keterangan'),
    sumberTipe: sumberTipeEnum('sumber_tipe'),
    sumberId: uuid('sumber_id'),
    dibatalkan: boolean('dibatalkan').notNull().default(false),
    dibuatOleh: dibuatOleh(() => pengguna.id),
  },
  (table) => [
    check('kas_nominal_check', sql`${table.nominal} > 0`),
    index('kas_waktu_idx').on(table.waktu),
    index('kas_akun_idx').on(table.akun),
    index('kas_sumber_idx').on(table.sumberTipe, table.sumberId),
  ],
);
