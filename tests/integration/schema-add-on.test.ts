import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  addOn,
  bahan,
  konversiSatuan,
  penjualan,
  penjualanItem,
  penjualanItemAddOn,
  preOrder,
  preOrderItem,
  preOrderItemAddOn,
  produk,
} from '@/db/schema';

import { buatPenggunaTest, resetData, testDb } from './setup/db';

async function buatBahan() {
  const [baris] = await testDb
    .insert(bahan)
    .values({ nama: `Keju ${randomUUID()}`, kategori: 'topping', satuanDasar: 'g' })
    .returning();
  if (!baris) throw new Error('Gagal membuat bahan test');
  return baris;
}

function nilaiAddOn(bahanId: string, lain: Partial<typeof addOn.$inferInsert> = {}) {
  return {
    nama: 'Extra keju',
    bahanId,
    takaran: '20',
    takaranDasar: '20',
    harga: 3_000,
    ...lain,
  };
}

async function buatAddOn() {
  const b = await buatBahan();
  const [baris] = await testDb.insert(addOn).values(nilaiAddOn(b.id)).returning();
  if (!baris) throw new Error('Gagal membuat add-on test');
  return { bahan: b, addOn: baris };
}

async function buatItemPenjualan() {
  const penggunaId = await buatPenggunaTest();
  const [p] = await testDb
    .insert(produk)
    .values({ nama: `Produk ${randomUUID()}`, kategori: 'kue', hargaJual: 5_000 })
    .returning();
  const [nota] = await testDb
    .insert(penjualan)
    .values({
      noNota: `NT-${randomUUID()}`,
      subtotal: 16_000,
      diskonNota: 0,
      total: 16_000,
      metodeBayar: 'tunai',
      dibayar: 16_000,
      kembalian: 0,
      dibuatOleh: penggunaId,
    })
    .returning();
  if (!p || !nota) throw new Error('Gagal membuat penjualan test');
  const [item] = await testDb
    .insert(penjualanItem)
    .values({
      penjualanId: nota.id,
      produkId: p.id,
      namaProduk: p.nama,
      qty: 2,
      hargaSatuan: 5_000,
      hargaAddOn: 3_000,
      diskonItem: 0,
      subtotal: 16_000,
      hppSatuan: '2000.00',
    })
    .returning();
  if (!item) throw new Error('Gagal membuat item penjualan test');
  return { penggunaId, produk: p, nota, item };
}

async function buatItemPo() {
  const penggunaId = await buatPenggunaTest();
  const [p] = await testDb
    .insert(produk)
    .values({ nama: `Produk ${randomUUID()}`, kategori: 'kue', hargaJual: 5_000 })
    .returning();
  const [po] = await testDb
    .insert(preOrder)
    .values({
      noPo: `PO-${randomUUID()}`,
      namaPemesan: 'Pelanggan',
      kontak: '0812',
      tanggalAmbil: '2026-11-10',
      total: 8_000,
      dibuatOleh: penggunaId,
    })
    .returning();
  if (!p || !po) throw new Error('Gagal membuat PO test');
  const [item] = await testDb
    .insert(preOrderItem)
    .values({ preOrderId: po.id, produkId: p.id, qty: 1, hargaSatuan: 5_000, subtotal: 8_000 })
    .returning();
  if (!item) throw new Error('Gagal membuat item PO test');
  return { po, item };
}

describe('constraint add_on', () => {
  beforeEach(resetData);

  it('menerima add-on valid dengan default aktif dan timestamp', async () => {
    const { addOn: baris } = await buatAddOn();
    expect(baris).toMatchObject({
      nama: 'Extra keju',
      takaran: '20.000',
      konversiSatuanId: null,
      takaranDasar: '20.000',
      harga: 3_000,
      aktif: true,
    });
    expect(baris.dibuatPada).toBeInstanceOf(Date);
    expect(baris.diubahPada).toBeInstanceOf(Date);
  });

  it('nama unik tanpa membedakan huruf besar/kecil', async () => {
    const { bahan: b } = await buatAddOn();
    await expect(
      testDb.insert(addOn).values(nilaiAddOn(b.id, { nama: 'EXTRA KEJU' })),
    ).rejects.toThrow();
  });

  it.each([
    ['takaran 0', { takaran: '0' }],
    ['takaran dasar 0', { takaranDasar: '0' }],
    ['harga negatif', { harga: -1 }],
  ])('menolak %s', async (_nama, lain) => {
    const b = await buatBahan();
    await expect(testDb.insert(addOn).values(nilaiAddOn(b.id, lain))).rejects.toThrow();
  });

  it('bahan yang dipakai add-on tidak bisa dihapus', async () => {
    const { bahan: b } = await buatAddOn();
    await expect(testDb.delete(bahan).where(eq(bahan.id, b.id))).rejects.toThrow();
  });

  it('menerima konversi satuan bahan', async () => {
    const b = await buatBahan();
    const [k] = await testDb
      .insert(konversiSatuan)
      .values({ bahanId: b.id, namaSatuan: 'sdm', nilaiDasar: '7' })
      .returning();
    const [baris] = await testDb
      .insert(addOn)
      .values(nilaiAddOn(b.id, { takaran: '2', konversiSatuanId: k!.id, takaranDasar: '14' }))
      .returning();
    expect(baris?.konversiSatuanId).toBe(k!.id);
  });
});

describe('constraint penjualan_item dengan add-on', () => {
  beforeEach(resetData);

  it('subtotal = qty × (harga satuan + harga add-on) − diskon', async () => {
    const { item } = await buatItemPenjualan();
    expect(item).toMatchObject({ hargaAddOn: 3_000, subtotal: 16_000 });
  });

  it('harga_add_on default 0 untuk item tanpa add-on', async () => {
    const { nota, produk: p } = await buatItemPenjualan();
    const [item] = await testDb
      .insert(penjualanItem)
      .values({
        penjualanId: nota.id,
        produkId: p.id,
        namaProduk: p.nama,
        qty: 1,
        hargaSatuan: 5_000,
        subtotal: 5_000,
        hppSatuan: '2000.00',
      })
      .returning();
    expect(item?.hargaAddOn).toBe(0);
  });

  it.each([
    ['subtotal tanpa harga add-on', { hargaAddOn: 3_000, diskonItem: 0, subtotal: 10_000 }],
    ['harga add-on negatif', { hargaAddOn: -1_000, diskonItem: 0, subtotal: 8_000 }],
    ['diskon melebihi baris', { hargaAddOn: 3_000, diskonItem: 16_001, subtotal: -1 }],
  ])('menolak %s', async (_nama, nilai) => {
    const { nota, produk: p } = await buatItemPenjualan();
    await expect(
      testDb.insert(penjualanItem).values({
        penjualanId: nota.id,
        produkId: p.id,
        namaProduk: p.nama,
        qty: 2,
        hargaSatuan: 5_000,
        hppSatuan: '2000.00',
        ...nilai,
      }),
    ).rejects.toThrow();
  });

  it('diskon boleh sampai seluruh baris termasuk add-on', async () => {
    const { nota, produk: p } = await buatItemPenjualan();
    const [item] = await testDb
      .insert(penjualanItem)
      .values({
        penjualanId: nota.id,
        produkId: p.id,
        namaProduk: p.nama,
        qty: 2,
        hargaSatuan: 5_000,
        hargaAddOn: 3_000,
        diskonItem: 16_000,
        subtotal: 0,
        hppSatuan: '2000.00',
      })
      .returning();
    expect(item?.subtotal).toBe(0);
  });
});

describe('constraint penjualan_item_add_on', () => {
  beforeEach(resetData);

  function nilai(penjualanItemId: string, addOnId: string, lain = {}) {
    return {
      penjualanItemId,
      addOnId,
      namaAddOn: 'Extra keju',
      hargaNormal: 3_000,
      harga: 3_000,
      hppSatuan: '2200.00',
      ...lain,
    };
  }

  it('menerima add-on item; maks. 1× per item', async () => {
    const { addOn: a } = await buatAddOn();
    const { item } = await buatItemPenjualan();
    await testDb.insert(penjualanItemAddOn).values(nilai(item.id, a.id));
    await expect(
      testDb.insert(penjualanItemAddOn).values(nilai(item.id, a.id, { harga: 2_000 })),
    ).rejects.toThrow();
  });

  it.each([
    ['harga normal negatif', { hargaNormal: -1 }],
    ['harga negatif', { harga: -1 }],
  ])('menolak %s', async (_nama, lain) => {
    const { addOn: a } = await buatAddOn();
    const { item } = await buatItemPenjualan();
    await expect(
      testDb.insert(penjualanItemAddOn).values(nilai(item.id, a.id, lain)),
    ).rejects.toThrow();
  });

  it('ikut terhapus bersama item; add-on terpakai tidak bisa dihapus', async () => {
    const { addOn: a } = await buatAddOn();
    const { item } = await buatItemPenjualan();
    await testDb.insert(penjualanItemAddOn).values(nilai(item.id, a.id));

    await expect(testDb.delete(addOn).where(eq(addOn.id, a.id))).rejects.toThrow();

    await testDb.delete(penjualanItem).where(eq(penjualanItem.id, item.id));
    expect(await testDb.select().from(penjualanItemAddOn)).toHaveLength(0);
  });
});

describe('constraint pre_order_item_add_on', () => {
  beforeEach(resetData);

  it('menerima add-on item PO; maks. 1× per item', async () => {
    const { addOn: a } = await buatAddOn();
    const { item } = await buatItemPo();
    const nilai = { preOrderItemId: item.id, addOnId: a.id, hargaNormal: 3_000, harga: 3_000 };
    await testDb.insert(preOrderItemAddOn).values(nilai);
    await expect(testDb.insert(preOrderItemAddOn).values(nilai)).rejects.toThrow();
  });

  it.each([
    ['harga normal negatif', { hargaNormal: -1, harga: 0 }],
    ['harga negatif', { hargaNormal: 0, harga: -1 }],
  ])('menolak %s', async (_nama, lain) => {
    const { addOn: a } = await buatAddOn();
    const { item } = await buatItemPo();
    await expect(
      testDb.insert(preOrderItemAddOn).values({ preOrderItemId: item.id, addOnId: a.id, ...lain }),
    ).rejects.toThrow();
  });

  it('ikut terhapus bersama item PO; add-on terpakai tidak bisa dihapus', async () => {
    const { addOn: a } = await buatAddOn();
    const { item } = await buatItemPo();
    await testDb
      .insert(preOrderItemAddOn)
      .values({ preOrderItemId: item.id, addOnId: a.id, hargaNormal: 3_000, harga: 3_000 });

    await expect(testDb.delete(addOn).where(eq(addOn.id, a.id))).rejects.toThrow();

    await testDb.delete(preOrderItem).where(eq(preOrderItem.id, item.id));
    expect(await testDb.select().from(preOrderItemAddOn)).toHaveLength(0);
  });
});
