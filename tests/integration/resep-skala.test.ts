import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bahan, konversiSatuan, resepAdonan, resepAdonanItem } from '@/db/schema';
import { duplikatResep, simpanLoyangResep } from '@/features/resep/actions';
import { detailResep } from '@/features/resep/queries';
import { getPengguna } from '@/lib/auth/pengguna';

import { buatPenggunaTest, resetData, testDb } from './setup/db';

vi.mock('@/lib/auth/pengguna', () => ({ getPengguna: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/db/client', async () => {
  const { testDb: db } = await import('./setup/db');
  return { db };
});

const getPenggunaMock = vi.mocked(getPengguna);
const TIDAK_ADA = '33333333-3333-4333-8333-333333333333';
const KASIR = {
  id: '22222222-2222-4222-8222-222222222222',
  nama: 'Kasir',
  email: 'kasir@contoh.test',
  peran: 'kasir' as const,
};

beforeEach(async () => {
  await resetData();
  const pemilikId = await buatPenggunaTest('pemilik', 'Khansa');
  getPenggunaMock.mockReset();
  getPenggunaMock.mockResolvedValue({
    id: pemilikId,
    nama: 'Khansa',
    email: `${pemilikId}@contoh.test`,
    peran: 'pemilik',
  });
});

async function buatResepInduk() {
  const [tepung, telur] = await testDb
    .insert(bahan)
    .values([
      {
        nama: 'Tepung',
        kategori: 'tepung',
        satuanDasar: 'g',
        hargaPerSatuan: '15',
      },
      {
        nama: 'Telur',
        kategori: 'telur',
        satuanDasar: 'g',
        hargaPerSatuan: '30',
      },
    ])
    .returning();
  if (!tepung || !telur) throw new Error('Gagal membuat bahan test');
  const [butir] = await testDb
    .insert(konversiSatuan)
    .values({ bahanId: telur.id, namaSatuan: 'butir', nilaiDasar: '55' })
    .returning();
  if (!butir) throw new Error('Gagal membuat konversi test');
  const [resep] = await testDb
    .insert(resepAdonan)
    .values({
      nama: 'Brownies 20 cm',
      modeHasil: 'timbang',
      hasilGram: '1200',
      caraBuat: 'Aduk lalu panggang',
      bentukLoyang: 'bulat',
      diameterCm: '20',
    })
    .returning();
  if (!resep) throw new Error('Gagal membuat resep test');
  await testDb.insert(resepAdonanItem).values([
    {
      resepAdonanId: resep.id,
      bahanId: tepung.id,
      takaran: '250',
      takaranDasar: '250',
      urutan: 1,
    },
    {
      resepAdonanId: resep.id,
      bahanId: telur.id,
      takaran: '4',
      konversiSatuanId: butir.id,
      takaranDasar: '220',
      urutan: 2,
    },
  ]);
  return resep;
}

describe('duplikatResep', () => {
  it('menyalin resep dan seluruh item dengan induk, lalu salinannya independen', async () => {
    const induk = await buatResepInduk();

    const hasil = await duplikatResep({ resepId: induk.id, namaBaru: 'Brownies Keju' });

    expect(hasil).toMatchObject({ ok: true });
    if (!hasil.ok) throw new Error(hasil.error);
    const [salinan] = await testDb
      .select()
      .from(resepAdonan)
      .where(eq(resepAdonan.id, hasil.data.id));
    expect(salinan).toMatchObject({
      nama: 'Brownies Keju',
      modeHasil: induk.modeHasil,
      hasilGram: induk.hasilGram,
      caraBuat: induk.caraBuat,
      bentukLoyang: 'bulat',
      diameterCm: '20.00',
      indukResepId: induk.id,
    });

    const items = await testDb
      .select({
        id: resepAdonanItem.id,
        resepId: resepAdonanItem.resepAdonanId,
        bahanId: resepAdonanItem.bahanId,
        takaran: resepAdonanItem.takaran,
        konversiId: resepAdonanItem.konversiSatuanId,
        takaranDasar: resepAdonanItem.takaranDasar,
        urutan: resepAdonanItem.urutan,
      })
      .from(resepAdonanItem)
      .orderBy(asc(resepAdonanItem.resepAdonanId), asc(resepAdonanItem.urutan));
    const itemInduk = items.filter((item) => item.resepId === induk.id);
    const itemSalinan = items.filter((item) => item.resepId === hasil.data.id);
    const isiItem = (item: (typeof items)[number]) => ({
      bahanId: item.bahanId,
      takaran: item.takaran,
      konversiId: item.konversiId,
      takaranDasar: item.takaranDasar,
      urutan: item.urutan,
    });
    expect(itemSalinan.map(isiItem)).toEqual(itemInduk.map(isiItem));
    expect(itemSalinan.map((item) => item.id)).not.toEqual(itemInduk.map((item) => item.id));

    await testDb
      .update(resepAdonanItem)
      .set({ takaran: '300', takaranDasar: '300' })
      .where(eq(resepAdonanItem.id, itemSalinan[0]!.id));
    const [indukTetap] = await testDb
      .select({ takaran: resepAdonanItem.takaran })
      .from(resepAdonanItem)
      .where(eq(resepAdonanItem.id, itemInduk[0]!.id));
    expect(indukTetap?.takaran).toBe('250.000');
  });

  it('menolak nama duplikat dan resep yang tidak ada', async () => {
    const induk = await buatResepInduk();
    await expect(
      duplikatResep({ resepId: induk.id, namaBaru: 'BROWNIES 20 CM' }),
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: { namaBaru: ['Resep dengan nama ini sudah ada'] },
    });
    await expect(duplikatResep({ resepId: TIDAK_ADA, namaBaru: 'Tidak Ada' })).resolves.toEqual({
      ok: false,
      error: 'Resep tidak ditemukan',
    });
  });

  it('detail induk dan salinan memuat hubungan varian', async () => {
    const induk = await buatResepInduk();
    const hasil = await duplikatResep({ resepId: induk.id, namaBaru: 'Brownies Keju' });
    if (!hasil.ok) throw new Error(hasil.error);

    await expect(detailResep(induk.id)).resolves.toMatchObject({
      indukResep: null,
      varian: [{ id: hasil.data.id, nama: 'Brownies Keju', aktif: true }],
    });
    await expect(detailResep(hasil.data.id)).resolves.toMatchObject({
      indukResep: { id: induk.id, nama: 'Brownies 20 cm', aktif: true },
      varian: [],
    });
  });
});

describe('simpanLoyangResep', () => {
  it('menyimpan loyang acuan dan mengganti bentuk secara atomik', async () => {
    const resep = await buatResepInduk();
    await expect(
      simpanLoyangResep({
        resepId: resep.id,
        loyang: { bentuk: 'kotak', panjangCm: '24', lebarCm: '18' },
      }),
    ).resolves.toMatchObject({ ok: true, data: { id: resep.id } });

    const [baris] = await testDb.select().from(resepAdonan).where(eq(resepAdonan.id, resep.id));
    expect(baris).toMatchObject({
      bentukLoyang: 'kotak',
      diameterCm: null,
      panjangCm: '24.00',
      lebarCm: '18.00',
    });
  });

  it('resep tidak ada dan kasir ditolak tanpa perubahan', async () => {
    const resep = await buatResepInduk();
    await expect(
      simpanLoyangResep({
        resepId: TIDAK_ADA,
        loyang: { bentuk: 'bulat', diameterCm: '24' },
      }),
    ).resolves.toEqual({ ok: false, error: 'Resep tidak ditemukan' });

    getPenggunaMock.mockResolvedValue(KASIR);
    const ditolak = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };
    await expect(duplikatResep({ resepId: resep.id, namaBaru: 'Resep Kasir' })).resolves.toEqual(
      ditolak,
    );
    await expect(
      simpanLoyangResep({
        resepId: resep.id,
        loyang: { bentuk: 'bulat', diameterCm: '24' },
      }),
    ).resolves.toEqual(ditolak);
    await expect(testDb.select().from(resepAdonan)).resolves.toHaveLength(1);
  });
});
