import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { type JenisMutasi, bahan, produk, stokMutasi } from '@/db/schema';
import { StokTidakCukupError, catatMutasi, hitungUlangSaldo } from '@/lib/stok';

import { buatBahanTest, buatDbParalel, buatProdukTest } from './setup/data';
import { buatPenggunaTest, resetData, testDb } from './setup/db';

const paralel = buatDbParalel(5);

afterAll(async () => {
  await paralel.tutup();
});

let penggunaId: string;

beforeEach(async () => {
  await resetData();
  penggunaId = await buatPenggunaTest();
});

function mutasiBahan(bahanId: string, qty: string, jenis: JenisMutasi = 'penyesuaian') {
  return {
    jenis,
    target: { bahanId },
    qty,
    nilaiSatuan: '15',
    alasan: 'test',
    sumberTipe: 'manual' as const,
    sumberId: null,
    dibuatOleh: penggunaId,
    izinkanMinus: false,
  };
}

async function stokBahan(id: string) {
  const [baris] = await testDb.select({ stok: bahan.stok }).from(bahan).where(eq(bahan.id, id));
  return baris?.stok;
}

describe('catatMutasi', () => {
  it('saldo dan saldo_sesudah benar setelah beberapa mutasi', async () => {
    const tepung = await buatBahanTest('Tepung');

    await testDb.transaction(async (tx) => {
      expect(await catatMutasi(tx, mutasiBahan(tepung.id, '1000', 'stok_awal'))).toEqual({
        saldoSesudah: '1000.000',
        menjadiMinus: false,
      });
      await catatMutasi(tx, mutasiBahan(tepung.id, '-250.5'));
      await catatMutasi(tx, mutasiBahan(tepung.id, '0.125'));
    });

    expect(await stokBahan(tepung.id)).toBe('749.625');
    const kartu = await testDb
      .select({ qty: stokMutasi.qty, saldo: stokMutasi.saldoSesudah, oleh: stokMutasi.dibuatOleh })
      .from(stokMutasi)
      .where(eq(stokMutasi.bahanId, tepung.id))
      .orderBy(stokMutasi.waktu, stokMutasi.saldoSesudah);
    expect(kartu.map((m) => m.saldo).sort()).toEqual(['1000.000', '749.500', '749.625'].sort());
    expect(kartu.every((m) => m.oleh === penggunaId)).toBe(true);

    const rekonsiliasi = await testDb.transaction((tx) =>
      hitungUlangSaldo(tx, { bahanId: tepung.id }),
    );
    expect(rekonsiliasi.toString()).toBe('749.625');
  });

  it('qty dibulatkan ke 3 desimal dan nilai satuan ke 4 desimal', async () => {
    const gula = await buatBahanTest();
    await testDb.transaction((tx) =>
      catatMutasi(tx, {
        ...mutasiBahan(gula.id, '10.0005'),
        nilaiSatuan: '13.33335',
      }),
    );
    const [mutasi] = await testDb.select().from(stokMutasi).where(eq(stokMutasi.bahanId, gula.id));
    expect(mutasi?.qty).toBe('10.001');
    expect(mutasi?.nilaiSatuan).toBe('13.3334');
  });

  it('melempar StokTidakCukupError saat minus dilarang, tanpa mengubah data', async () => {
    const telur = await buatBahanTest('Telur');
    await testDb.transaction((tx) => catatMutasi(tx, mutasiBahan(telur.id, '100', 'stok_awal')));

    const gagal = testDb.transaction((tx) => catatMutasi(tx, mutasiBahan(telur.id, '-150')));
    await expect(gagal).rejects.toBeInstanceOf(StokTidakCukupError);
    await expect(gagal).rejects.toMatchObject({ nama: 'Telur', stok: '100', diminta: '150' });

    expect(await stokBahan(telur.id)).toBe('100.000');
  });

  it('minus diizinkan menandai menjadiMinus', async () => {
    const kue = await buatProdukTest('Brownies Cup');

    const hasil = await testDb.transaction((tx) =>
      catatMutasi(tx, {
        jenis: 'penjualan',
        target: { produkId: kue.id },
        qty: -3,
        nilaiSatuan: '2675.50',
        sumberTipe: 'penjualan',
        sumberId: null,
        dibuatOleh: penggunaId,
        izinkanMinus: true,
      }),
    );

    expect(hasil).toEqual({ saldoSesudah: '-3', menjadiMinus: true });
    const [baris] = await testDb
      .select({ stok: produk.stok })
      .from(produk)
      .where(eq(produk.id, kue.id));
    expect(baris?.stok).toBe(-3);
  });

  it('menjadiMinus false bila saldo sudah minus sebelumnya', async () => {
    const kue = await buatProdukTest();
    const input = {
      jenis: 'penjualan' as const,
      target: { produkId: kue.id },
      nilaiSatuan: '0',
      sumberTipe: 'penjualan' as const,
      sumberId: null,
      dibuatOleh: penggunaId,
      izinkanMinus: true,
    };
    await testDb.transaction(async (tx) => {
      await catatMutasi(tx, { ...input, qty: -1 });
      expect((await catatMutasi(tx, { ...input, qty: -1 })).menjadiMinus).toBe(false);
    });
  });

  it('rollback: error setelah catatMutasi mengembalikan stok dan mutasi', async () => {
    const mentega = await buatBahanTest();
    await testDb.transaction((tx) => catatMutasi(tx, mutasiBahan(mentega.id, '500', 'stok_awal')));

    await expect(
      testDb.transaction(async (tx) => {
        await catatMutasi(tx, mutasiBahan(mentega.id, '-200'));
        throw new Error('simpan penjualan gagal');
      }),
    ).rejects.toThrow('simpan penjualan gagal');

    expect(await stokBahan(mentega.id)).toBe('500.000');
    const mutasi = await testDb.select().from(stokMutasi).where(eq(stokMutasi.bahanId, mentega.id));
    expect(mutasi).toHaveLength(1);
  });

  it('dua transaksi paralel mengurangi stok yang sama tidak saling menimpa', async () => {
    const coklat = await buatBahanTest();
    await testDb.transaction((tx) => catatMutasi(tx, mutasiBahan(coklat.id, '1000', 'stok_awal')));

    await Promise.all(
      Array.from({ length: 5 }, () =>
        paralel.database.transaction(async (tx) => {
          await catatMutasi(tx, mutasiBahan(coklat.id, '-100'));
          await tx.execute('select pg_sleep(0.02)');
        }),
      ),
    );

    expect(await stokBahan(coklat.id)).toBe('500.000');
    const saldo = await testDb
      .select({ saldo: stokMutasi.saldoSesudah })
      .from(stokMutasi)
      .where(eq(stokMutasi.bahanId, coklat.id));
    expect(saldo.map((s) => s.saldo).sort()).toEqual(
      ['1000.000', '900.000', '800.000', '700.000', '600.000', '500.000'].sort(),
    );
  });

  it('paralel dengan stok terbatas: hanya yang cukup yang berhasil', async () => {
    const keju = await buatBahanTest();
    await testDb.transaction((tx) => catatMutasi(tx, mutasiBahan(keju.id, '250', 'stok_awal')));

    const hasil = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        paralel.database.transaction((tx) => catatMutasi(tx, mutasiBahan(keju.id, '-100'))),
      ),
    );

    expect(hasil.filter((h) => h.status === 'fulfilled')).toHaveLength(2);
    expect(
      hasil.filter((h) => h.status === 'rejected' && h.reason instanceof StokTidakCukupError),
    ).toHaveLength(3);
    expect(await stokBahan(keju.id)).toBe('50.000');
  });

  it('qty pecahan untuk produk ditolak', async () => {
    const kue = await buatProdukTest();
    await expect(
      testDb.transaction((tx) =>
        catatMutasi(tx, {
          jenis: 'produksi_hasil',
          target: { produkId: kue.id },
          qty: '1.5',
          nilaiSatuan: '0',
          sumberTipe: 'produksi',
          sumberId: null,
          dibuatOleh: penggunaId,
          izinkanMinus: false,
        }),
      ),
    ).rejects.toThrow('bilangan bulat');
  });

  it('qty nol ditolak', async () => {
    const tepung = await buatBahanTest();
    await expect(
      testDb.transaction((tx) => catatMutasi(tx, mutasiBahan(tepung.id, '0.0001'))),
    ).rejects.toThrow('tidak boleh nol');
  });

  it('target yang tidak ada ditolak', async () => {
    await expect(
      testDb.transaction((tx) =>
        catatMutasi(tx, mutasiBahan('00000000-0000-4000-8000-000000000000', '1')),
      ),
    ).rejects.toThrow('tidak ditemukan');
  });

  it('hitungUlangSaldo untuk produk tanpa mutasi bernilai 0', async () => {
    const kue = await buatProdukTest();
    const saldo = await testDb.transaction((tx) => hitungUlangSaldo(tx, { produkId: kue.id }));
    expect(saldo.toString()).toBe('0');
  });
});
