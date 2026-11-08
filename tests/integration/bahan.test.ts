import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  auditLog,
  bahan,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
  riwayatHarga,
  stokMutasi,
  supplier,
} from '@/db/schema';
import { buatBahan, setAktifBahan, ubahBahan, ubahHargaManual } from '@/features/bahan/actions';
import {
  bahanTerkunci,
  daftarBahan,
  detailBahan,
  jumlahBahanPerluPerhatian,
  kategoriBahan,
  riwayatHargaBahan,
} from '@/features/bahan/queries';
import { getPengguna } from '@/lib/auth/pengguna';

import { buatBahanTest, buatProdukTest } from './setup/data';
import { buatPenggunaTest, resetData, testDb } from './setup/db';

vi.mock('@/lib/auth/pengguna', () => ({ getPengguna: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/db/client', async () => {
  const { testDb: db } = await import('./setup/db');
  return { db };
});

const getPenggunaMock = vi.mocked(getPengguna);

const KASIR = {
  id: '22222222-2222-4222-8222-222222222222',
  nama: 'Kasir',
  email: 'kasir@contoh.test',
  peran: 'kasir' as const,
};
const TIDAK_ADA = '33333333-3333-4333-8333-333333333333';

let pemilikId: string;

beforeEach(async () => {
  await resetData();
  pemilikId = await buatPenggunaTest('pemilik', 'Khansa');
  getPenggunaMock.mockReset();
  getPenggunaMock.mockResolvedValue({
    id: pemilikId,
    nama: 'Khansa',
    email: `${pemilikId}@contoh.test`,
    peran: 'pemilik',
  });
});

async function bahanBaru(input: Record<string, unknown> = {}) {
  const hasil = await buatBahan({
    nama: 'Tepung Terigu',
    kategori: 'tepung',
    satuanDasar: 'g',
    ...input,
  });
  if (!hasil.ok) throw new Error(hasil.error);
  return hasil.data;
}

async function ambilBahan(id: string) {
  const [baris] = await testDb.select().from(bahan).where(eq(bahan.id, id));
  return baris;
}

async function supplierBaru(nama = 'Toko Jaya', aktif = true) {
  const [baris] = await testDb.insert(supplier).values({ nama, aktif }).returning();
  if (!baris) throw new Error('Gagal membuat supplier');
  return baris;
}

async function pakaiDiResep(bahanId: string) {
  const [resep] = await testDb
    .insert(resepAdonan)
    .values({ nama: 'Adonan Brownies', modeHasil: 'timbang', hasilGram: '1000' })
    .returning();
  await testDb.insert(resepAdonanItem).values({
    resepAdonanId: resep!.id,
    bahanId,
    takaran: '100',
    takaranDasar: '100',
    urutan: 1,
  });
}

describe('buatBahan', () => {
  it('dengan harga awal dan stok awal: bahan, riwayat_harga, dan stok_mutasi benar', async () => {
    const { id } = await bahanBaru({
      stokMinimal: '1.000',
      hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 13500 },
      stokAwal: '5000',
    });

    expect(await ambilBahan(id)).toMatchObject({
      nama: 'Tepung Terigu',
      kategori: 'tepung',
      satuanDasar: 'g',
      hargaPerSatuan: '13.5000',
      stok: '5000.000',
      stokMinimal: '1000.000',
      supplierUtamaId: null,
      aktif: true,
    });

    const riwayat = await testDb.select().from(riwayatHarga).where(eq(riwayatHarga.bahanId, id));
    expect(riwayat).toEqual([
      expect.objectContaining({
        hargaLama: '0.0000',
        hargaBeli: null,
        hargaBaru: '13.5000',
        sumber: 'manual',
        pembelianItemId: null,
        dibuatOleh: pemilikId,
      }),
    ]);

    const mutasi = await testDb.select().from(stokMutasi).where(eq(stokMutasi.bahanId, id));
    expect(mutasi).toEqual([
      expect.objectContaining({
        jenis: 'stok_awal',
        qty: '5000.000',
        saldoSesudah: '5000.000',
        nilaiSatuan: '13.5000',
        alasan: 'Stok awal',
        sumberTipe: 'manual',
        sumberId: null,
        dibuatOleh: pemilikId,
      }),
    ]);
  });

  it('tanpa harga & stok awal: tidak menulis riwayat maupun mutasi', async () => {
    const { id } = await bahanBaru({ stokAwal: '0' });

    expect(await ambilBahan(id)).toMatchObject({ hargaPerSatuan: '0.0000', stok: '0.000' });
    await expect(testDb.select().from(riwayatHarga)).resolves.toHaveLength(0);
    await expect(testDb.select().from(stokMutasi)).resolves.toHaveLength(0);
  });

  it('stok awal tanpa harga memakai nilai satuan 0', async () => {
    const { id } = await bahanBaru({ satuanDasar: 'pcs', nama: 'Telur', stokAwal: '30' });

    const [mutasi] = await testDb.select().from(stokMutasi).where(eq(stokMutasi.bahanId, id));
    expect(mutasi).toMatchObject({ qty: '30.000', nilaiSatuan: '0.0000' });
  });

  it('menyimpan supplier utama yang aktif', async () => {
    const jaya = await supplierBaru();
    const { id } = await bahanBaru({ supplierUtamaId: jaya.id });
    expect((await ambilBahan(id))?.supplierUtamaId).toBe(jaya.id);
  });

  it('supplier nonaktif atau tidak ada ditolak di field supplier', async () => {
    const tutup = await supplierBaru('Tutup', false);
    const pesan = 'Supplier tidak ditemukan atau nonaktif';

    for (const supplierUtamaId of [tutup.id, TIDAK_ADA]) {
      await expect(
        buatBahan({ nama: 'Gula', kategori: 'gula', satuanDasar: 'g', supplierUtamaId }),
      ).resolves.toEqual({ ok: false, error: pesan, fieldErrors: { supplierUtamaId: [pesan] } });
    }
    await expect(testDb.select().from(bahan)).resolves.toHaveLength(0);
  });

  it('nama duplikat beda huruf besar → pesan ramah di field nama', async () => {
    await bahanBaru();
    const pesan = 'Bahan dengan nama ini sudah ada';

    await expect(
      buatBahan({ nama: '  tepung TERIGU ', kategori: 'tepung', satuanDasar: 'g' }),
    ).resolves.toEqual({ ok: false, error: pesan, fieldErrors: { nama: [pesan] } });
    await expect(testDb.select().from(bahan)).resolves.toHaveLength(1);
  });

  it('satuan kemasan tidak cocok → fieldErrors, tidak ada yang tersimpan', async () => {
    const hasil = await buatBahan({
      nama: 'Susu Cair',
      kategori: 'dairy',
      satuanDasar: 'ml',
      hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 20000 },
    });

    expect(hasil).toMatchObject({
      ok: false,
      fieldErrors: {
        'hargaAwal.satuanKemasan': ['Satuan kemasan tidak cocok dengan satuan dasar'],
      },
    });
    await expect(testDb.select().from(bahan)).resolves.toHaveLength(0);
  });
});

describe('bahanTerkunci', () => {
  it('false untuk bahan baru, true bila punya mutasi, dipakai resep, atau komponen produk', async () => {
    const bebas = await buatBahanTest('Bebas');
    expect(await bahanTerkunci(bebas.id)).toBe(false);

    const { id: denganStok } = await bahanBaru({ nama: 'Berstok', stokAwal: '10' });
    expect(await bahanTerkunci(denganStok)).toBe(true);

    const diResep = await buatBahanTest('Di resep');
    await pakaiDiResep(diResep.id);
    expect(await bahanTerkunci(diResep.id)).toBe(true);

    const diProduk = await buatBahanTest('Di produk');
    const produk = await buatProdukTest();
    await testDb.insert(produkKomponen).values({
      produkId: produk.id,
      peran: 'topping',
      bahanId: diProduk.id,
      takaran: '5',
      takaranDasar: '5',
    });
    expect(await bahanTerkunci(diProduk.id)).toBe(true);
  });
});

describe('ubahBahan', () => {
  it('mengubah nama, kategori, stok minimal, dan supplier', async () => {
    const jaya = await supplierBaru();
    const { id } = await bahanBaru();

    const hasil = await ubahBahan({
      id,
      nama: 'Tepung Protein Tinggi',
      kategori: 'Tepung',
      satuanDasar: 'g',
      stokMinimal: '2500',
      supplierUtamaId: jaya.id,
    });

    expect(hasil).toMatchObject({ ok: true });
    expect(await ambilBahan(id)).toMatchObject({
      nama: 'Tepung Protein Tinggi',
      kategori: 'tepung',
      stokMinimal: '2500.000',
      supplierUtamaId: jaya.id,
    });
  });

  it('supplier lama yang sudah nonaktif boleh tetap dipakai', async () => {
    const jaya = await supplierBaru();
    const { id } = await bahanBaru({ supplierUtamaId: jaya.id });
    await testDb.update(supplier).set({ aktif: false }).where(eq(supplier.id, jaya.id));

    await expect(
      ubahBahan({
        id,
        nama: 'Tepung',
        kategori: 'tepung',
        satuanDasar: 'g',
        supplierUtamaId: jaya.id,
      }),
    ).resolves.toMatchObject({ ok: true });
  });

  it.each([
    ['punya mutasi stok', async () => (await bahanBaru({ stokAwal: '100' })).id],
    [
      'dipakai resep',
      async () => {
        const { id } = await bahanBaru();
        await pakaiDiResep(id);
        return id;
      },
    ],
  ])('satuan dasar ditolak bila bahan %s', async (_kasus, siapkan) => {
    const id = await siapkan();
    const pesan = 'Satuan dasar tidak bisa diubah karena bahan sudah dipakai';

    await expect(
      ubahBahan({ id, nama: 'Tepung Terigu', kategori: 'tepung', satuanDasar: 'ml' }),
    ).resolves.toEqual({ ok: false, error: pesan, fieldErrors: { satuanDasar: [pesan] } });
    expect((await ambilBahan(id))?.satuanDasar).toBe('g');
  });

  it('bahan terkunci tetap bisa diubah field lain selama satuan sama', async () => {
    const { id } = await bahanBaru({ stokAwal: '100' });
    await expect(
      ubahBahan({ id, nama: 'Tepung Segitiga', kategori: 'tepung', satuanDasar: 'g' }),
    ).resolves.toMatchObject({ ok: true });
  });

  it('ganti satuan bahan belum terkunci: harga direset ke 0 dan tercatat di riwayat', async () => {
    const { id } = await bahanBaru({
      hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 15000 },
    });

    await expect(
      ubahBahan({ id, nama: 'Tepung Terigu', kategori: 'tepung', satuanDasar: 'pcs' }),
    ).resolves.toMatchObject({ ok: true });

    expect(await ambilBahan(id)).toMatchObject({ satuanDasar: 'pcs', hargaPerSatuan: '0.0000' });
    const riwayat = await testDb
      .select()
      .from(riwayatHarga)
      .where(eq(riwayatHarga.bahanId, id))
      .orderBy(asc(riwayatHarga.berlakuSejak), asc(riwayatHarga.hargaLama));
    expect(riwayat.map((r) => [r.hargaLama, r.hargaBaru])).toEqual([
      ['0.0000', '15.0000'],
      ['15.0000', '0.0000'],
    ]);
  });

  it('rename ke nama bahan lain (beda huruf besar) ditolak; nama sendiri boleh', async () => {
    await bahanBaru({ nama: 'Gula Pasir', kategori: 'gula' });
    const { id } = await bahanBaru();
    const pesan = 'Bahan dengan nama ini sudah ada';

    await expect(
      ubahBahan({ id, nama: 'GULA pasir', kategori: 'tepung', satuanDasar: 'g' }),
    ).resolves.toEqual({ ok: false, error: pesan, fieldErrors: { nama: [pesan] } });
    await expect(
      ubahBahan({ id, nama: 'TEPUNG TERIGU', kategori: 'tepung', satuanDasar: 'g' }),
    ).resolves.toMatchObject({ ok: true });
  });

  it('bahan tidak ada ditolak', async () => {
    await expect(
      ubahBahan({ id: TIDAK_ADA, nama: 'Tepung', kategori: 'tepung', satuanDasar: 'g' }),
    ).resolves.toEqual({ ok: false, error: 'Bahan tidak ditemukan' });
  });
});

describe('ubahHargaManual', () => {
  it('memperbarui harga, menulis riwayat_harga dan audit_log', async () => {
    const { id } = await bahanBaru({
      hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 15000 },
    });

    const hasil = await ubahHargaManual({
      id,
      jumlahKemasan: '2,5',
      satuanKemasan: 'kg',
      totalHarga: 45000,
    });

    expect(hasil).toEqual({ ok: true, data: { id, hargaPerSatuan: '18.0000', berubah: true } });
    expect((await ambilBahan(id))?.hargaPerSatuan).toBe('18.0000');

    const riwayat = await testDb.select().from(riwayatHarga).where(eq(riwayatHarga.bahanId, id));
    expect(riwayat).toHaveLength(2);
    expect(riwayat).toContainEqual(
      expect.objectContaining({
        hargaLama: '15.0000',
        hargaBeli: null,
        hargaBaru: '18.0000',
        sumber: 'manual',
        dibuatOleh: pemilikId,
      }),
    );

    const audit = await testDb.select().from(auditLog).where(eq(auditLog.recordId, id));
    expect(audit).toEqual([
      expect.objectContaining({
        penggunaId: pemilikId,
        tabel: 'bahan',
        aksi: 'update',
        dataLama: { hargaPerSatuan: '15.0000' },
        dataBaru: { hargaPerSatuan: '18.0000' },
      }),
    ]);
  });

  it('harga sama: tidak menulis riwayat maupun audit', async () => {
    const { id } = await bahanBaru({
      hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 15000 },
    });

    await expect(
      ubahHargaManual({ id, jumlahKemasan: '500', satuanKemasan: 'g', totalHarga: 7500 }),
    ).resolves.toEqual({ ok: true, data: { id, hargaPerSatuan: '15.0000', berubah: false } });
    await expect(testDb.select().from(riwayatHarga)).resolves.toHaveLength(1);
    await expect(testDb.select().from(auditLog)).resolves.toHaveLength(0);
  });

  it('satuan kemasan tidak cocok atau bahan tidak ada ditolak', async () => {
    const { id } = await bahanBaru();

    await expect(
      ubahHargaManual({ id, jumlahKemasan: '1', satuanKemasan: 'l', totalHarga: 1000 }),
    ).resolves.toEqual({ ok: false, error: 'Satuan kemasan tidak cocok dengan satuan dasar' });
    await expect(
      ubahHargaManual({ id: TIDAK_ADA, jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 1 }),
    ).resolves.toEqual({ ok: false, error: 'Bahan tidak ditemukan' });
  });
});

describe('setAktifBahan', () => {
  it('menonaktifkan lalu mengaktifkan lagi', async () => {
    const { id } = await bahanBaru();

    await expect(setAktifBahan({ id, aktif: false })).resolves.toMatchObject({ ok: true });
    expect((await ambilBahan(id))?.aktif).toBe(false);
    await expect(setAktifBahan({ id, aktif: true })).resolves.toMatchObject({ ok: true });
    expect((await ambilBahan(id))?.aktif).toBe(true);
  });

  it('bahan tidak ada ditolak', async () => {
    await expect(setAktifBahan({ id: TIDAK_ADA, aktif: false })).resolves.toEqual({
      ok: false,
      error: 'Bahan tidak ditemukan',
    });
  });
});

describe('otorisasi', () => {
  it('kasir ditolak di semua action bahan, data tidak berubah', async () => {
    const { id } = await bahanBaru({
      hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 15000 },
    });
    getPenggunaMock.mockResolvedValue(KASIR);
    const ditolak = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };

    await expect(buatBahan({ nama: 'Gula', kategori: 'gula', satuanDasar: 'g' })).resolves.toEqual(
      ditolak,
    );
    await expect(
      ubahBahan({ id, nama: 'Diubah kasir', kategori: 'tepung', satuanDasar: 'g' }),
    ).resolves.toEqual(ditolak);
    await expect(
      ubahHargaManual({ id, jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 1 }),
    ).resolves.toEqual(ditolak);
    await expect(setAktifBahan({ id, aktif: false })).resolves.toEqual(ditolak);

    expect(await ambilBahan(id)).toMatchObject({
      nama: 'Tepung Terigu',
      hargaPerSatuan: '15.0000',
      aktif: true,
    });
    await expect(testDb.select().from(bahan)).resolves.toHaveLength(1);
  });
});

describe('queries', () => {
  async function siapkanDaftar() {
    const jaya = await supplierBaru();
    const tepung = await bahanBaru({
      stokMinimal: '1000',
      supplierUtamaId: jaya.id,
      hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 13500 },
      stokAwal: '5000',
    });
    const gula = await bahanBaru({ nama: 'Gula Pasir', kategori: 'gula', stokMinimal: '1000' });
    const coklat = await bahanBaru({ nama: 'Coklat Bubuk', kategori: 'coklat' });
    const lama = await bahanBaru({ nama: 'Pewarna Lama', kategori: 'perisa', stokMinimal: '10' });

    await testDb.update(bahan).set({ stok: '500' }).where(eq(bahan.id, gula.id));
    await testDb.update(bahan).set({ stok: '-20' }).where(eq(bahan.id, coklat.id));
    await testDb.update(bahan).set({ aktif: false }).where(eq(bahan.id, lama.id));
    return { jaya, tepung, gula, coklat, lama };
  }

  it('daftarBahan: urut nama, status stok, harga, supplier', async () => {
    const { tepung } = await siapkanDaftar();

    const semua = await daftarBahan({});
    expect(semua.map((b) => [b.nama, b.status])).toEqual([
      ['Coklat Bubuk', 'minus'],
      ['Gula Pasir', 'menipis'],
      ['Pewarna Lama', 'menipis'],
      ['Tepung Terigu', 'aman'],
    ]);
    expect(semua.find((b) => b.id === tepung.id)).toEqual({
      id: tepung.id,
      nama: 'Tepung Terigu',
      kategori: 'tepung',
      satuanDasar: 'g',
      stok: '5000.000',
      stokMinimal: '1000.000',
      hargaPerSatuan: '13.5000',
      aktif: true,
      supplierNama: 'Toko Jaya',
      status: 'aman',
    });
  });

  it('daftarBahan: filter cari, kategori, status stok, aktif', async () => {
    await siapkanDaftar();
    const nama = async (filter: Parameters<typeof daftarBahan>[0]) =>
      (await daftarBahan(filter)).map((b) => b.nama);

    expect(await nama({ q: 'GULA' })).toEqual(['Gula Pasir']);
    expect(await nama({ q: '100%_' })).toEqual([]);
    expect(await nama({ kategori: 'coklat' })).toEqual(['Coklat Bubuk']);
    expect(await nama({ status: 'menipis', aktif: true })).toEqual(['Coklat Bubuk', 'Gula Pasir']);
    expect(await nama({ status: 'minus' })).toEqual(['Coklat Bubuk']);
    expect(await nama({ status: 'semua', aktif: false })).toEqual(['Pewarna Lama']);
  });

  it('jumlahBahanPerluPerhatian: bahan aktif dengan stok ≤ minimal (termasuk minus)', async () => {
    await siapkanDaftar();
    await expect(jumlahBahanPerluPerhatian()).resolves.toBe(2);
  });

  it('kategoriBahan: kategori unik terurut', async () => {
    await siapkanDaftar();
    await expect(kategoriBahan()).resolves.toEqual(['coklat', 'gula', 'perisa', 'tepung']);
  });

  it('detailBahan: data lengkap + terkunci; null bila tidak ada', async () => {
    const { tepung, gula, jaya } = await siapkanDaftar();

    await expect(detailBahan(tepung.id)).resolves.toMatchObject({
      id: tepung.id,
      nama: 'Tepung Terigu',
      supplierUtamaId: jaya.id,
      supplierNama: 'Toko Jaya',
      status: 'aman',
      terkunci: true,
    });
    await expect(detailBahan(gula.id)).resolves.toMatchObject({
      supplierUtamaId: null,
      supplierNama: null,
      terkunci: false,
    });
    await expect(detailBahan(TIDAK_ADA)).resolves.toBeNull();
  });

  it('riwayatHargaBahan: terbaru dulu, dengan nama pengguna', async () => {
    const { id } = await bahanBaru({
      hargaAwal: { jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 15000 },
    });
    await ubahHargaManual({ id, jumlahKemasan: '1', satuanKemasan: 'kg', totalHarga: 18000 });

    const riwayat = await riwayatHargaBahan(id);
    expect(riwayat.map((r) => [r.hargaLama, r.hargaBaru, r.sumber, r.oleh])).toEqual([
      ['15.0000', '18.0000', 'manual', 'Khansa'],
      ['0.0000', '15.0000', 'manual', 'Khansa'],
    ]);
    expect(riwayat[0]?.berlakuSejak).toBeInstanceOf(Date);
  });
});
