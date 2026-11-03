import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  bahan,
  invoice,
  kas,
  kategoriKas,
  pembelian,
  pembelianItem,
  penjualan,
  penjualanItem,
  poPembayaran,
  preOrder,
  preOrderItem,
  produksi,
  produksiHasil,
  produk,
  resepAdonan,
  riwayatHarga,
  stokMutasi,
  stokOpname,
  stokOpnameItem,
} from '@/db/schema';

import { buatPenggunaTest, resetData, testDb } from './setup/db';

async function buatDataDasar() {
  const id = await buatPenggunaTest();

  const [bahanBaru] = await testDb
    .insert(bahan)
    .values({ nama: `Bahan ${id}`, kategori: 'tepung', satuanDasar: 'g' })
    .returning();
  const [resepBaru] = await testDb
    .insert(resepAdonan)
    .values({ nama: `Resep ${id}`, modeHasil: 'timbang', hasilGram: '100' })
    .returning();
  const [produkBaru] = await testDb
    .insert(produk)
    .values({ nama: `Produk ${id}`, kategori: 'kue', hargaJual: 10_000 })
    .returning();
  const [kategoriBaru] = await testDb
    .insert(kategoriKas)
    .values({ nama: `Kategori ${id}`, jenis: 'masuk', kelompok: 'penjualan' })
    .returning();

  if (!bahanBaru || !resepBaru || !produkBaru || !kategoriBaru) {
    throw new Error('Gagal membuat data dasar test');
  }

  return { penggunaId: id, bahanBaru, resepBaru, produkBaru, kategoriBaru };
}

async function buatPembelian() {
  const data = await buatDataDasar();
  const [transaksi] = await testDb
    .insert(pembelian)
    .values({
      noPembelian: `PB-${randomUUID()}`,
      tanggal: '2026-11-03',
      akunBayar: 'tunai',
      total: 10_000,
      dibuatOleh: data.penggunaId,
    })
    .returning();
  if (!transaksi) throw new Error('Gagal membuat pembelian test');
  return { ...data, transaksi };
}

async function buatPenjualan() {
  const data = await buatDataDasar();
  const [transaksi] = await testDb
    .insert(penjualan)
    .values({
      noNota: `NT-${randomUUID()}`,
      subtotal: 10_000,
      diskonNota: 0,
      total: 10_000,
      metodeBayar: 'tunai',
      dibayar: 10_000,
      kembalian: 0,
      dibuatOleh: data.penggunaId,
    })
    .returning();
  if (!transaksi) throw new Error('Gagal membuat penjualan test');
  return { ...data, transaksi };
}

describe('constraint transaksi stok', () => {
  beforeEach(resetData);

  it.each([
    ['jumlah kemasan', { jumlahKemasan: '0', isiPerKemasan: '100', totalHarga: 10_000 }],
    ['isi per kemasan', { jumlahKemasan: '1', isiPerKemasan: '0', totalHarga: 10_000 }],
    ['total harga', { jumlahKemasan: '1', isiPerKemasan: '100', totalHarga: -1 }],
  ])('menolak pembelian item dengan %s tidak valid', async (_nama, nilai) => {
    const { bahanBaru, transaksi } = await buatPembelian();
    await expect(
      testDb.insert(pembelianItem).values({
        pembelianId: transaksi.id,
        bahanId: bahanBaru.id,
        qtyDasar: '100',
        hargaPerSatuan: '100',
        ...nilai,
      }),
    ).rejects.toThrow();
  });

  it("menolak riwayat harga sumber 'pembelian' tanpa pembelian item", async () => {
    const { bahanBaru, penggunaId } = await buatDataDasar();
    await expect(
      testDb.insert(riwayatHarga).values({
        bahanId: bahanBaru.id,
        hargaLama: '10',
        hargaBeli: '12',
        hargaBaru: '12',
        sumber: 'pembelian',
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menolak faktor skala produksi nol', async () => {
    const { resepBaru, penggunaId } = await buatDataDasar();
    await expect(
      testDb.insert(produksi).values({
        noProduksi: `PR-${randomUUID()}`,
        tanggal: '2026-11-03',
        resepAdonanId: resepBaru.id,
        faktorSkala: '0',
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menolak jumlah hasil produksi negatif', async () => {
    const { resepBaru, produkBaru, penggunaId } = await buatDataDasar();
    const [produksiBaru] = await testDb
      .insert(produksi)
      .values({
        noProduksi: `PR-${randomUUID()}`,
        tanggal: '2026-11-03',
        resepAdonanId: resepBaru.id,
        faktorSkala: '1',
        dibuatOleh: penggunaId,
      })
      .returning();
    if (!produksiBaru) throw new Error('Gagal membuat produksi test');

    await expect(
      testDb.insert(produksiHasil).values({
        produksiId: produksiBaru.id,
        produkId: produkBaru.id,
        pcsRencana: -1,
        pcsAktual: 0,
        pcsAfkir: 0,
        hppRencana: '0',
        hppAktual: '0',
      }),
    ).rejects.toThrow();
  });

  it('menolak stok mutasi tanpa bahan maupun produk', async () => {
    const { penggunaId } = await buatDataDasar();
    await expect(
      testDb.insert(stokMutasi).values({
        jenis: 'penyesuaian',
        qty: '1',
        saldoSesudah: '1',
        nilaiSatuan: '0',
        alasan: 'Test',
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menolak stok mutasi dengan qty nol', async () => {
    const { bahanBaru, penggunaId } = await buatDataDasar();
    await expect(
      testDb.insert(stokMutasi).values({
        jenis: 'stok_awal',
        bahanId: bahanBaru.id,
        qty: '0',
        saldoSesudah: '0',
        nilaiSatuan: '0',
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menolak penyesuaian stok tanpa alasan', async () => {
    const { bahanBaru, penggunaId } = await buatDataDasar();
    await expect(
      testDb.insert(stokMutasi).values({
        jenis: 'penyesuaian',
        bahanId: bahanBaru.id,
        qty: '1',
        saldoSesudah: '1',
        nilaiSatuan: '0',
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menolak item opname tanpa bahan maupun produk', async () => {
    const { penggunaId } = await buatDataDasar();
    const [opname] = await testDb
      .insert(stokOpname)
      .values({ tanggal: '2026-11-03', target: 'bahan', dibuatOleh: penggunaId })
      .returning();
    if (!opname) throw new Error('Gagal membuat opname test');

    await expect(
      testDb.insert(stokOpnameItem).values({
        stokOpnameId: opname.id,
        stokSistem: '0',
        stokFisik: '0',
        selisih: '0',
        nilaiSelisih: '0',
      }),
    ).rejects.toThrow();
  });
});

describe('constraint penjualan, pre-order, dan kas', () => {
  beforeEach(resetData);

  it('menolak diskon nota di luar subtotal', async () => {
    const { penggunaId } = await buatDataDasar();
    await expect(
      testDb.insert(penjualan).values({
        noNota: `NT-${randomUUID()}`,
        subtotal: 10_000,
        diskonNota: 10_001,
        total: -1,
        metodeBayar: 'tunai',
        dibayar: 10_000,
        kembalian: 0,
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menolak total nota yang tidak sama dengan subtotal dikurangi diskon', async () => {
    const { penggunaId } = await buatDataDasar();
    await expect(
      testDb.insert(penjualan).values({
        noNota: `NT-${randomUUID()}`,
        subtotal: 10_000,
        diskonNota: 1_000,
        total: 10_000,
        metodeBayar: 'tunai',
        dibayar: 10_000,
        kembalian: 0,
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menolak penjualan batal tanpa metadata pembatalan', async () => {
    const { penggunaId } = await buatDataDasar();
    await expect(
      testDb.insert(penjualan).values({
        noNota: `NT-${randomUUID()}`,
        subtotal: 10_000,
        diskonNota: 0,
        total: 10_000,
        metodeBayar: 'tunai',
        dibayar: 10_000,
        kembalian: 0,
        status: 'batal',
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it.each([
    ['qty', { qty: 0, hargaSatuan: 10_000, diskonItem: 0, subtotal: 0 }],
    ['subtotal', { qty: 1, hargaSatuan: 10_000, diskonItem: 0, subtotal: 9_000 }],
    ['diskon item', { qty: 1, hargaSatuan: 10_000, diskonItem: 10_001, subtotal: -1 }],
  ])('menolak item penjualan dengan %s tidak valid', async (_nama, nilai) => {
    const { transaksi, produkBaru } = await buatPenjualan();
    await expect(
      testDb.insert(penjualanItem).values({
        penjualanId: transaksi.id,
        produkId: produkBaru.id,
        namaProduk: produkBaru.nama,
        hppSatuan: '5.00',
        ...nilai,
      }),
    ).rejects.toThrow();
  });

  it('menolak pre-order batal tanpa metadata pembatalan', async () => {
    const { penggunaId } = await buatDataDasar();
    await expect(
      testDb.insert(preOrder).values({
        noPo: `PO-${randomUUID()}`,
        namaPemesan: 'Pelanggan',
        kontak: '0812',
        tanggalAmbil: '2026-11-04',
        status: 'batal',
        total: 10_000,
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menolak item pre-order dengan qty nol', async () => {
    const { penggunaId, produkBaru } = await buatDataDasar();
    const [pesanan] = await testDb
      .insert(preOrder)
      .values({
        noPo: `PO-${randomUUID()}`,
        namaPemesan: 'Pelanggan',
        kontak: '0812',
        tanggalAmbil: '2026-11-04',
        total: 10_000,
        dibuatOleh: penggunaId,
      })
      .returning();
    if (!pesanan) throw new Error('Gagal membuat PO test');

    await expect(
      testDb.insert(preOrderItem).values({
        preOrderId: pesanan.id,
        produkId: produkBaru.id,
        qty: 0,
        hargaSatuan: 10_000,
        subtotal: 0,
      }),
    ).rejects.toThrow();
  });

  it('menolak pembayaran PO dengan nominal nol', async () => {
    const { penggunaId } = await buatDataDasar();
    const [pesanan] = await testDb
      .insert(preOrder)
      .values({
        noPo: `PO-${randomUUID()}`,
        namaPemesan: 'Pelanggan',
        kontak: '0812',
        tanggalAmbil: '2026-11-04',
        total: 10_000,
        dibuatOleh: penggunaId,
      })
      .returning();
    if (!pesanan) throw new Error('Gagal membuat PO test');

    await expect(
      testDb.insert(poPembayaran).values({
        preOrderId: pesanan.id,
        jenis: 'dp',
        nominal: 0,
        metode: 'tunai',
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menolak invoice tanpa sumber', async () => {
    await expect(
      testDb.insert(invoice).values({ noInvoice: `INV-${randomUUID()}`, tanggal: '2026-11-03' }),
    ).rejects.toThrow();
  });

  it('menolak kas dengan nominal nol', async () => {
    const { penggunaId, kategoriBaru } = await buatDataDasar();
    await expect(
      testDb.insert(kas).values({
        jenis: 'masuk',
        kategoriKasId: kategoriBaru.id,
        akun: 'tunai',
        nominal: 0,
        dibuatOleh: penggunaId,
      }),
    ).rejects.toThrow();
  });

  it('menerima alur pembelian, penjualan, PO, invoice, dan kas yang valid', async () => {
    const { penggunaId, bahanBaru, produkBaru, kategoriBaru } = await buatDataDasar();
    const [beli] = await testDb
      .insert(pembelian)
      .values({
        noPembelian: `PB-${randomUUID()}`,
        tanggal: '2026-11-03',
        akunBayar: 'tunai',
        total: 10_000,
        dibuatOleh: penggunaId,
      })
      .returning();
    const [jual] = await testDb
      .insert(penjualan)
      .values({
        noNota: `NT-${randomUUID()}`,
        subtotal: 10_000,
        diskonNota: 0,
        total: 10_000,
        metodeBayar: 'tunai',
        dibayar: 10_000,
        kembalian: 0,
        dibuatOleh: penggunaId,
      })
      .returning();
    const [pesanan] = await testDb
      .insert(preOrder)
      .values({
        noPo: `PO-${randomUUID()}`,
        namaPemesan: 'Pelanggan',
        kontak: '0812',
        tanggalAmbil: '2026-11-04',
        total: 10_000,
        dibuatOleh: penggunaId,
      })
      .returning();
    if (!beli || !jual || !pesanan) throw new Error('Gagal membuat transaksi valid');

    await testDb.insert(pembelianItem).values({
      pembelianId: beli.id,
      bahanId: bahanBaru.id,
      jumlahKemasan: '1',
      isiPerKemasan: '100',
      qtyDasar: '100',
      totalHarga: 10_000,
      hargaPerSatuan: '100',
    });
    await testDb.insert(penjualanItem).values({
      penjualanId: jual.id,
      produkId: produkBaru.id,
      namaProduk: produkBaru.nama,
      qty: 1,
      hargaSatuan: 10_000,
      diskonItem: 0,
      subtotal: 10_000,
      hppSatuan: '5.00',
    });
    await testDb.insert(preOrderItem).values({
      preOrderId: pesanan.id,
      produkId: produkBaru.id,
      qty: 1,
      hargaSatuan: 10_000,
      subtotal: 10_000,
    });
    await testDb.insert(poPembayaran).values({
      preOrderId: pesanan.id,
      jenis: 'dp',
      nominal: 5_000,
      metode: 'tunai',
      dibuatOleh: penggunaId,
    });
    const [tagihan] = await testDb
      .insert(invoice)
      .values({ noInvoice: `INV-${randomUUID()}`, preOrderId: pesanan.id, tanggal: '2026-11-03' })
      .returning();
    await testDb.insert(kas).values({
      jenis: 'masuk',
      kategoriKasId: kategoriBaru.id,
      akun: 'tunai',
      nominal: 5_000,
      sumberTipe: 'po_pembayaran',
      sumberId: pesanan.id,
      dibuatOleh: penggunaId,
    });

    expect(tagihan?.preOrderId).toBe(pesanan.id);
  });
});
