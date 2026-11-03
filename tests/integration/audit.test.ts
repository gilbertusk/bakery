import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { auditLog } from '@/db/schema';
import { D } from '@/lib/angka';
import { catatAudit } from '@/lib/audit';

import { buatPenggunaTest, resetData, testDb } from './setup/db';

let penggunaId: string;

beforeEach(async () => {
  await resetData();
  penggunaId = await buatPenggunaTest();
});

describe('catatAudit', () => {
  it('update hanya menyimpan field yang berubah', async () => {
    const recordId = randomUUID();

    const baris = await testDb.transaction((tx) =>
      catatAudit(tx, {
        penggunaId,
        tabel: 'produk',
        recordId,
        aksi: 'update',
        dataLama: { nama: 'Brownies Cup', hargaJual: 15_000, aktif: true },
        dataBaru: { nama: 'Brownies Cup', hargaJual: 17_000, aktif: true },
      }),
    );

    expect(baris).toMatchObject({
      penggunaId,
      tabel: 'produk',
      recordId,
      aksi: 'update',
      dataLama: { hargaJual: 15_000 },
      dataBaru: { hargaJual: 17_000 },
    });
  });

  it('update tanpa perubahan tidak menulis apa pun', async () => {
    const baris = await testDb.transaction((tx) =>
      catatAudit(tx, {
        penggunaId,
        tabel: 'bahan',
        recordId: randomUUID(),
        aksi: 'update',
        dataLama: { hargaPerSatuan: '15.0000' },
        dataBaru: { hargaPerSatuan: D('15').toFixed(4) },
      }),
    );

    expect(baris).toBeNull();
    await expect(testDb.select().from(auditLog)).resolves.toHaveLength(0);
  });

  it('insert dan batal menyimpan data apa adanya (Decimal jadi string)', async () => {
    const recordId = randomUUID();
    await testDb.transaction(async (tx) => {
      await catatAudit(tx, {
        penggunaId,
        tabel: 'stok_mutasi',
        recordId,
        aksi: 'insert',
        dataBaru: { qty: D('-12.5'), alasan: 'tumpah' },
      });
      await catatAudit(tx, {
        penggunaId,
        tabel: 'penjualan',
        recordId,
        aksi: 'batal',
        dataLama: { status: 'selesai' },
        dataBaru: { status: 'batal', alasanBatal: 'salah input' },
      });
    });

    const semua = await testDb.select().from(auditLog).orderBy(auditLog.aksi);
    expect(semua).toHaveLength(2);
    expect(semua.find((a) => a.aksi === 'insert')).toMatchObject({
      dataLama: null,
      dataBaru: { qty: '-12.5', alasan: 'tumpah' },
    });
    expect(semua.find((a) => a.aksi === 'batal')).toMatchObject({
      dataLama: { status: 'selesai' },
      dataBaru: { status: 'batal', alasanBatal: 'salah input' },
    });
  });
});
