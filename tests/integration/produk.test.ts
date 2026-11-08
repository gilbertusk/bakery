import { asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bahan,
  konversiSatuan,
  produk as produkTable,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
} from '@/db/schema';
import { daftarProduk, detailProduk, pilihanResep } from '@/features/produk/queries';
import {
  setAktifProduk,
  setDijualProduk,
  simpanProduk,
  unggahFotoProduk,
} from '@/features/produk/actions';
import { getPengguna } from '@/lib/auth/pengguna';

import { buatBahanTest } from './setup/data';
import { buatPenggunaTest, resetData, testDb } from './setup/db';

vi.mock('@/lib/auth/pengguna', () => ({ getPengguna: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => {
  let namaFileTerakhir = '';
  return {
    createSupabaseAdminClient: () => ({
      storage: {
        from: () => ({
          upload: async (_nama: string) => {
            namaFileTerakhir = _nama;
            return { error: null };
          },
          getPublicUrl: () => ({
            data: {
              publicUrl: `https://supabase.co/storage/v1/object/public/${namaFileTerakhir}`,
            },
          }),
          remove: () => ({ error: null }),
        }),
      },
    }),
  };
});
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

async function buatResepAktif() {
  const tepung = await buatBahanTest(`Tepung ${randomUUID().slice(0, 8)}`);
  const [resep] = await testDb
    .insert(resepAdonan)
    .values({
      nama: `Brownies Aktif ${randomUUID().slice(0, 8)}`,
      modeHasil: 'timbang',
      hasilGram: '1200',
      aktif: true,
    })
    .returning();
  if (!resep) throw new Error('Gagal membuat resep');
  await testDb.insert(resepAdonanItem).values({
    resepAdonanId: resep.id,
    bahanId: tepung.id,
    takaran: '100',
    takaranDasar: '100',
    urutan: 1,
  });
  return resep;
}

async function buatBahanDenganHarga(nama: string, harga: string) {
  const [baris] = await testDb
    .insert(bahan)
    .values({ nama, kategori: 'bahan', satuanDasar: 'g', hargaPerSatuan: harga })
    .returning();
  if (!baris) throw new Error('Gagal membuat bahan');
  return baris;
}

describe('simpanProduk', () => {
  it('menyimpan produk dengan satu adonan dan takaran dasar benar', async () => {
    const resep = await buatResepAktif();
    const hasil = await simpanProduk({
      nama: 'Brownies Cup',
      kategori: 'kue basah',
      cetakan: 'cup 50 ml',
      hargaJual: '15000',
      targetMargin: '0,30',
      dijual: true,
      komponen: [{ jenis: 'adonan', resepAdonanId: resep.id, gramPerPcs: '50' }],
    });

    expect(hasil).toMatchObject({ ok: true });
    if (!hasil.ok) throw new Error(hasil.error);
    const [produk] = await testDb
      .select()
      .from(produkTable)
      .where(eq(produkTable.id, hasil.data.id));
    if (!produk) throw new Error('produk tidak ditemukan');
    expect(produk).toMatchObject({
      nama: 'Brownies Cup',
      kategori: 'kue basah',
      cetakan: 'cup 50 ml',
      hargaJual: 15000,
      targetMargin: '0.3000',
      dijual: true,
      aktif: true,
    });

    const komponen = await testDb
      .select({
        resepAdonanId: produkKomponen.resepAdonanId,
        takaran: produkKomponen.takaran,
        takaranDasar: produkKomponen.takaranDasar,
        peran: produkKomponen.peran,
      })
      .from(produkKomponen)
      .where(eq(produkKomponen.produkId, produk.id));
    expect(komponen).toEqual([
      { resepAdonanId: resep.id, takaran: '50.000', takaranDasar: '50.000', peran: 'adonan' },
    ]);
  });

  it('menyimpan produk dengan dua bahan langsung dan hitung takaran dasar', async () => {
    const gula = await buatBahanDenganHarga('Gula', '18000');
    const keju = await buatBahanDenganHarga('Keju', '110000');
    const [sdm] = await testDb
      .insert(konversiSatuan)
      .values({ bahanId: gula.id, namaSatuan: 'sdm', nilaiDasar: '12' })
      .returning();
    if (!sdm) throw new Error('Gagal membuat konversi');

    const hasil = await simpanProduk({
      nama: 'Kue Keju',
      kategori: 'kue kering',
      hargaJual: '25000',
      komponen: [
        {
          jenis: 'bahan',
          peran: 'topping',
          bahanId: gula.id,
          takaran: '2',
          konversiSatuanId: sdm.id,
        },
        { jenis: 'bahan', peran: 'filling', bahanId: keju.id, takaran: '10' },
      ],
    });

    expect(hasil).toMatchObject({ ok: true });
    if (!hasil.ok) throw new Error(hasil.error);
    const [produk] = await testDb
      .select()
      .from(produkTable)
      .where(eq(produkTable.id, hasil.data.id));
    if (!produk) throw new Error('produk tidak ditemukan');

    const komponen = await testDb
      .select({
        bahanId: produkKomponen.bahanId,
        peran: produkKomponen.peran,
        takaranDasar: produkKomponen.takaranDasar,
      })
      .from(produkKomponen)
      .where(eq(produkKomponen.produkId, produk.id))
      .orderBy(asc(produkKomponen.bahanId));
    const isi = komponen.map((item) => item);
    expect(isi).toHaveLength(2);
    expect(isi).toContainEqual({ bahanId: gula.id, peran: 'topping', takaranDasar: '24.000' });
    expect(isi).toContainEqual({ bahanId: keju.id, peran: 'filling', takaranDasar: '10.000' });
  });

  it('ubah produk mengganti seluruh komponen dan mempertahankan id', async () => {
    const gula = await buatBahanTest('Gula');
    const resep = await buatResepAktif();
    const dibuat = await simpanProduk({
      nama: 'Produk Awal',
      kategori: 'kue',
      hargaJual: '10000',
      komponen: [{ jenis: 'adonan', resepAdonanId: resep.id, gramPerPcs: '50' }],
    });
    if (!dibuat.ok) throw new Error(dibuat.error);

    const diubah = await simpanProduk({
      id: dibuat.data.id,
      nama: 'Produk Akhir',
      kategori: 'kue basah',
      cetakan: 'loyang 20',
      hargaJual: '20000',
      targetMargin: null,
      dijual: false,
      komponen: [{ jenis: 'bahan', peran: 'kemasan', bahanId: gula.id, takaran: '1' }],
    });

    expect(diubah).toMatchObject({ ok: true, data: { id: dibuat.data.id } });
    const [produk] = await testDb
      .select()
      .from(produkTable)
      .where(eq(produkTable.id, dibuat.data.id));
    if (!produk) throw new Error('produk tidak ditemukan');
    expect(produk.nama).toBe('Produk Akhir');
    expect(produk.dijual).toBe(false);

    const komponen = await testDb
      .select({ bahanId: produkKomponen.bahanId, peran: produkKomponen.peran })
      .from(produkKomponen)
      .where(eq(produkKomponen.produkId, dibuat.data.id));
    expect(komponen).toEqual([{ bahanId: gula.id, peran: 'kemasan' }]);
  });

  it('nama duplikat ditolak dan id tidak ada ditolak', async () => {
    const resep = await buatResepAktif();
    const dasar = {
      nama: 'Produk Uji',
      kategori: 'kue',
      hargaJual: '10000',
      komponen: [{ jenis: 'adonan', resepAdonanId: resep.id, gramPerPcs: '50' }],
    };
    await simpanProduk(dasar);

    await expect(simpanProduk({ ...dasar, nama: 'PRODUK UJI' })).resolves.toMatchObject({
      ok: false,
      fieldErrors: { nama: ['Produk dengan nama ini sudah ada'] },
    });
    await expect(simpanProduk({ ...dasar, id: TIDAK_ADA, nama: 'Tidak Ada' })).resolves.toEqual({
      ok: false,
      error: 'Produk tidak ditemukan',
    });
  });

  it('kasir ditolak menyimpan produk', async () => {
    const resep = await buatResepAktif();
    getPenggunaMock.mockResolvedValue(KASIR);
    const ditolak = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };
    await expect(
      simpanProduk({
        nama: 'Produk Kasir',
        kategori: 'kue',
        hargaJual: '10000',
        komponen: [{ jenis: 'adonan', resepAdonanId: resep.id, gramPerPcs: '50' }],
      }),
    ).resolves.toEqual(ditolak);
    await expect(testDb.select().from(produkTable)).resolves.toHaveLength(0);
  });
});

describe('setAktifProduk dan setDijualProduk', () => {
  async function produkBaru() {
    const resep = await buatResepAktif();
    const hasil = await simpanProduk({
      nama: 'Produk Uji',
      kategori: 'kue',
      hargaJual: '10000',
      komponen: [{ jenis: 'adonan', resepAdonanId: resep.id, gramPerPcs: '50' }],
    });
    if (!hasil.ok) throw new Error(hasil.error);
    return hasil.data.id;
  }

  it('mengubah status aktif dan dijual', async () => {
    const id = await produkBaru();

    await expect(setAktifProduk({ id, aktif: false })).resolves.toMatchObject({ ok: true });
    await expect(setDijualProduk({ id, dijual: false })).resolves.toMatchObject({ ok: true });

    const [produk] = await testDb
      .select({ aktif: produkTable.aktif, dijual: produkTable.dijual })
      .from(produkTable)
      .where(eq(produkTable.id, id));
    if (!produk) throw new Error('produk tidak ditemukan');
    expect(produk.aktif).toBe(false);
    expect(produk.dijual).toBe(false);
  });

  it('id tidak ada ditolak', async () => {
    await expect(setAktifProduk({ id: TIDAK_ADA, aktif: false })).resolves.toEqual({
      ok: false,
      error: 'Produk tidak ditemukan',
    });
    await expect(setDijualProduk({ id: TIDAK_ADA, dijual: false })).resolves.toEqual({
      ok: false,
      error: 'Produk tidak ditemukan',
    });
  });

  it('kasir ditolak mengubah status produk', async () => {
    const id = await produkBaru();
    getPenggunaMock.mockResolvedValue(KASIR);
    const ditolak = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };
    await expect(setAktifProduk({ id, aktif: false })).resolves.toEqual(ditolak);
    await expect(setDijualProduk({ id, dijual: false })).resolves.toEqual(ditolak);
    await expect(testDb.select().from(produkTable)).resolves.toHaveLength(1);
  });
});

describe('query produk', () => {
  async function buatFixture() {
    const resep = await buatResepAktif();
    const produkA = await simpanProduk({
      nama: 'Brownies Cup',
      kategori: 'kue basah',
      hargaJual: '15000',
      dijual: true,
      komponen: [{ jenis: 'adonan', resepAdonanId: resep.id, gramPerPcs: '50' }],
    });
    if (!produkA.ok) throw new Error(produkA.error);
    await simpanProduk({
      nama: 'Brownies Loyang',
      kategori: 'kue kering',
      hargaJual: '40000',
      dijual: false,
      komponen: [{ jenis: 'adonan', resepAdonanId: resep.id, gramPerPcs: '100' }],
    });
    return produkA.data.id;
  }

  it('daftarProduk filter pencarian, kategori, dijual, dan aktif', async () => {
    const idA = await buatFixture();
    await simpanProduk({
      nama: 'Bolu Panggang',
      kategori: 'kue basah',
      hargaJual: '20000',
      dijual: true,
      komponen: [{ jenis: 'adonan', resepAdonanId: (await buatResepAktif()).id, gramPerPcs: '60' }],
    });

    await expect(daftarProduk({ q: 'brownies' })).resolves.toHaveLength(2);
    await expect(daftarProduk({ kategori: 'kue kering' })).resolves.toHaveLength(1);
    await expect(daftarProduk({ dijual: true })).resolves.toHaveLength(2);
    await expect(daftarProduk({ dijual: false })).resolves.toHaveLength(1);
    await expect(daftarProduk({ aktif: false })).resolves.toHaveLength(0);

    await testDb.update(produkTable).set({ aktif: false }).where(eq(produkTable.id, idA));
    await expect(daftarProduk({ aktif: true })).resolves.toHaveLength(2);
    await expect(daftarProduk({ aktif: false })).resolves.toHaveLength(1);
  });

  it('detailProduk memuat komponen, resep, dan biaya per gram', async () => {
    const resep = await buatResepAktif();
    const tepung = await buatBahanTest('Tepung');
    const [sdm] = await testDb
      .insert(konversiSatuan)
      .values({ bahanId: tepung.id, namaSatuan: 'sdm', nilaiDasar: '8' })
      .returning();
    if (!sdm) throw new Error('Gagal membuat konversi');

    const produk = await simpanProduk({
      nama: 'Brownies Cup',
      kategori: 'kue basah',
      cetakan: 'cup 50 ml',
      hargaJual: '15000',
      komponen: [
        { jenis: 'adonan', resepAdonanId: resep.id, gramPerPcs: '50' },
        {
          jenis: 'bahan',
          peran: 'kemasan',
          bahanId: tepung.id,
          takaran: '2',
          konversiSatuanId: sdm.id,
        },
      ],
    });
    if (!produk.ok) throw new Error(produk.error);

    const detail = await detailProduk(produk.data.id);
    expect(detail).toMatchObject({
      id: produk.data.id,
      nama: 'Brownies Cup',
      hargaJual: 15000,
      cetakan: 'cup 50 ml',
      stok: 0,
      dijual: true,
      aktif: true,
    });
    expect(detail?.komponen).toHaveLength(2);
    const adonan = detail?.komponen.find((k) => k.jenis === 'adonan');
    const bahan = detail?.komponen.find((k) => k.jenis === 'bahan');
    expect(adonan).toMatchObject({
      jenis: 'adonan',
      namaResep: resep.nama,
      gramPerPcs: '50.000',
    });
    expect(bahan).toMatchObject({
      jenis: 'bahan',
      peran: 'kemasan',
      namaBahan: 'Tepung',
      namaSatuan: 'sdm',
      takaran: '2.000',
      takaranDasar: '16.000',
    });
    await expect(detailProduk(TIDAK_ADA)).resolves.toBeNull();
  });

  it('pilihanResep hanya resep aktif dengan biaya per gram', async () => {
    const resepAktif = await buatResepAktif();
    const [resepNonaktif] = await testDb
      .insert(resepAdonan)
      .values({
        nama: 'Resep Nonaktif',
        modeHasil: 'timbang',
        hasilGram: '500',
        aktif: false,
      })
      .returning();
    if (!resepNonaktif) throw new Error('Gagal membuat resep nonaktif');

    const pilihan = await pilihanResep();
    expect(pilihan).toHaveLength(1);
    expect(pilihan[0]).toMatchObject({
      id: resepAktif.id,
      nama: resepAktif.nama,
      hasilGram: '1200.000',
      aktif: true,
    });
  });
});

describe('unggahFotoProduk', () => {
  async function produkDenganFoto() {
    const resep = await buatResepAktif();
    const hasil = await simpanProduk({
      nama: 'Produk Foto',
      kategori: 'kue',
      hargaJual: '10000',
      komponen: [{ jenis: 'adonan', resepAdonanId: resep.id, gramPerPcs: '50' }],
    });
    if (!hasil.ok) throw new Error(hasil.error);
    return hasil.data.id;
  }

  it('menerima file jpeg/png/webp maksimal 2 MB dan menyimpan foto_url', async () => {
    const id = await produkDenganFoto();
    const file = new File([new ArrayBuffer(100)], 'foto.jpg', { type: 'image/jpeg' });

    const hasil = await unggahFotoProduk({ id, file });
    expect(hasil).toMatchObject({ ok: true });

    const [produk] = await testDb
      .select({ fotoUrl: produkTable.fotoUrl })
      .from(produkTable)
      .where(eq(produkTable.id, id));
    if (!produk) throw new Error('produk tidak ditemukan');
    expect(produk.fotoUrl).toContain(`produk/${id}/`);
    expect(produk.fotoUrl?.endsWith('.jpg')).toBe(true);
  });

  it('menolak file terlalu besar dan tipe tidak valid', async () => {
    const id = await produkDenganFoto();
    const besar = new File([new ArrayBuffer(3 * 1024 * 1024)], 'besar.jpg', {
      type: 'image/jpeg',
    });
    const pdf = new File([new ArrayBuffer(100)], 'dokumen.pdf', { type: 'application/pdf' });

    await expect(unggahFotoProduk({ id, file: besar })).resolves.toMatchObject({
      ok: false,
      error: 'Ukuran file maksimal 2 MB',
    });
    await expect(unggahFotoProduk({ id, file: pdf })).resolves.toMatchObject({
      ok: false,
      error: 'Tipe file harus jpeg, png, atau webp',
    });
  });

  it('produk tidak ada ditolak', async () => {
    const file = new File([new ArrayBuffer(100)], 'foto.jpg', { type: 'image/jpeg' });
    await expect(unggahFotoProduk({ id: TIDAK_ADA, file })).resolves.toEqual({
      ok: false,
      error: 'Produk tidak ditemukan',
    });
  });
});
