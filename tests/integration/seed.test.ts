import { beforeEach, describe, expect, it } from 'vitest';

import { eq, sql } from 'drizzle-orm';

import { kategoriKas, pengaturanToko } from '@/db/schema';
import { seedSistem } from '@/db/seed/sistem';
import { KATEGORI_KAS } from '@/lib/kas/kategori';

import { testDb } from './setup/db';

describe('seed sistem', () => {
  beforeEach(async () => {
    await testDb.delete(kategoriKas);
    await testDb.delete(pengaturanToko);
  });

  it('tetap idempoten saat dijalankan dua kali', async () => {
    await seedSistem(testDb);
    await seedSistem(testDb);

    const [result] = await testDb.select({ count: sql<number>`count(*)::int` }).from(kategoriKas);

    expect(result?.count).toBe(14);
  });

  it('tidak menimpa pengaturan yang telah diubah pengguna', async () => {
    await seedSistem(testDb);
    await testDb
      .update(pengaturanToko)
      .set({ namaToko: 'Nama Toko Baru', pembulatanSaranHarga: 1_000 })
      .where(eq(pengaturanToko.id, 1));

    await seedSistem(testDb);

    const [pengaturan] = await testDb.select().from(pengaturanToko);
    expect(pengaturan?.namaToko).toBe('Nama Toko Baru');
    expect(pengaturan?.pembulatanSaranHarga).toBe(1_000);
  });

  it('menyimpan semua kategori kas sistem dari konstanta', async () => {
    await seedSistem(testDb);

    const rows = await testDb.select({ nama: kategoriKas.nama }).from(kategoriKas);
    const names = new Set(rows.map(({ nama }) => nama));

    for (const nama of Object.values(KATEGORI_KAS) as string[]) {
      expect(names.has(nama), `Kategori kas belum di-seed: ${nama}`).toBe(true);
    }
  });
});
