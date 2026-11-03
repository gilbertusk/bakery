import { type AnyPgColumn, timestamp, uuid } from 'drizzle-orm/pg-core';

export function id() {
  return uuid('id').defaultRandom().primaryKey();
}

export function dibuatPada() {
  return timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull();
}

export function diubahPada() {
  return timestamp('diubah_pada', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();
}

export function dibuatOleh(referensi: () => AnyPgColumn) {
  return uuid('dibuat_oleh').references(referensi, { onDelete: 'restrict' });
}
