import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { addOn, bahan, stokMutasi } from '@/db/schema';
import { seedContoh } from '@/db/seed/contoh';
import { hitungUlangSaldo } from '@/lib/stok';

import { resetData, testDb } from './setup/db';

beforeEach(async () => {
  await resetData();
});

describe('seed data contoh', () => {
  it('stok awal tercatat lewat buku besar dan cocok dengan saldo cache', async () => {
    await seedContoh(testDb);
    await seedContoh(testDb);

    const semuaBahan = await testDb.select().from(bahan);
    expect(semuaBahan.length).toBeGreaterThan(0);

    for (const item of semuaBahan) {
      const mutasi = await testDb.select().from(stokMutasi).where(eq(stokMutasi.bahanId, item.id));
      expect(mutasi, item.nama).toHaveLength(1);
      expect(mutasi[0]).toMatchObject({ jenis: 'stok_awal', saldoSesudah: item.stok });

      const saldo = await testDb.transaction((tx) => hitungUlangSaldo(tx, { bahanId: item.id }));
      expect(saldo.toFixed(3), item.nama).toBe(item.stok);
    }

    const [tepung] = semuaBahan.filter((b) => b.nama === 'Tepung Terigu');
    expect(tepung?.stok).toBe('5000.000');
  });

  it('add-on contoh Extra keju dan Extra coklat dibuat sekali', async () => {
    await seedContoh(testDb);
    await seedContoh(testDb);

    const daftar = await testDb
      .select({
        nama: addOn.nama,
        namaBahan: bahan.nama,
        takaranDasar: addOn.takaranDasar,
        harga: addOn.harga,
        aktif: addOn.aktif,
      })
      .from(addOn)
      .innerJoin(bahan, eq(bahan.id, addOn.bahanId))
      .orderBy(asc(addOn.nama));
    expect(daftar).toEqual([
      {
        nama: 'Extra coklat',
        namaBahan: 'Coklat Batang',
        takaranDasar: '15.000',
        harga: 2_000,
        aktif: true,
      },
      {
        nama: 'Extra keju',
        namaBahan: 'Keju Parut',
        takaranDasar: '20.000',
        harga: 3_000,
        aktif: true,
      },
    ]);
  });
});
