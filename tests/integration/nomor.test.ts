import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { nomorUrut } from '@/db/schema';
import { hariIniWib } from '@/lib/format';
import { ambilNomor } from '@/lib/nomor';

import { buatDbParalel } from './setup/data';
import { resetData, testDb } from './setup/db';

const paralel = buatDbParalel(20);

afterAll(async () => {
  await paralel.tutup();
});

beforeEach(async () => {
  await resetData();
});

describe('ambilNomor', () => {
  it('nomor pertama hari ini memakai tanggal WIB dan urutan 001', async () => {
    const nomor = await testDb.transaction((tx) => ambilNomor(tx, 'NT'));
    const yymmdd = hariIniWib().slice(2).replaceAll('-', '');
    expect(nomor).toBe(`NT-${yymmdd}-001`);
  });

  it('20 transaksi paralel mendapat nomor 001–020 tanpa celah dan tanpa duplikat', async () => {
    const hasil = await Promise.all(
      Array.from({ length: 20 }, () =>
        paralel.database.transaction((tx) => ambilNomor(tx, 'NT', '2026-11-03')),
      ),
    );

    const urut = [...hasil].sort();
    expect(new Set(hasil).size).toBe(20);
    expect(urut).toEqual(
      Array.from({ length: 20 }, (_, i) => `NT-261103-${String(i + 1).padStart(3, '0')}`),
    );
  });

  it('prefix berbeda punya urutan sendiri', async () => {
    await testDb.transaction(async (tx) => {
      expect(await ambilNomor(tx, 'NT', '2026-11-03')).toBe('NT-261103-001');
      expect(await ambilNomor(tx, 'NT', '2026-11-03')).toBe('NT-261103-002');
      expect(await ambilNomor(tx, 'PB', '2026-11-03')).toBe('PB-261103-001');
      expect(await ambilNomor(tx, 'PR', '2026-11-03')).toBe('PR-261103-001');
      expect(await ambilNomor(tx, 'PO', '2026-11-03')).toBe('PO-261103-001');
      expect(await ambilNomor(tx, 'INV', '2026-11-03')).toBe('INV-261103-001');
    });
  });

  it('hari berbeda reset ke 001', async () => {
    await testDb.transaction(async (tx) => {
      await ambilNomor(tx, 'NT', '2026-11-03');
      await ambilNomor(tx, 'NT', '2026-11-03');
      expect(await ambilNomor(tx, 'NT', '2026-11-04')).toBe('NT-261104-001');
    });
  });

  it('nomor yang diambil di transaksi gagal dikembalikan (rollback)', async () => {
    await expect(
      testDb.transaction(async (tx) => {
        await ambilNomor(tx, 'NT', '2026-11-03');
        throw new Error('gagal simpan nota');
      }),
    ).rejects.toThrow('gagal simpan nota');

    const nomor = await testDb.transaction((tx) => ambilNomor(tx, 'NT', '2026-11-03'));
    expect(nomor).toBe('NT-261103-001');
  });

  it('lanjut 4 digit setelah 999', async () => {
    await testDb.insert(nomorUrut).values({ prefix: 'NT', tanggal: '2026-11-03', terakhir: 999 });
    const nomor = await testDb.transaction((tx) => ambilNomor(tx, 'NT', '2026-11-03'));
    expect(nomor).toBe('NT-261103-1000');
  });
});
