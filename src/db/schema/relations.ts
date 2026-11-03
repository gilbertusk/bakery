import { relations } from 'drizzle-orm';

import { bahan, konversiSatuan, supplier } from './master';
import { biayaTambahan, produk, produkKomponen, resepAdonan, resepAdonanItem } from './resep';
import { auditLog, pengguna } from './sistem';

export const penggunaRelations = relations(pengguna, ({ many }) => ({
  auditLogs: many(auditLog),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  pengguna: one(pengguna, { fields: [auditLog.penggunaId], references: [pengguna.id] }),
}));

export const supplierRelations = relations(supplier, ({ many }) => ({
  bahan: many(bahan),
}));

export const bahanRelations = relations(bahan, ({ many, one }) => ({
  supplierUtama: one(supplier, {
    fields: [bahan.supplierUtamaId],
    references: [supplier.id],
  }),
  konversiSatuan: many(konversiSatuan),
  resepAdonanItems: many(resepAdonanItem),
  produkKomponen: many(produkKomponen),
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
