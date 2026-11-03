import { relations } from 'drizzle-orm';

import { kas, kategoriKas } from './kas';
import { bahan, konversiSatuan, supplier } from './master';
import { penjualan, penjualanItem } from './penjualan';
import { invoice, poPembayaran, preOrder, preOrderItem } from './po';
import { biayaTambahan, produk, produkKomponen, resepAdonan, resepAdonanItem } from './resep';
import { auditLog, pengguna } from './sistem';
import {
  pembelian,
  pembelianItem,
  produksi,
  produksiHasil,
  riwayatHarga,
  stokMutasi,
  stokOpname,
  stokOpnameItem,
} from './stok';

export const penggunaRelations = relations(pengguna, ({ many }) => ({
  auditLogs: many(auditLog),
  pembelian: many(pembelian),
  riwayatHarga: many(riwayatHarga),
  produksi: many(produksi),
  stokMutasi: many(stokMutasi),
  stokOpname: many(stokOpname),
  penjualanDibuat: many(penjualan, { relationName: 'penjualanDibuatOleh' }),
  penjualanDibatalkan: many(penjualan, { relationName: 'penjualanDibatalkanOleh' }),
  preOrder: many(preOrder),
  poPembayaran: many(poPembayaran),
  kas: many(kas),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  pengguna: one(pengguna, { fields: [auditLog.penggunaId], references: [pengguna.id] }),
}));

export const supplierRelations = relations(supplier, ({ many }) => ({
  bahan: many(bahan),
  pembelian: many(pembelian),
}));

export const bahanRelations = relations(bahan, ({ many, one }) => ({
  supplierUtama: one(supplier, {
    fields: [bahan.supplierUtamaId],
    references: [supplier.id],
  }),
  konversiSatuan: many(konversiSatuan),
  resepAdonanItems: many(resepAdonanItem),
  produkKomponen: many(produkKomponen),
  pembelianItems: many(pembelianItem),
  riwayatHarga: many(riwayatHarga),
  stokMutasi: many(stokMutasi),
  stokOpnameItems: many(stokOpnameItem),
}));

export const konversiSatuanRelations = relations(konversiSatuan, ({ many, one }) => ({
  bahan: one(bahan, { fields: [konversiSatuan.bahanId], references: [bahan.id] }),
  resepAdonanItems: many(resepAdonanItem),
  produkKomponen: many(produkKomponen),
}));

export const resepAdonanRelations = relations(resepAdonan, ({ many, one }) => ({
  indukResep: one(resepAdonan, {
    fields: [resepAdonan.indukResepId],
    references: [resepAdonan.id],
    relationName: 'duplikatResep',
  }),
  turunanResep: many(resepAdonan, { relationName: 'duplikatResep' }),
  items: many(resepAdonanItem),
  produkKomponen: many(produkKomponen),
  produksi: many(produksi),
}));

export const resepAdonanItemRelations = relations(resepAdonanItem, ({ one }) => ({
  resepAdonan: one(resepAdonan, {
    fields: [resepAdonanItem.resepAdonanId],
    references: [resepAdonan.id],
  }),
  bahan: one(bahan, { fields: [resepAdonanItem.bahanId], references: [bahan.id] }),
  konversiSatuan: one(konversiSatuan, {
    fields: [resepAdonanItem.konversiSatuanId],
    references: [konversiSatuan.id],
  }),
}));

export const produkRelations = relations(produk, ({ many }) => ({
  komponen: many(produkKomponen),
  biayaTambahan: many(biayaTambahan),
  produksiHasil: many(produksiHasil),
  penjualanItems: many(penjualanItem),
  preOrderItems: many(preOrderItem),
  stokMutasi: many(stokMutasi),
  stokOpnameItems: many(stokOpnameItem),
}));

export const produkKomponenRelations = relations(produkKomponen, ({ one }) => ({
  produk: one(produk, { fields: [produkKomponen.produkId], references: [produk.id] }),
  resepAdonan: one(resepAdonan, {
    fields: [produkKomponen.resepAdonanId],
    references: [resepAdonan.id],
  }),
  bahan: one(bahan, { fields: [produkKomponen.bahanId], references: [bahan.id] }),
  konversiSatuan: one(konversiSatuan, {
    fields: [produkKomponen.konversiSatuanId],
    references: [konversiSatuan.id],
  }),
}));

export const biayaTambahanRelations = relations(biayaTambahan, ({ one }) => ({
  produk: one(produk, { fields: [biayaTambahan.produkId], references: [produk.id] }),
}));

export const pembelianRelations = relations(pembelian, ({ many, one }) => ({
  supplier: one(supplier, { fields: [pembelian.supplierId], references: [supplier.id] }),
  dibuatOleh: one(pengguna, { fields: [pembelian.dibuatOleh], references: [pengguna.id] }),
  items: many(pembelianItem),
}));

export const pembelianItemRelations = relations(pembelianItem, ({ many, one }) => ({
  pembelian: one(pembelian, {
    fields: [pembelianItem.pembelianId],
    references: [pembelian.id],
  }),
  bahan: one(bahan, { fields: [pembelianItem.bahanId], references: [bahan.id] }),
  riwayatHarga: many(riwayatHarga),
}));

export const riwayatHargaRelations = relations(riwayatHarga, ({ one }) => ({
  bahan: one(bahan, { fields: [riwayatHarga.bahanId], references: [bahan.id] }),
  pembelianItem: one(pembelianItem, {
    fields: [riwayatHarga.pembelianItemId],
    references: [pembelianItem.id],
  }),
  dibuatOleh: one(pengguna, { fields: [riwayatHarga.dibuatOleh], references: [pengguna.id] }),
}));

export const produksiRelations = relations(produksi, ({ many, one }) => ({
  resepAdonan: one(resepAdonan, {
    fields: [produksi.resepAdonanId],
    references: [resepAdonan.id],
  }),
  dibuatOleh: one(pengguna, { fields: [produksi.dibuatOleh], references: [pengguna.id] }),
  hasil: many(produksiHasil),
}));

export const produksiHasilRelations = relations(produksiHasil, ({ one }) => ({
  produksi: one(produksi, { fields: [produksiHasil.produksiId], references: [produksi.id] }),
  produk: one(produk, { fields: [produksiHasil.produkId], references: [produk.id] }),
}));

export const stokMutasiRelations = relations(stokMutasi, ({ one }) => ({
  bahan: one(bahan, { fields: [stokMutasi.bahanId], references: [bahan.id] }),
  produk: one(produk, { fields: [stokMutasi.produkId], references: [produk.id] }),
  dibuatOleh: one(pengguna, { fields: [stokMutasi.dibuatOleh], references: [pengguna.id] }),
}));

export const stokOpnameRelations = relations(stokOpname, ({ many, one }) => ({
  dibuatOleh: one(pengguna, { fields: [stokOpname.dibuatOleh], references: [pengguna.id] }),
  items: many(stokOpnameItem),
}));

export const stokOpnameItemRelations = relations(stokOpnameItem, ({ one }) => ({
  stokOpname: one(stokOpname, {
    fields: [stokOpnameItem.stokOpnameId],
    references: [stokOpname.id],
  }),
  bahan: one(bahan, { fields: [stokOpnameItem.bahanId], references: [bahan.id] }),
  produk: one(produk, { fields: [stokOpnameItem.produkId], references: [produk.id] }),
}));

export const penjualanRelations = relations(penjualan, ({ many, one }) => ({
  preOrder: one(preOrder, { fields: [penjualan.preOrderId], references: [preOrder.id] }),
  dibuatOleh: one(pengguna, {
    fields: [penjualan.dibuatOleh],
    references: [pengguna.id],
    relationName: 'penjualanDibuatOleh',
  }),
  dibatalkanOleh: one(pengguna, {
    fields: [penjualan.dibatalkanOleh],
    references: [pengguna.id],
    relationName: 'penjualanDibatalkanOleh',
  }),
  items: many(penjualanItem),
  invoice: many(invoice),
}));

export const penjualanItemRelations = relations(penjualanItem, ({ one }) => ({
  penjualan: one(penjualan, {
    fields: [penjualanItem.penjualanId],
    references: [penjualan.id],
  }),
  produk: one(produk, { fields: [penjualanItem.produkId], references: [produk.id] }),
}));

export const preOrderRelations = relations(preOrder, ({ many, one }) => ({
  dibuatOleh: one(pengguna, { fields: [preOrder.dibuatOleh], references: [pengguna.id] }),
  penjualan: one(penjualan),
  items: many(preOrderItem),
  pembayaran: many(poPembayaran),
  invoice: many(invoice),
}));

export const preOrderItemRelations = relations(preOrderItem, ({ one }) => ({
  preOrder: one(preOrder, { fields: [preOrderItem.preOrderId], references: [preOrder.id] }),
  produk: one(produk, { fields: [preOrderItem.produkId], references: [produk.id] }),
}));

export const poPembayaranRelations = relations(poPembayaran, ({ one }) => ({
  preOrder: one(preOrder, { fields: [poPembayaran.preOrderId], references: [preOrder.id] }),
  dibuatOleh: one(pengguna, { fields: [poPembayaran.dibuatOleh], references: [pengguna.id] }),
}));

export const invoiceRelations = relations(invoice, ({ one }) => ({
  preOrder: one(preOrder, { fields: [invoice.preOrderId], references: [preOrder.id] }),
  penjualan: one(penjualan, { fields: [invoice.penjualanId], references: [penjualan.id] }),
}));

export const kategoriKasRelations = relations(kategoriKas, ({ many }) => ({
  kas: many(kas),
}));

export const kasRelations = relations(kas, ({ one }) => ({
  kategori: one(kategoriKas, { fields: [kas.kategoriKasId], references: [kategoriKas.id] }),
  dibuatOleh: one(pengguna, { fields: [kas.dibuatOleh], references: [pengguna.id] }),
}));
