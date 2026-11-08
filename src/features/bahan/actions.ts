'use server';

import { and, eq, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { type Tx, db } from '@/db/client';
import { bahan, riwayatHarga, supplier } from '@/db/schema';
import { keNumeric } from '@/lib/angka';
import { PesanError, aksi } from '@/lib/aksi';
import { catatAudit } from '@/lib/audit';
import { catatMutasi } from '@/lib/stok';

import { hargaDariKemasan } from './harga';
import { bahanTerkunci } from './queries';
import {
  buatBahanSchema,
  setAktifBahanSchema,
  ubahBahanSchema,
  ubahHargaManualSchema,
} from './schemas';

const PEMILIK = ['pemilik' as const];

const PESAN_TIDAK_ADA = 'Bahan tidak ditemukan';
const PESAN_NAMA_DUPLIKAT = 'Bahan dengan nama ini sudah ada';

function segarkan(id?: string) {
  revalidatePath('/bahan');
  revalidatePath('/supplier');
  if (id) revalidatePath(`/bahan/${id}`);
}

async function pastikanNamaUnik(tx: Tx, nama: string, kecualiId?: string) {
  const [lain] = await tx
    .select({ id: bahan.id })
    .from(bahan)
    .where(
      and(
        eq(sql`lower(${bahan.nama})`, nama.toLowerCase()),
        kecualiId ? ne(bahan.id, kecualiId) : undefined,
      ),
    )
    .limit(1);
  if (lain) throw new PesanError(PESAN_NAMA_DUPLIKAT, { field: 'nama' });
}

/** Supplier baru harus aktif; supplier yang sudah terpasang boleh tetap dipakai walau nonaktif. */
async function pastikanSupplier(
  tx: Tx,
  supplierId: string | null,
  supplierSekarang?: string | null,
) {
  if (!supplierId || supplierId === supplierSekarang) return;
  const [baris] = await tx
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, supplierId), eq(supplier.aktif, true)));
  if (!baris) {
    throw new PesanError('Supplier tidak ditemukan atau nonaktif', { field: 'supplierUtamaId' });
  }
}

async function catatRiwayatManual(
  tx: Tx,
  input: { bahanId: string; hargaLama: string; hargaBaru: string; olehId: string },
) {
  await tx.insert(riwayatHarga).values({
    bahanId: input.bahanId,
    hargaLama: input.hargaLama,
    hargaBaru: input.hargaBaru,
    sumber: 'manual',
    dibuatOleh: input.olehId,
  });
}

async function kunciBahan(tx: Tx, id: string) {
  const [baris] = await tx
    .select({
      satuanDasar: bahan.satuanDasar,
      hargaPerSatuan: bahan.hargaPerSatuan,
      supplierUtamaId: bahan.supplierUtamaId,
    })
    .from(bahan)
    .where(eq(bahan.id, id))
    .for('update');
  if (!baris) throw new PesanError(PESAN_TIDAK_ADA);
  return baris;
}

export const buatBahan = aksi({
  schema: buatBahanSchema,
  peran: PEMILIK,
  jalankan: async ({ hargaAwal, stokAwal, ...data }, pengguna) => {
    const id = await db.transaction(async (tx) => {
      await pastikanNamaUnik(tx, data.nama);
      await pastikanSupplier(tx, data.supplierUtamaId);

      const harga = hargaAwal ? keNumeric(hargaDariKemasan(hargaAwal, data.satuanDasar), 4) : '0';
      const [baris] = await tx
        .insert(bahan)
        .values({ ...data, hargaPerSatuan: harga })
        .returning({ id: bahan.id });
      if (!baris) throw new Error('Gagal menyimpan bahan');

      if (hargaAwal) {
        await catatRiwayatManual(tx, {
          bahanId: baris.id,
          hargaLama: '0',
          hargaBaru: harga,
          olehId: pengguna.id,
        });
      }

      if (stokAwal && stokAwal !== '0') {
        // PRD F-BHN-04: stok awal tercatat sebagai mutasi, bukan langsung ke saldo.
        await catatMutasi(tx, {
          jenis: 'stok_awal',
          target: { bahanId: baris.id },
          qty: stokAwal,
          nilaiSatuan: harga,
          alasan: 'Stok awal',
          sumberTipe: 'manual',
          sumberId: null,
          dibuatOleh: pengguna.id,
          izinkanMinus: false,
        });
      }
      return baris.id;
    });

    segarkan();
    return { id };
  },
});

export const ubahBahan = aksi({
  schema: ubahBahanSchema,
  peran: PEMILIK,
  jalankan: async ({ id, ...data }, pengguna) => {
    await db.transaction(async (tx) => {
      const lama = await kunciBahan(tx, id);
      await pastikanNamaUnik(tx, data.nama, id);
      await pastikanSupplier(tx, data.supplierUtamaId, lama.supplierUtamaId);

      const gantiSatuan = data.satuanDasar !== lama.satuanDasar;
      if (gantiSatuan && (await bahanTerkunci(id, tx))) {
        throw new PesanError('Satuan dasar tidak bisa diubah karena bahan sudah dipakai', {
          field: 'satuanDasar',
        });
      }

      // Harga lama per g/ml/pcs tidak berlaku lagi untuk satuan baru.
      const resetHarga = gantiSatuan && Number(lama.hargaPerSatuan) !== 0;
      await tx
        .update(bahan)
        .set({ ...data, ...(resetHarga ? { hargaPerSatuan: '0' } : {}) })
        .where(eq(bahan.id, id));

      if (resetHarga) {
        await catatRiwayatManual(tx, {
          bahanId: id,
          hargaLama: lama.hargaPerSatuan,
          hargaBaru: '0',
          olehId: pengguna.id,
        });
      }
    });

    segarkan(id);
    return { id };
  },
});

export const ubahHargaManual = aksi({
  schema: ubahHargaManualSchema,
  peran: PEMILIK,
  jalankan: async ({ id, ...kemasan }, pengguna) => {
    const hasil = await db.transaction(async (tx) => {
      const lama = await kunciBahan(tx, id);
      const hargaBaru = hargaDariKemasan(kemasan, lama.satuanDasar);
      const hargaPerSatuan = keNumeric(hargaBaru, 4);
      if (hargaBaru.eq(lama.hargaPerSatuan)) return { id, hargaPerSatuan, berubah: false };

      await tx.update(bahan).set({ hargaPerSatuan }).where(eq(bahan.id, id));
      await catatRiwayatManual(tx, {
        bahanId: id,
        hargaLama: lama.hargaPerSatuan,
        hargaBaru: hargaPerSatuan,
        olehId: pengguna.id,
      });
      await catatAudit(tx, {
        penggunaId: pengguna.id,
        tabel: 'bahan',
        recordId: id,
        aksi: 'update',
        dataLama: { hargaPerSatuan: lama.hargaPerSatuan },
        dataBaru: { hargaPerSatuan },
      });
      return { id, hargaPerSatuan, berubah: true };
    });

    segarkan(id);
    return hasil;
  },
});

export const setAktifBahan = aksi({
  schema: setAktifBahanSchema,
  peran: PEMILIK,
  jalankan: async ({ id, aktif }) => {
    const [baris] = await db
      .update(bahan)
      .set({ aktif })
      .where(eq(bahan.id, id))
      .returning({ id: bahan.id });
    if (!baris) throw new PesanError(PESAN_TIDAK_ADA);
    segarkan(id);
    return baris;
  },
});
