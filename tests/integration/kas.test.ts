import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { kas, kategoriKas } from '@/db/schema';
import { seedSistem } from '@/db/seed/sistem';
import { batalkanKasDariSumber, catatKas, saldoAkun } from '@/lib/kas';
import { KATEGORI_KAS } from '@/lib/kas/kategori';

import { buatPenggunaTest, resetData, testDb } from './setup/db';

let penggunaId: string;

beforeEach(async () => {
  await resetData();
  await seedSistem(testDb);
  penggunaId = await buatPenggunaTest();
});

describe('catatKas', () => {
  it('mencatat kas dengan kategori dari nama dan jenis mengikuti kategori', async () => {
    const sumberId = randomUUID();
    const waktu = new Date('2026-11-02T17:30:00Z');

    const baris = await testDb.transaction((tx) =>
      catatKas(tx, {
        kategori: KATEGORI_KAS.PENJUALAN,
        akun: 'tunai',
        nominal: 45_000,
        keterangan: 'NT-261103-001',
        sumberTipe: 'penjualan',
        sumberId,
        dibuatOleh: penggunaId,
        waktu,
      }),
    );

    expect(baris).toMatchObject({
      jenis: 'masuk',
      akun: 'tunai',
      nominal: 45_000,
      keterangan: 'NT-261103-001',
      sumberTipe: 'penjualan',
      sumberId,
      dibatalkan: false,
      dibuatOleh: penggunaId,
    });
    expect(baris.waktu.toISOString()).toBe(waktu.toISOString());
  });

  it('menerima id kategori dan memakai jenis keluar untuk kategori keluar', async () => {
    const [listrik] = await testDb
      .select()
      .from(kategoriKas)
      .where(eq(kategoriKas.nama, 'Listrik'));
    if (!listrik) throw new Error('kategori Listrik belum di-seed');

    const baris = await testDb.transaction((tx) =>
      catatKas(tx, {
        kategori: listrik.id,
        akun: 'rekening',
        nominal: 250_000,
        keterangan: 'Token listrik',
        dibuatOleh: penggunaId,
      }),
    );

    expect(baris).toMatchObject({ jenis: 'keluar', kategoriKasId: listrik.id, sumberTipe: null });
  });

  it('menolak jenis yang tidak sama dengan jenis kategori', async () => {
    await expect(
      testDb.transaction((tx) =>
        catatKas(tx, {
          kategori: KATEGORI_KAS.PEMBELIAN_BAHAN,
          jenis: 'masuk',
          akun: 'tunai',
          nominal: 1_000,
          keterangan: 'salah',
          dibuatOleh: penggunaId,
        }),
      ),
    ).rejects.toThrow('tidak sesuai');
  });

  it.each([0, -500, 1.5])('menolak nominal %d', async (nominal) => {
    await expect(
      testDb.transaction((tx) =>
        catatKas(tx, {
          kategori: KATEGORI_KAS.PENJUALAN,
          akun: 'tunai',
          nominal,
          keterangan: 'x',
          dibuatOleh: penggunaId,
        }),
      ),
    ).rejects.toThrow('bilangan bulat lebih dari 0');
  });

  it('menolak kategori yang tidak ada', async () => {
    await expect(
      testDb.transaction((tx) =>
        catatKas(tx, {
          kategori: 'Kategori Fiktif',
          akun: 'tunai',
          nominal: 1_000,
          keterangan: 'x',
          dibuatOleh: penggunaId,
        }),
      ),
    ).rejects.toThrow('tidak ditemukan');
  });
});

describe('batalkanKasDariSumber dan saldoAkun', () => {
  async function isiKas() {
    const sumberPenjualan = randomUUID();
    await testDb.transaction(async (tx) => {
      await catatKas(tx, {
        kategori: KATEGORI_KAS.PENJUALAN,
        akun: 'tunai',
        nominal: 100_000,
        keterangan: 'nota 1',
        sumberTipe: 'penjualan',
        sumberId: sumberPenjualan,
        dibuatOleh: penggunaId,
      });
      await catatKas(tx, {
        kategori: KATEGORI_KAS.PENJUALAN,
        akun: 'tunai',
        nominal: 30_000,
        keterangan: 'nota 2',
        sumberTipe: 'penjualan',
        sumberId: randomUUID(),
        dibuatOleh: penggunaId,
      });
      await catatKas(tx, {
        kategori: KATEGORI_KAS.PEMBELIAN_BAHAN,
        akun: 'tunai',
        nominal: 20_000,
        keterangan: 'beli tepung',
        dibuatOleh: penggunaId,
      });
      await catatKas(tx, {
        kategori: KATEGORI_KAS.DP_PRE_ORDER,
        akun: 'rekening',
        nominal: 75_000,
        keterangan: 'DP',
        dibuatOleh: penggunaId,
      });
    });
    return sumberPenjualan;
  }

  it('saldo per akun = masuk − keluar', async () => {
    await isiKas();
    await expect(saldoAkun(testDb)).resolves.toEqual({ tunai: 110_000, rekening: 75_000 });
    await expect(saldoAkun(testDb, 'tunai')).resolves.toBe(110_000);
    await expect(saldoAkun(testDb, 'rekening')).resolves.toBe(75_000);
  });

  it('saldo kosong bernilai 0', async () => {
    await expect(saldoAkun(testDb)).resolves.toEqual({ tunai: 0, rekening: 0 });
    await expect(saldoAkun(testDb, 'rekening')).resolves.toBe(0);
  });

  it('kas dibatalkan tidak dihitung di saldo', async () => {
    const sumberId = await isiKas();

    const jumlah = await testDb.transaction((tx) =>
      batalkanKasDariSumber(tx, 'penjualan', sumberId),
    );

    expect(jumlah).toBe(1);
    await expect(saldoAkun(testDb, 'tunai')).resolves.toBe(10_000);
    const [baris] = await testDb.select().from(kas).where(eq(kas.sumberId, sumberId));
    expect(baris?.dibatalkan).toBe(true);
  });

  it('membatalkan dua kali tidak mengubah baris lagi', async () => {
    const sumberId = await isiKas();
    await testDb.transaction((tx) => batalkanKasDariSumber(tx, 'penjualan', sumberId));
    await expect(
      testDb.transaction((tx) => batalkanKasDariSumber(tx, 'penjualan', sumberId)),
    ).resolves.toBe(0);
  });
});
