import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addOn,
  auditLog,
  bahan,
  konversiSatuan,
  pengaturanToko,
  penjualan,
  penjualanItem,
  penjualanItemAddOn,
  preOrder,
  preOrderItem,
  preOrderItemAddOn,
  produk,
} from '@/db/schema';
import { buatAddOn, hapusAddOn, setAktifAddOn, ubahAddOn } from '@/features/add-on/actions';
import { addOnKasir, daftarAddOnPemilik } from '@/features/add-on/queries';
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
const DITOLAK = { ok: false, error: 'Anda tidak berwenang melakukan aksi ini' };
const PESAN_DIPAKAI = 'Add-on sudah dipakai di transaksi; nonaktifkan saja';

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
  await testDb
    .insert(pengaturanToko)
    .values({ id: 1, targetMarginDefault: '0.3000' })
    .onConflictDoUpdate({ target: pengaturanToko.id, set: { targetMarginDefault: '0.3000' } });
});

/** Keju cheddar Rp110/g; Coklat meses Rp80/g dengan konversi sdm = 7 g. */
async function buatBahan() {
  const [keju, coklat] = await testDb
    .insert(bahan)
    .values([
      { nama: 'Keju cheddar', kategori: 'topping', satuanDasar: 'g', hargaPerSatuan: '110' },
      { nama: 'Coklat meses', kategori: 'topping', satuanDasar: 'g', hargaPerSatuan: '80' },
    ])
    .returning();
  if (!keju || !coklat) throw new Error('Gagal membuat bahan');
  const [sdm] = await testDb
    .insert(konversiSatuan)
    .values({ bahanId: coklat.id, namaSatuan: 'sdm', nilaiDasar: '7' })
    .returning();
  if (!sdm) throw new Error('Gagal membuat konversi');
  return { keju, coklat, sdm };
}

async function buatExtraKeju(kejuId: string) {
  const hasil = await buatAddOn({
    nama: 'Extra keju',
    bahanId: kejuId,
    takaran: '20',
    harga: 3_000,
  });
  if (!hasil.ok) throw new Error(hasil.error);
  return hasil.data;
}

async function pakaiDiPenjualan(addOnId: string) {
  const [p] = await testDb
    .insert(produk)
    .values({ nama: `Brownies ${randomUUID()}`, kategori: 'brownies', hargaJual: 5_000 })
    .returning();
  const [nota] = await testDb
    .insert(penjualan)
    .values({
      noNota: `NT-${randomUUID()}`,
      subtotal: 8_000,
      total: 8_000,
      metodeBayar: 'tunai',
      dibayar: 8_000,
      dibuatOleh: pemilikId,
    })
    .returning();
  const [item] = await testDb
    .insert(penjualanItem)
    .values({
      penjualanId: nota!.id,
      produkId: p!.id,
      namaProduk: p!.nama,
      qty: 1,
      hargaSatuan: 5_000,
      hargaAddOn: 3_000,
      subtotal: 8_000,
      hppSatuan: '2000.00',
    })
    .returning();
  await testDb.insert(penjualanItemAddOn).values({
    penjualanItemId: item!.id,
    addOnId,
    namaAddOn: 'Extra keju',
    hargaNormal: 3_000,
    harga: 3_000,
    hppSatuan: '2200.00',
  });
}

async function pakaiDiPo(addOnId: string) {
  const [p] = await testDb
    .insert(produk)
    .values({ nama: `Brownies ${randomUUID()}`, kategori: 'brownies', hargaJual: 5_000 })
    .returning();
  const [po] = await testDb
    .insert(preOrder)
    .values({
      noPo: `PO-${randomUUID()}`,
      namaPemesan: 'Pelanggan',
      kontak: '0812',
      tanggalAmbil: '2026-11-10',
      total: 8_000,
      dibuatOleh: pemilikId,
    })
    .returning();
  const [item] = await testDb
    .insert(preOrderItem)
    .values({ preOrderId: po!.id, produkId: p!.id, qty: 1, hargaSatuan: 5_000, subtotal: 8_000 })
    .returning();
  await testDb
    .insert(preOrderItemAddOn)
    .values({ preOrderItemId: item!.id, addOnId, hargaNormal: 3_000, harga: 3_000 });
}

describe('buat dan ubah add-on', () => {
  it('Extra keju 20 g Rp3.000 → HPP Rp2.200, margin Rp800 (26,67%) di bawah target 30%', async () => {
    const { keju } = await buatBahan();
    const { id } = await buatExtraKeju(keju.id);

    const [baris] = await testDb.select().from(addOn).where(eq(addOn.id, id));
    expect(baris).toMatchObject({
      nama: 'Extra keju',
      bahanId: keju.id,
      takaran: '20.000',
      konversiSatuanId: null,
      takaranDasar: '20.000',
      harga: 3_000,
      aktif: true,
    });

    expect(await daftarAddOnPemilik()).toEqual([
      {
        id,
        nama: 'Extra keju',
        bahanId: keju.id,
        namaBahan: 'Keju cheddar',
        takaran: '20.000',
        konversiSatuanId: null,
        satuan: 'g',
        takaranDasar: '20.000',
        harga: 3_000,
        hpp: '2200',
        marginRp: '800',
        marginPersen: '0.2667',
        diBawahTarget: true,
        aktif: true,
      },
    ]);
  });

  it('takaran_dasar dihitung di server dari konversi satuan', async () => {
    const { coklat, sdm } = await buatBahan();
    const hasil = await buatAddOn({
      nama: 'Extra coklat',
      bahanId: coklat.id,
      takaran: '2',
      konversiSatuanId: sdm.id,
      // takaranDasar dari klien diabaikan
      takaranDasar: '999',
      harga: '2.000',
    });
    if (!hasil.ok) throw new Error(hasil.error);

    const [baris] = await daftarAddOnPemilik();
    // 2 sdm × 7 g × Rp80/g = Rp1.120
    expect(baris).toMatchObject({
      takaran: '2.000',
      satuan: 'sdm',
      konversiSatuanId: sdm.id,
      takaranDasar: '14.000',
      harga: 2_000,
      hpp: '1120',
      marginRp: '880',
      marginPersen: '0.44',
      diBawahTarget: false,
    });
  });

  it('nama unik tanpa membedakan huruf besar/kecil, termasuk saat ubah', async () => {
    const { keju, coklat } = await buatBahan();
    await buatExtraKeju(keju.id);

    expect(
      await buatAddOn({ nama: 'EXTRA KEJU', bahanId: coklat.id, takaran: '5', harga: 1_000 }),
    ).toEqual({
      ok: false,
      error: 'Add-on dengan nama ini sudah ada',
      fieldErrors: { nama: ['Add-on dengan nama ini sudah ada'] },
    });

    const lain = await buatAddOn({
      nama: 'Extra coklat',
      bahanId: coklat.id,
      takaran: '5',
      harga: 1_000,
    });
    if (!lain.ok) throw new Error(lain.error);
    expect(
      await ubahAddOn({
        id: lain.data.id,
        nama: ' extra keju ',
        bahanId: coklat.id,
        takaran: '5',
        harga: 1_000,
      }),
    ).toMatchObject({ ok: false, fieldErrors: { nama: ['Add-on dengan nama ini sudah ada'] } });
  });

  it('ubah boleh memakai nama sendiri; perubahan harga dicatat audit', async () => {
    const { keju, coklat, sdm } = await buatBahan();
    const { id } = await buatExtraKeju(keju.id);

    const hasil = await ubahAddOn({
      id,
      nama: 'Extra keju',
      bahanId: coklat.id,
      takaran: '1',
      konversiSatuanId: sdm.id,
      harga: 3_500,
    });
    expect(hasil).toEqual({ ok: true, data: { id } });

    const [baris] = await testDb.select().from(addOn).where(eq(addOn.id, id));
    expect(baris).toMatchObject({ bahanId: coklat.id, takaranDasar: '7.000', harga: 3_500 });

    const audit = await testDb
      .select({
        tabel: auditLog.tabel,
        aksi: auditLog.aksi,
        penggunaId: auditLog.penggunaId,
        dataLama: auditLog.dataLama,
        dataBaru: auditLog.dataBaru,
      })
      .from(auditLog)
      .where(eq(auditLog.recordId, id));
    expect(audit).toEqual([
      {
        tabel: 'add_on',
        aksi: 'update',
        penggunaId: pemilikId,
        dataLama: { harga: 3_000 },
        dataBaru: { harga: 3_500 },
      },
    ]);
  });

  it('ubah tanpa perubahan harga tidak menulis audit', async () => {
    const { keju } = await buatBahan();
    const { id } = await buatExtraKeju(keju.id);
    await ubahAddOn({
      id,
      nama: 'Extra keju cheddar',
      bahanId: keju.id,
      takaran: '25',
      harga: 3_000,
    });
    expect(await testDb.select().from(auditLog).where(eq(auditLog.recordId, id))).toEqual([]);
  });

  it('menolak bahan atau konversi yang tidak cocok', async () => {
    const { keju, sdm } = await buatBahan();
    expect(await buatAddOn({ nama: 'Extra', bahanId: TIDAK_ADA, takaran: '1', harga: 1 })).toEqual({
      ok: false,
      error: 'Bahan tidak ditemukan',
      fieldErrors: { bahanId: ['Bahan tidak ditemukan'] },
    });
    // Konversi sdm milik coklat, bukan keju
    expect(
      await buatAddOn({
        nama: 'Extra',
        bahanId: keju.id,
        takaran: '1',
        konversiSatuanId: sdm.id,
        harga: 1,
      }),
    ).toEqual({
      ok: false,
      error: 'Konversi satuan tidak cocok dengan bahan',
      fieldErrors: { konversiSatuanId: ['Konversi satuan tidak cocok dengan bahan'] },
    });
    expect(await testDb.select().from(addOn)).toEqual([]);
  });

  it.each([
    ['takaran 0', { takaran: '0' }, 'takaran'],
    ['harga negatif', { harga: -1 }, 'harga'],
    ['harga desimal', { harga: '1500,5' }, 'harga'],
    ['nama kosong', { nama: ' ' }, 'nama'],
  ])('validasi input: %s', async (_nama, lain, field) => {
    const { keju } = await buatBahan();
    const hasil = await buatAddOn({
      nama: 'Extra keju',
      bahanId: keju.id,
      takaran: '20',
      harga: 3_000,
      ...lain,
    });
    expect(hasil).toMatchObject({ ok: false });
    expect(hasil.ok ? {} : hasil.fieldErrors).toHaveProperty(field);
  });

  it('id yang tidak ada ditolak saat ubah, setAktif, dan hapus', async () => {
    const { keju } = await buatBahan();
    const pesan = { ok: false, error: 'Add-on tidak ditemukan' };
    expect(
      await ubahAddOn({ id: TIDAK_ADA, nama: 'X1', bahanId: keju.id, takaran: '1', harga: 1 }),
    ).toEqual(pesan);
    expect(await setAktifAddOn({ id: TIDAK_ADA, aktif: false })).toEqual(pesan);
    expect(await hapusAddOn({ id: TIDAK_ADA })).toEqual(pesan);
  });
});

describe('aktif, nonaktif, hapus', () => {
  it('nonaktif hilang dari kasir tapi tetap di daftar pemilik', async () => {
    const { keju } = await buatBahan();
    const { id } = await buatExtraKeju(keju.id);

    expect(await setAktifAddOn({ id, aktif: false })).toEqual({
      ok: true,
      data: { id, aktif: false },
    });
    expect(await addOnKasir()).toEqual([]);
    expect((await daftarAddOnPemilik()).map((a) => a.aktif)).toEqual([false]);

    await setAktifAddOn({ id, aktif: true });
    expect(await addOnKasir()).toEqual([{ id, nama: 'Extra keju', harga: 3_000 }]);
  });

  it('add-on yang belum dipakai bisa dihapus', async () => {
    const { keju } = await buatBahan();
    const { id } = await buatExtraKeju(keju.id);
    expect(await hapusAddOn({ id })).toEqual({ ok: true, data: { id } });
    expect(await testDb.select().from(addOn)).toEqual([]);
  });

  it.each([
    ['penjualan', pakaiDiPenjualan],
    ['pre-order', pakaiDiPo],
  ])('add-on yang dipakai di %s tidak bisa dihapus', async (_nama, pakai) => {
    const { keju } = await buatBahan();
    const { id } = await buatExtraKeju(keju.id);
    await pakai(id);

    expect(await hapusAddOn({ id })).toEqual({ ok: false, error: PESAN_DIPAKAI });
    expect(await testDb.select().from(addOn)).toHaveLength(1);
  });
});

describe('query', () => {
  it('daftar pemilik urut nama; addOnKasir hanya aktif tanpa data biaya', async () => {
    const { keju, coklat } = await buatBahan();
    await testDb.insert(addOn).values([
      {
        nama: 'extra coklat',
        bahanId: coklat.id,
        takaran: '10',
        takaranDasar: '10',
        harga: 2_000,
      },
      {
        nama: 'Extra keju',
        bahanId: keju.id,
        takaran: '20',
        takaranDasar: '20',
        harga: 3_000,
      },
      {
        nama: 'Extra lama',
        bahanId: keju.id,
        takaran: '5',
        takaranDasar: '5',
        harga: 0,
        aktif: false,
      },
    ]);

    const daftar = await daftarAddOnPemilik();
    expect(daftar.map((a) => [a.nama, a.hpp, a.marginPersen, a.diBawahTarget])).toEqual([
      ['extra coklat', '800', '0.6', false],
      ['Extra keju', '2200', '0.2667', true],
      // Harga 0 → margin persen tidak terdefinisi
      ['Extra lama', '550', null, true],
    ]);

    const kasir = await addOnKasir();
    expect(kasir.map((a) => [a.nama, a.harga])).toEqual([
      ['extra coklat', 2_000],
      ['Extra keju', 3_000],
    ]);
    for (const dto of kasir) {
      expect(Object.keys(dto).sort()).toEqual(['harga', 'id', 'nama']);
    }
    const teks = JSON.stringify(kasir);
    for (const kunci of ['hpp', 'harga_per_satuan', 'hargaPerSatuan', 'bahan', 'takaran']) {
      expect(teks).not.toContain(kunci);
    }
  });

  it('target margin default toko dipakai untuk badge', async () => {
    await testDb.update(pengaturanToko).set({ targetMarginDefault: '0.2000' });
    const { keju } = await buatBahan();
    await buatExtraKeju(keju.id);
    expect((await daftarAddOnPemilik())[0]?.diBawahTarget).toBe(false);
  });
});

describe('otorisasi', () => {
  it('kasir ditolak di semua aksi add-on', async () => {
    const { keju } = await buatBahan();
    const { id } = await buatExtraKeju(keju.id);
    getPenggunaMock.mockResolvedValue(KASIR);

    const input = { nama: 'Extra keju', bahanId: keju.id, takaran: '20', harga: 9_999 };
    expect(await buatAddOn({ ...input, nama: 'Baru' })).toEqual(DITOLAK);
    expect(await ubahAddOn({ id, ...input })).toEqual(DITOLAK);
    expect(await setAktifAddOn({ id, aktif: false })).toEqual(DITOLAK);
    expect(await hapusAddOn({ id })).toEqual(DITOLAK);

    expect(await testDb.select().from(addOn)).toMatchObject([{ harga: 3_000, aktif: true }]);
  });
});
