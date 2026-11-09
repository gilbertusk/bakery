import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bahan, produk } from '@/db/schema';
import { seedContoh } from '@/db/seed/contoh';
import { simulasikanHargaBahan } from '@/features/simulasi/actions';
import { pilihanBahanSimulasi } from '@/features/simulasi/queries';
import { getPengguna } from '@/lib/auth/pengguna';

import { buatPenggunaTest, resetData, testDb, testSql } from './setup/db';

vi.mock('@/lib/auth/pengguna', () => ({ getPengguna: vi.fn() }));
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
  await seedContoh(testDb);
});

async function bahanId(nama: string): Promise<string> {
  const [baris] = await testDb.select({ id: bahan.id }).from(bahan).where(eq(bahan.nama, nama));
  if (!baris) throw new Error(`Bahan ${nama} tidak ditemukan`);
  return baris.id;
}

/** Snapshot seluruh isi tabel public, stabil terhadap urutan baris. */
async function snapshotDatabase(): Promise<string> {
  const tabel = await testSql<{ nama: string }[]>`
    SELECT tablename AS nama
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  const hasil: Record<string, unknown[]> = {};
  for (const { nama } of tabel) {
    const aman = `"${nama.replaceAll('"', '""')}"`;
    const baris = await testSql.unsafe<{ data: unknown }[]>(
      `SELECT to_jsonb(t) AS data FROM ${aman} t ORDER BY to_jsonb(t)::text`,
    );
    hasil[nama] = baris.map((item) => item.data);
  }
  return JSON.stringify(hasil);
}

describe('simulasikanHargaBahan', () => {
  it('coklat batang naik 10% → produk terdampak terurut dengan HPP, margin, dan saran harga', async () => {
    const coklat = await bahanId('Coklat Batang');

    const hasil = await simulasikanHargaBahan({
      perubahan: [{ bahanId: coklat, persen: 10 }],
    });

    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.data.jumlahProduk).toBe(3);
    expect(hasil.data.jumlahDiBawahTarget).toBe(0);
    expect(hasil.data.produk).toEqual([
      expect.objectContaining({
        nama: 'Brownies Loyang 20×20',
        hargaJual: 120_000,
        hppLama: '53125.00',
        hppBaru: '54625.00',
        selisih: '1500.00',
        marginLama: '0.5573',
        marginBaru: '0.5448',
        diBawahTarget: false,
        saranHarga: 78_500,
      }),
      expect.objectContaining({
        nama: 'Brownies Cup 50 g',
        hargaJual: 5_000,
        hppLama: '2606.25',
        hppBaru: '2681.25',
        selisih: '75.00',
        marginLama: '0.4788',
        marginBaru: '0.4638',
        diBawahTarget: false,
        saranHarga: 4_000,
      }),
      expect.objectContaining({
        nama: 'Brownies Bites 25 g',
        hargaJual: 3_000,
        hppLama: '1053.13',
        hppBaru: '1090.63',
        selisih: '37.50',
        marginLama: '0.649',
        marginBaru: '0.6365',
        diBawahTarget: false,
        saranHarga: 2_000,
      }),
    ]);
    expect(hasil.data.produk.every((item) => item.produkId.length > 0)).toBe(true);
  });

  it('beberapa perubahan digabung dan produk nonaktif tidak ditampilkan', async () => {
    const coklat = await bahanId('Coklat Batang');
    const kemasan = await bahanId('Kemasan Cup Plastik');
    await testDb.update(produk).set({ aktif: false }).where(eq(produk.nama, 'Brownies Bites 25 g'));

    const hasil = await simulasikanHargaBahan({
      perubahan: [
        { bahanId: coklat, persen: 10 },
        { bahanId: kemasan, persen: 20 },
      ],
    });

    expect(hasil).toMatchObject({
      ok: true,
      data: {
        jumlahProduk: 2,
        produk: [
          { nama: 'Brownies Loyang 20×20', selisih: '1500.00' },
          { nama: 'Brownies Cup 50 g', selisih: '175.00' },
        ],
      },
    });
  });

  it('0% atau bahan yang tidak dipakai menghasilkan ringkasan kosong', async () => {
    const keju = await bahanId('Keju Parut');
    const hasil = await simulasikanHargaBahan({ perubahan: [{ bahanId: keju, persen: 0 }] });
    expect(hasil).toEqual({
      ok: true,
      data: { jumlahProduk: 0, jumlahDiBawahTarget: 0, produk: [] },
    });
  });

  it('menolak bahan yang tidak ditemukan', async () => {
    expect(
      await simulasikanHargaBahan({ perubahan: [{ bahanId: TIDAK_ADA, persen: 10 }] }),
    ).toEqual({
      ok: false,
      error: 'Bahan tidak ditemukan',
      fieldErrors: { 'perubahan.0.bahanId': ['Bahan tidak ditemukan'] },
    });
  });

  it('hanya pemilik yang boleh menjalankan simulasi', async () => {
    const coklat = await bahanId('Coklat Batang');
    getPenggunaMock.mockResolvedValue(KASIR);
    expect(await simulasikanHargaBahan({ perubahan: [{ bahanId: coklat, persen: 10 }] })).toEqual({
      ok: false,
      error: 'Anda tidak berwenang melakukan aksi ini',
    });
  });

  it('tidak mengubah satu baris pun di database', async () => {
    const coklat = await bahanId('Coklat Batang');
    const sebelum = await snapshotDatabase();

    const hasil = await simulasikanHargaBahan({
      perubahan: [{ bahanId: coklat, persen: 200 }],
    });

    expect(hasil.ok).toBe(true);
    expect(await snapshotDatabase()).toBe(sebelum);
  });
});

describe('pilihanBahanSimulasi', () => {
  it('mengembalikan semua bahan urut nama, termasuk yang nonaktif', async () => {
    await testDb.update(bahan).set({ aktif: false }).where(eq(bahan.nama, 'Coklat Batang'));
    const hasil = await pilihanBahanSimulasi();
    expect(hasil.map((item) => item.nama)).toEqual(
      [...hasil.map((item) => item.nama)].sort((a, b) => a.localeCompare(b, 'id')),
    );
    expect(hasil.find((item) => item.nama === 'Coklat Batang')).toMatchObject({ aktif: false });
    expect(Object.keys(hasil[0] ?? {}).sort()).toEqual([
      'aktif',
      'hargaPerSatuan',
      'id',
      'nama',
      'satuanDasar',
    ]);
  });
});
