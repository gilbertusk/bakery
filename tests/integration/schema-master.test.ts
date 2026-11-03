import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  bahan,
  konversiSatuan,
  pengaturanToko,
  produk,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
} from '@/db/schema';

import { buatPenggunaTest, resetData, testDb } from './setup/db';

async function pembuatPengguna() {
  return buatPenggunaTest();
}

async function buatDataDasar() {
  await pembuatPengguna();

  const [bahanBaru] = await testDb
    .insert(bahan)
    .values({ nama: `Tepung ${randomUUID()}`, kategori: 'tepung', satuanDasar: 'g' })
    .returning();
  const [resepBaru] = await testDb
    .insert(resepAdonan)
    .values({ nama: `Adonan ${randomUUID()}`, modeHasil: 'timbang', hasilGram: '100' })
    .returning();
  const [produkBaru] = await testDb
    .insert(produk)
    .values({ nama: `Produk ${randomUUID()}`, kategori: 'brownies', hargaJual: 10_000 })
    .returning();

  if (!bahanBaru || !resepBaru || !produkBaru) throw new Error('Gagal membuat data test');

  return { bahanBaru, resepBaru, produkBaru };
}

describe('constraint schema master dan resep', () => {
  beforeEach(resetData);

  it('menolak komponen tanpa resep maupun bahan', async () => {
    const { produkBaru } = await buatDataDasar();

    await expect(
      testDb.insert(produkKomponen).values({
        produkId: produkBaru.id,
        peran: 'topping',
        takaran: '1',
        takaranDasar: '1',
      }),
    ).rejects.toThrow();
  });

  it('menolak komponen yang mengisi resep dan bahan sekaligus', async () => {
    const { bahanBaru, resepBaru, produkBaru } = await buatDataDasar();

    await expect(
      testDb.insert(produkKomponen).values({
        produkId: produkBaru.id,
        peran: 'topping',
        resepAdonanId: resepBaru.id,
        bahanId: bahanBaru.id,
        takaran: '1',
        takaranDasar: '1',
      }),
    ).rejects.toThrow();
  });

  it("menolak peran 'adonan' yang menunjuk bahan", async () => {
    const { bahanBaru, produkBaru } = await buatDataDasar();

    await expect(
      testDb.insert(produkKomponen).values({
        produkId: produkBaru.id,
        peran: 'adonan',
        bahanId: bahanBaru.id,
        takaran: '1',
        takaranDasar: '1',
      }),
    ).rejects.toThrow();
  });

  it('menolak nama bahan duplikat tanpa membedakan kapital', async () => {
    await pembuatPengguna();
    await testDb.insert(bahan).values({ nama: 'Tepung', kategori: 'tepung', satuanDasar: 'g' });

    await expect(
      testDb.insert(bahan).values({ nama: 'tepung', kategori: 'tepung', satuanDasar: 'g' }),
    ).rejects.toThrow();
  });

  it('menolak nama konversi duplikat per bahan tanpa membedakan kapital', async () => {
    const { bahanBaru } = await buatDataDasar();
    await testDb
      .insert(konversiSatuan)
      .values({ bahanId: bahanBaru.id, namaSatuan: 'Sdm', nilaiDasar: '8' });

    await expect(
      testDb
        .insert(konversiSatuan)
        .values({ bahanId: bahanBaru.id, namaSatuan: 'sdm', nilaiDasar: '8' }),
    ).rejects.toThrow();
  });

  it('menolak pengaturan toko dengan id selain 1', async () => {
    await expect(testDb.insert(pengaturanToko).values({ id: 2 })).rejects.toThrow();
  });

  it('menolak resep berbentuk bulat tanpa diameter', async () => {
    await expect(
      testDb.insert(resepAdonan).values({
        nama: 'Adonan Bulat Tanpa Diameter',
        modeHasil: 'timbang',
        hasilGram: '100',
        bentukLoyang: 'bulat',
      }),
    ).rejects.toThrow();
  });

  it('menerima rangkaian bahan, konversi, resep, produk, dan komponen yang valid', async () => {
    const { bahanBaru, resepBaru, produkBaru } = await buatDataDasar();
    const [konversi] = await testDb
      .insert(konversiSatuan)
      .values({ bahanId: bahanBaru.id, namaSatuan: 'Sdm', nilaiDasar: '8' })
      .returning();

    if (!konversi) throw new Error('Gagal membuat konversi test');

    await testDb.insert(resepAdonanItem).values({
      resepAdonanId: resepBaru.id,
      bahanId: bahanBaru.id,
      takaran: '2',
      konversiSatuanId: konversi.id,
      takaranDasar: '16',
      urutan: 1,
    });
    const [komponen] = await testDb
      .insert(produkKomponen)
      .values({
        produkId: produkBaru.id,
        peran: 'adonan',
        resepAdonanId: resepBaru.id,
        takaran: '20',
        takaranDasar: '20',
      })
      .returning();

    expect(komponen?.produkId).toBe(produkBaru.id);
  });
});
