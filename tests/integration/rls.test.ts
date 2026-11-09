import { describe, expect, it } from 'vitest';

import { testSql } from './setup/db';

const EXPECTED_PUBLIC_TABLES = [
  'add_on',
  'audit_log',
  'bahan',
  'biaya_tambahan',
  'invoice',
  'kas',
  'kategori_kas',
  'konversi_satuan',
  'nomor_urut',
  'pembelian',
  'pembelian_item',
  'pengaturan_toko',
  'pengguna',
  'penjualan',
  'penjualan_item',
  'penjualan_item_add_on',
  'po_pembayaran',
  'pre_order',
  'pre_order_item',
  'pre_order_item_add_on',
  'produk',
  'produk_komponen',
  'produksi',
  'produksi_hasil',
  'resep_adonan',
  'resep_adonan_item',
  'riwayat_harga',
  'stok_mutasi',
  'stok_opname',
  'stok_opname_item',
  'supplier',
];

describe('RLS deny-all', () => {
  it('aktif untuk setiap tabel public dan daftar tabel sama dengan ERD', async () => {
    const tables = await testSql<{ tableName: string; rlsEnabled: boolean }[]>`
      SELECT c.relname AS "tableName", c.relrowsecurity AS "rlsEnabled"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `;
    const actualNames = tables.map(({ tableName }) => tableName);
    const withoutRls = tables
      .filter(({ rlsEnabled }) => !rlsEnabled)
      .map(({ tableName }) => tableName);

    expect(actualNames, 'Daftar tabel public berbeda dari ERD').toEqual(EXPECTED_PUBLIC_TABLES);
    expect(withoutRls, `RLS belum aktif: ${withoutRls.join(', ')}`).toEqual([]);
  });
});
