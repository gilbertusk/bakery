import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bahan,
  konversiSatuan,
  produk as produkTable,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
} from '@/db/schema';
import { setAktifResep, simpanResep } from '@/features/resep/actions';
import { ambilBiayaResep, daftarResep, detailResep, pilihanBahan } from '@/features/resep/queries';
import { getPengguna } from '@/lib/auth/pengguna';
import { BAHAN, RESEP_BROWNIES } from '@/lib/hpp/__fixtures__/brownies';

import { buatBahanTest, buatProdukTest } from './setup/data';
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

async function buatBahanDenganKonversi(input: {
  nama: string;
  satuanDasar?: 'g' | 'ml' | 'pcs';
  harga?: string;
  satuan?: string;
  nilai?: string;
}) {
  const [baris] = await testDb
    .insert(bahan)
    .values({
      nama: input.nama,
      kategori: 'bahan',
      satuanDasar: input.satuanDasar ?? 'g',
      hargaPerSatuan: input.harga ?? '10',
    })
    .returning();
  if (!baris) throw new Error('Gagal membuat bahan');
  if (!input.satuan) return { bahan: baris, konversi: null };
  const [konversi] = await testDb
    .insert(konversiSatuan)
    .values({ bahanId: baris.id, namaSatuan: input.satuan, nilaiDasar: input.nilai ?? '1' })
    .returning();
  return { bahan: baris, konversi: konversi! };
}

const INFO_RESEP = {
  nama: 'Brownies Uji',
  modeHasil: 'otomatis' as const,
  hasilGram: null,
  caraBuat: 'Aduk rata',
  loyang: null,
};

describe('simpanResep', () => {
  it('menyimpan sdm dan butir, menghitung takaran dasar serta hasil otomatis g + ml', async () => {
    const tepung = await buatBahanDenganKonversi({
      nama: 'Tepung',
      satuan: 'sdm',
      nilai: '8',
    });
    const telur = await buatBahanDenganKonversi({
      nama: 'Telur',
      satuan: 'butir',
      nilai: '55',
    });
    const susu = await buatBahanDenganKonversi({ nama: 'Susu', satuanDasar: 'ml' });

    const hasil = await simpanResep({
      id: null,
      ...INFO_RESEP,
      items: [
        { bahanId: tepung.bahan.id, takaran: '2', konversiSatuanId: tepung.konversi!.id },
        { bahanId: telur.bahan.id, takaran: '3', konversiSatuanId: telur.konversi!.id },
        { bahanId: susu.bahan.id, takaran: '100', konversiSatuanId: null },
      ],
    });

    expect(hasil).toMatchObject({
      ok: true,
      data: { peringatan: ['Susu diasumsikan 1 ml = 1 g'] },
    });
    if (!hasil.ok) throw new Error(hasil.error);
    const [resep] = await testDb
      .select()
      .from(resepAdonan)
      .where(eq(resepAdonan.id, hasil.data.id));
    expect(resep).toMatchObject({ modeHasil: 'otomatis', hasilGram: '281.000' });
    const items = await testDb
      .select({ takaranDasar: resepAdonanItem.takaranDasar, urutan: resepAdonanItem.urutan })
      .from(resepAdonanItem)
      .where(eq(resepAdonanItem.resepAdonanId, hasil.data.id))
      .orderBy(asc(resepAdonanItem.urutan));
    expect(items).toEqual([
      { takaranDasar: '16.000', urutan: 1 },
      { takaranDasar: '165.000', urutan: 2 },
      { takaranDasar: '100.000', urutan: 3 },
    ]);
  });

  it('mode timbang menyimpan hasil input, cara buat, dan loyang', async () => {
    const tepung = await buatBahanTest('Tepung');
    const hasil = await simpanResep({
      id: null,
      nama: 'Brownies Timbang',
      modeHasil: 'timbang',
      hasilGram: '1.200',
      caraBuat: ' Panggang 30 menit ',
      loyang: { bentuk: 'kotak', panjangCm: '20', lebarCm: '20' },
      items: [{ bahanId: tepung.id, takaran: '250', konversiSatuanId: null }],
    });

    expect(hasil).toMatchObject({ ok: true });
    if (!hasil.ok) throw new Error(hasil.error);
    const [resep] = await testDb
      .select()
      .from(resepAdonan)
      .where(eq(resepAdonan.id, hasil.data.id));
    expect(resep).toMatchObject({
      hasilGram: '1200.000',
      caraBuat: 'Panggang 30 menit',
      bentukLoyang: 'kotak',
      panjangCm: '20.00',
      lebarCm: '20.00',
      diameterCm: null,
    });
  });

  it('menolak konversi milik bahan lain dan membatalkan seluruh transaksi', async () => {
    const tepung = await buatBahanDenganKonversi({ nama: 'Tepung', satuan: 'sdm', nilai: '8' });
    const gula = await buatBahanTest('Gula');

    await expect(
      simpanResep({
        id: null,
        ...INFO_RESEP,
        items: [{ bahanId: gula.id, takaran: '2', konversiSatuanId: tepung.konversi!.id }],
      }),
    ).resolves.toEqual({
      ok: false,
      error: 'Konversi satuan tidak cocok dengan bahan',
      fieldErrors: {
        'items.0.konversiSatuanId': ['Konversi satuan tidak cocok dengan bahan'],
      },
    });
    await expect(testDb.select().from(resepAdonan)).resolves.toHaveLength(0);
  });

  it('ubah resep mengganti seluruh item dan mempertahankan id', async () => {
    const tepung = await buatBahanTest('Tepung');
    const gula = await buatBahanTest('Gula');
    const dibuat = await simpanResep({
      id: null,
      ...INFO_RESEP,
      items: [{ bahanId: tepung.id, takaran: '100', konversiSatuanId: null }],
    });
    if (!dibuat.ok) throw new Error(dibuat.error);

    const diubah = await simpanResep({
      id: dibuat.data.id,
      ...INFO_RESEP,
      nama: 'Brownies Baru',
      items: [{ bahanId: gula.id, takaran: '200', konversiSatuanId: null }],
    });

    expect(diubah).toMatchObject({ ok: true, data: { id: dibuat.data.id } });
    await expect(
      testDb
        .select({ bahanId: resepAdonanItem.bahanId, urutan: resepAdonanItem.urutan })
        .from(resepAdonanItem)
        .where(eq(resepAdonanItem.resepAdonanId, dibuat.data.id)),
    ).resolves.toEqual([{ bahanId: gula.id, urutan: 1 }]);
  });

  it('nama duplikat beda kapital ditolak di field nama dan id tidak ada ditolak', async () => {
    const tepung = await buatBahanTest('Tepung');
    const input = {
      id: null,
      ...INFO_RESEP,
      items: [{ bahanId: tepung.id, takaran: '100', konversiSatuanId: null }],
    };
    await simpanResep(input);

    await expect(simpanResep({ ...input, nama: 'BROWNIES UJI' })).resolves.toMatchObject({
      ok: false,
      fieldErrors: { nama: ['Resep dengan nama ini sudah ada'] },
    });
    await expect(simpanResep({ ...input, id: TIDAK_ADA, nama: 'Tidak Ada' })).resolves.toEqual({
      ok: false,
      error: 'Resep tidak ditemukan',
    });
  });
});

describe('query biaya dan detail resep', () => {
  async function buatFixtureBrownies() {
    const idBahan = new Map<string, string>();
    for (const data of Object.values(BAHAN)) {
      const [baris] = await testDb
        .insert(bahan)
        .values({
          nama: data.nama,
          kategori: 'fixture',
          satuanDasar: data.id === 'kemasan-cup' ? 'pcs' : 'g',
          hargaPerSatuan: data.hargaPerSatuan,
        })
        .returning();
      idBahan.set(data.id, baris!.id);
    }
    const [resep] = await testDb
      .insert(resepAdonan)
      .values({
        nama: RESEP_BROWNIES.nama,
        modeHasil: 'timbang',
        hasilGram: RESEP_BROWNIES.hasilGram,
      })
      .returning();
    await testDb.insert(resepAdonanItem).values(
      RESEP_BROWNIES.items.map((item, index) => ({
        resepAdonanId: resep!.id,
        bahanId: idBahan.get(item.bahanId)!,
        takaran: item.takaranDasar,
        takaranDasar: item.takaranDasar,
        urutan: index + 1,
      })),
    );
    return { resep: resep!, idBahan };
  }

  it('ambilBiayaResep cocok dengan fixture Brownies dan id kosong tidak query bermasalah', async () => {
    const { resep } = await buatFixtureBrownies();

    const biaya = await ambilBiayaResep(testDb, [resep.id]);
    expect(biaya.get(resep.id)?.biayaTotal.toString()).toBe('50550');
    expect(biaya.get(resep.id)?.biayaPerGram.toString()).toBe('42.125');
    await expect(ambilBiayaResep(testDb, [])).resolves.toEqual(new Map());
  });

  it('daftarResep menghitung biaya dan jumlah produk tanpa N+1 per resep', async () => {
    const { resep } = await buatFixtureBrownies();
    const produkA = await buatProdukTest('Brownies Cup');
    const produkB = await buatProdukTest('Brownies Loyang');
    await testDb.insert(produkKomponen).values([
      {
        produkId: produkA.id,
        peran: 'adonan',
        resepAdonanId: resep.id,
        takaran: '50',
        takaranDasar: '50',
      },
      {
        produkId: produkB.id,
        peran: 'adonan',
        resepAdonanId: resep.id,
        takaran: '1000',
        takaranDasar: '1000',
      },
    ]);

    await expect(daftarResep()).resolves.toEqual([
      {
        id: resep.id,
        nama: 'Brownies Panggang',
        hasilGram: '1200.000',
        biayaTotal: '50550',
        biayaPerGram: '42.125',
        jumlahProduk: 2,
        aktif: true,
      },
    ]);
  });

  it('detailResep memuat item, biaya, konversi bahan, dan produk pemakai', async () => {
    const { resep, idBahan } = await buatFixtureBrownies();
    await testDb.insert(konversiSatuan).values({
      bahanId: idBahan.get('tepung')!,
      namaSatuan: 'sdm',
      nilaiDasar: '8',
    });
    const produk = await buatProdukTest('Brownies Cup');
    await testDb.insert(produkKomponen).values({
      produkId: produk.id,
      peran: 'adonan',
      resepAdonanId: resep.id,
      takaran: '50',
      takaranDasar: '50',
    });

    const detail = await detailResep(resep.id);
    expect(detail).toMatchObject({
      id: resep.id,
      nama: 'Brownies Panggang',
      biayaTotal: '50550',
      biayaPerGram: '42.125',
      produk: [{ id: produk.id, nama: 'Brownies Cup', aktif: true }],
    });
    expect(detail?.items).toHaveLength(7);
    expect(detail?.items[0]).toMatchObject({
      namaBahan: 'Tepung Terigu',
      takaran: '250.000',
      takaranDasar: '250.000',
      biaya: '3750',
      konversi: [{ namaSatuan: 'sdm', nilaiDasar: '8.0000' }],
    });
    await expect(detailResep(TIDAK_ADA)).resolves.toBeNull();
  });

  it('pilihanBahan hanya bahan aktif, dengan konversi dan harga', async () => {
    const aktif = await buatBahanDenganKonversi({ nama: 'Gula', satuan: 'sdm', nilai: '12.5' });
    const nonaktif = await buatBahanTest('Bahan Lama');
    await testDb.update(bahan).set({ aktif: false }).where(eq(bahan.id, nonaktif.id));

    await expect(pilihanBahan()).resolves.toEqual([
      {
        id: aktif.bahan.id,
        nama: 'Gula',
        satuanDasar: 'g',
        hargaPerSatuan: '10.0000',
        konversi: [
          {
            id: aktif.konversi!.id,
            namaSatuan: 'sdm',
            nilaiDasar: '12.5000',
          },
        ],
      },
    ]);
  });
});

describe('setAktifResep dan otorisasi', () => {
  async function resepBaru() {
    const tepung = await buatBahanTest('Tepung');
    const hasil = await simpanResep({
      id: null,
      ...INFO_RESEP,
      items: [{ bahanId: tepung.id, takaran: '100', konversiSatuanId: null }],
    });
    if (!hasil.ok) throw new Error(hasil.error);
    return hasil.data.id;
  }

  it('menonaktifkan resep yang dipakai produk aktif ditolak dengan nama produk', async () => {
    const id = await resepBaru();
    const produk = await buatProdukTest('Brownies Cup');
    await testDb.insert(produkKomponen).values({
      produkId: produk.id,
      peran: 'adonan',
      resepAdonanId: id,
      takaran: '50',
      takaranDasar: '50',
    });

    await expect(setAktifResep({ id, aktif: false })).resolves.toEqual({
      ok: false,
      error: 'Resep tidak bisa dinonaktifkan karena dipakai produk aktif Brownies Cup',
    });
    await testDb.update(produkTable).set({ aktif: false }).where(eq(produkTable.id, produk.id));
    await expect(setAktifResep({ id, aktif: false })).resolves.toMatchObject({ ok: true });
  });

  it('id resep tidak ada ditolak', async () => {
    await expect(setAktifResep({ id: TIDAK_ADA, aktif: false })).resolves.toEqual({
      ok: false,
      error: 'Resep tidak ditemukan',
    });
  });

  it('kasir ditolak menyimpan dan mengubah status resep', async () => {
    const id = await resepBaru();
    const tepung = await buatBahanTest('Tepung Lain');
    getPenggunaMock.mockResolvedValue(KASIR);
    const ditolak = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };

    await expect(
      simpanResep({
        id: null,
        ...INFO_RESEP,
        nama: 'Resep Kasir',
        items: [{ bahanId: tepung.id, takaran: '1', konversiSatuanId: null }],
      }),
    ).resolves.toEqual(ditolak);
    await expect(setAktifResep({ id, aktif: false })).resolves.toEqual(ditolak);
    await expect(testDb.select().from(resepAdonan)).resolves.toHaveLength(1);
  });
});
