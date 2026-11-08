'use server';

import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { type Tx, db } from '@/db/client';
import { bahan, konversiSatuan, produk, produkKomponen } from '@/db/schema';
import { keNumeric } from '@/lib/angka';
import { PesanError, aksi } from '@/lib/aksi';
import { catatAudit } from '@/lib/audit';
import { keSatuanDasar } from '@/lib/hpp';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

import {
  setAktifProdukSchema,
  setDijualProdukSchema,
  simpanProdukSchema,
  type SimpanProdukData,
} from './schemas';

const PEMILIK = ['pemilik' as const];
const PESAN_TIDAK_ADA = 'Produk tidak ditemukan';
const PESAN_DUPLIKAT = 'Produk dengan nama ini sudah ada';
const UKURAN_MAKSIMAL = 2 * 1024 * 1024;
const TIPE_VALID = ['image/jpeg', 'image/png', 'image/webp'];

function segarkan(id?: string) {
  revalidatePath('/produk');
  if (id) revalidatePath(`/produk/${id}`);
  revalidatePath('/kasir');
}

async function pastikanNamaUnik(tx: Tx, nama: string, kecualiId?: string | null) {
  const [lain] = await tx
    .select({ id: produk.id })
    .from(produk)
    .where(
      and(
        eq(sql`lower(${produk.nama})`, nama.toLowerCase()),
        kecualiId ? ne(produk.id, kecualiId) : undefined,
      ),
    )
    .limit(1);
  if (lain) throw new PesanError(PESAN_DUPLIKAT, { field: 'nama' });
}

async function hitungKomponen(tx: Tx, komponen: SimpanProdukData['komponen']) {
  const bahanIds = [...new Set(komponen.filter((k) => k.jenis === 'bahan').map((k) => k.bahanId))];
  const daftarBahan =
    bahanIds.length > 0
      ? await tx
          .select({ id: bahan.id, nama: bahan.nama, satuanDasar: bahan.satuanDasar })
          .from(bahan)
          .where(inArray(bahan.id, bahanIds))
      : [];
  const bahanById = new Map(daftarBahan.map((b) => [b.id, b]));

  const konversiIds = [
    ...new Set(
      komponen
        .filter((k) => k.jenis === 'bahan' && (k as { konversiSatuanId?: string }).konversiSatuanId)
        .map((k) => (k as { konversiSatuanId?: string }).konversiSatuanId!),
    ),
  ];
  const daftarKonversi =
    konversiIds.length > 0
      ? await tx
          .select({
            id: konversiSatuan.id,
            bahanId: konversiSatuan.bahanId,
            nilaiDasar: konversiSatuan.nilaiDasar,
          })
          .from(konversiSatuan)
          .where(inArray(konversiSatuan.id, konversiIds))
      : [];
  const konversiById = new Map(daftarKonversi.map((k) => [k.id, k]));

  return komponen.map((k, index) => {
    if (k.jenis === 'adonan') {
      return {
        ...k,
        takaranDasar: keNumeric(k.gramPerPcs, 3),
        urutan: index + 1,
      };
    }
    const infoBahan = bahanById.get(k.bahanId);
    if (!infoBahan) {
      throw new PesanError('Bahan tidak ditemukan', { field: `komponen.${index}.bahanId` });
    }
    const konversi = k.konversiSatuanId ? konversiById.get(k.konversiSatuanId) : null;
    if (k.konversiSatuanId && (!konversi || konversi.bahanId !== k.bahanId)) {
      throw new PesanError('Konversi satuan tidak cocok dengan bahan', {
        field: `komponen.${index}.konversiSatuanId`,
      });
    }
    const takaranDasar = keNumeric(keSatuanDasar(k.takaran, konversi?.nilaiDasar ?? null), 3);
    return { ...k, infoBahan, takaranDasar, urutan: index + 1 };
  });
}

export const simpanProduk = aksi({
  schema: simpanProdukSchema,
  peran: PEMILIK,
  jalankan: async (data, pengguna) => {
    const hargaLamaSebelum = data.id
      ? (
          await db
            .select({ hargaJual: produk.hargaJual })
            .from(produk)
            .where(eq(produk.id, data.id))
            .limit(1)
        )[0]?.hargaJual
      : null;

    const hasil = await db.transaction(async (tx) => {
      if (data.id) {
        const [lama] = await tx
          .select({ id: produk.id })
          .from(produk)
          .where(eq(produk.id, data.id))
          .for('update');
        if (!lama) throw new PesanError(PESAN_TIDAK_ADA);
      }
      await pastikanNamaUnik(tx, data.nama, data.id);
      const komponen = await hitungKomponen(tx, data.komponen);

      const nilaiProduk = {
        nama: data.nama,
        kategori: data.kategori,
        cetakan: data.cetakan,
        hargaJual: Number(data.hargaJual),
        targetMargin:
          data.targetMargin === null || data.targetMargin === undefined
            ? null
            : keNumeric(data.targetMargin, 4),
        dijual: data.dijual,
      };
      let id = data.id;
      if (id) {
        await tx.update(produk).set(nilaiProduk).where(eq(produk.id, id));
        await tx.delete(produkKomponen).where(eq(produkKomponen.produkId, id));
      } else {
        const [baru] = await tx
          .insert(produk)
          .values({ ...nilaiProduk, aktif: true })
          .returning({ id: produk.id });
        if (!baru) throw new Error('Gagal menyimpan produk');
        id = baru.id;
      }

      await tx.insert(produkKomponen).values(
        komponen.map((k) => ({
          produkId: id!,
          peran:
            k.jenis === 'adonan'
              ? ('adonan' as const)
              : (k.peran as (typeof produkKomponen.$inferSelect)['peran']),
          resepAdonanId: k.jenis === 'adonan' ? k.resepAdonanId : (null as string | null),
          bahanId: k.jenis === 'bahan' ? k.bahanId : (null as string | null),
          takaran: k.jenis === 'bahan' ? k.takaran : keNumeric(k.gramPerPcs, 3),
          konversiSatuanId: k.jenis === 'bahan' ? k.konversiSatuanId : null,
          takaranDasar: k.takaranDasar,
          urutan: k.urutan,
        })),
      );

      if (hargaLamaSebelum !== null && hargaLamaSebelum !== Number(data.hargaJual)) {
        await catatAudit(tx, {
          penggunaId: pengguna.id,
          tabel: 'produk',
          recordId: id!,
          aksi: 'update',
          dataLama: { hargaJual: String(hargaLamaSebelum) },
          dataBaru: { hargaJual: String(data.hargaJual) },
        });
      }

      return { id: id! };
    });

    segarkan(hasil.id);
    return hasil;
  },
});

export const setAktifProduk = aksi({
  schema: setAktifProdukSchema,
  peran: PEMILIK,
  jalankan: async ({ id, aktif }) => {
    const [baris] = await db
      .update(produk)
      .set({ aktif })
      .where(eq(produk.id, id))
      .returning({ id: produk.id });
    if (!baris) throw new PesanError(PESAN_TIDAK_ADA);
    segarkan(id);
    return baris;
  },
});

export const setDijualProduk = aksi({
  schema: setDijualProdukSchema,
  peran: PEMILIK,
  jalankan: async ({ id, dijual }) => {
    const [baris] = await db
      .update(produk)
      .set({ dijual })
      .where(eq(produk.id, id))
      .returning({ id: produk.id });
    if (!baris) throw new PesanError(PESAN_TIDAK_ADA);
    segarkan(id);
    return baris;
  },
});

export async function unggahFotoProduk(input: {
  id: string;
  file: File;
}): Promise<{ ok: true; data: { fotoUrl: string } } | { ok: false; error: string }> {
  const { id, file } = input;

  if (!TIPE_VALID.includes(file.type)) {
    return {
      ok: false,
      error: 'Tipe file harus jpeg, png, atau webp',
    };
  }
  if (file.size > UKURAN_MAKSIMAL) {
    return { ok: false, error: 'Ukuran file maksimal 2 MB' };
  }

  const [lama] = await db
    .select({ fotoUrl: produk.fotoUrl })
    .from(produk)
    .where(eq(produk.id, id))
    .limit(1);
  if (!lama) return { ok: false, error: 'Produk tidak ditemukan' };

  const ekstensi = String(file.name.split('.').pop() ?? 'jpg');
  const namaFile = `produk/${id}/${crypto.randomUUID()}.${ekstensi}`;
  const supabase = createSupabaseAdminClient();
  const { error: uploadError } = await supabase.storage
    .from('produk')
    .upload(namaFile, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, error: 'Gagal mengunggah foto, coba lagi' };
  }

  const { data: urlData } = supabase.storage.from('produk').getPublicUrl(namaFile);

  if (lama.fotoUrl) {
    const pathLama = lama.fotoUrl.split('/produk/')[1]?.split('?')[0];
    if (pathLama) {
      await supabase.storage.from('produk').remove([pathLama]);
    }
  }

  const [baris] = await db
    .update(produk)
    .set({ fotoUrl: urlData.publicUrl })
    .where(eq(produk.id, id))
    .returning({ fotoUrl: produk.fotoUrl });

  segarkan(id);
  return { ok: true, data: { fotoUrl: baris!.fotoUrl ?? '' } };
}
