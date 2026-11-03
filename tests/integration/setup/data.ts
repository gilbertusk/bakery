import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '@/db/schema';
import { bahan, produk } from '@/db/schema';

import { testDb } from './db';

export async function buatBahanTest(nama = `Bahan ${randomUUID()}`) {
  const [baris] = await testDb
    .insert(bahan)
    .values({ nama, kategori: 'tepung', satuanDasar: 'g', hargaPerSatuan: '15.0000' })
    .returning();
  if (!baris) throw new Error('Gagal membuat bahan test');
  return baris;
}

export async function buatProdukTest(nama = `Produk ${randomUUID()}`) {
  const [baris] = await testDb
    .insert(produk)
    .values({ nama, kategori: 'kue', hargaJual: 15_000 })
    .returning();
  if (!baris) throw new Error('Gagal membuat produk test');
  return baris;
}

/** Client dengan banyak koneksi untuk menguji transaksi yang benar-benar bersamaan. */
export function buatDbParalel(maks = 20) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL untuk test belum diisi di .env.test');
  const client = postgres(databaseUrl, { max: maks, onnotice: () => undefined });
  const database = drizzle({ client, schema, casing: 'snake_case' });
  return { database, tutup: () => client.end() };
}
