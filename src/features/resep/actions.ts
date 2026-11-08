'use server';

import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { type Tx, db } from '@/db/client';
import {
  bahan,
  konversiSatuan,
  produk,
  produkKomponen,
  resepAdonan,
  resepAdonanItem,
} from '@/db/schema';
import { D, keNumeric } from '@/lib/angka';
import { PesanError, aksi } from '@/lib/aksi';
import { hasilOtomatis, keSatuanDasar } from '@/lib/hpp';

import { setAktifResepSchema, simpanResepSchema, type SimpanResepData } from './schemas';

const PEMILIK = ['pemilik' as const];
const PESAN_TIDAK_ADA = 'Resep tidak ditemukan';
const PESAN_DUPLIKAT = 'Resep dengan nama ini sudah ada';

function segarkan(id: string) {
  revalidatePath('/resep');
  revalidatePath(`/resep/${id}`);
  revalidatePath(`/resep/${id}/ubah`);
  revalidatePath('/produk');
}

async function pastikanNamaUnik(tx: Tx, nama: string, kecualiId?: string | null) {
  const [lain] = await tx
    .select({ id: resepAdonan.id })
    .from(resepAdonan)
    .where(
      and(
        eq(sql`lower(${resepAdonan.nama})`, nama.toLowerCase()),
        kecualiId ? ne(resepAdonan.id, kecualiId) : undefined,
      ),
    )
    .limit(1);
  if (lain) throw new PesanError(PESAN_DUPLIKAT, { field: 'nama' });
}

async function hitungItems(tx: Tx, data: SimpanResepData) {
  const bahanIds = [...new Set(data.items.map((item) => item.bahanId))];
  const daftarBahan = await tx
    .select({ id: bahan.id, nama: bahan.nama, satuanDasar: bahan.satuanDasar })
    .from(bahan)
    .where(inArray(bahan.id, bahanIds))
    .for('key share');
  const bahanById = new Map(daftarBahan.map((item) => [item.id, item]));

  const konversiIds = [
    ...new Set(
      data.items.flatMap((item) => (item.konversiSatuanId ? [item.konversiSatuanId] : [])),
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
          .for('key share')
      : [];
  const konversiById = new Map(daftarKonversi.map((item) => [item.id, item]));

  return data.items.map((item, index) => {
    const infoBahan = bahanById.get(item.bahanId);
    if (!infoBahan) {
      throw new PesanError('Bahan tidak ditemukan', { field: `items.${index}.bahanId` });
    }
    const konversi = item.konversiSatuanId ? konversiById.get(item.konversiSatuanId) : null;
    if (item.konversiSatuanId && (!konversi || konversi.bahanId !== item.bahanId)) {
      throw new PesanError('Konversi satuan tidak cocok dengan bahan', {
        field: `items.${index}.konversiSatuanId`,
      });
    }
    const takaranDasar = keNumeric(keSatuanDasar(item.takaran, konversi?.nilaiDasar ?? null), 3);
    return { ...item, infoBahan, takaranDasar, urutan: index + 1 };
  });
}

function kolomLoyang(loyang: SimpanResepData['loyang']) {
  if (!loyang) {
    return { bentukLoyang: null, diameterCm: null, panjangCm: null, lebarCm: null };
  }
  if (loyang.bentuk === 'bulat') {
    return {
      bentukLoyang: 'bulat' as const,
      diameterCm: loyang.diameterCm,
      panjangCm: null,
      lebarCm: null,
    };
  }
  return {
    bentukLoyang: 'kotak' as const,
    diameterCm: null,
    panjangCm: loyang.panjangCm,
    lebarCm: loyang.lebarCm,
  };
}

export const simpanResep = aksi({
  schema: simpanResepSchema,
  peran: PEMILIK,
  jalankan: async (data) => {
    const hasil = await db.transaction(async (tx) => {
      if (data.id) {
        const [lama] = await tx
          .select({ id: resepAdonan.id })
          .from(resepAdonan)
          .where(eq(resepAdonan.id, data.id))
          .for('update');
        if (!lama) throw new PesanError(PESAN_TIDAK_ADA);
      }
      await pastikanNamaUnik(tx, data.nama, data.id);
      const items = await hitungItems(tx, data);

      let hasilGram = data.hasilGram;
      let peringatan: string[] = [];
      if (data.modeHasil === 'otomatis') {
        const otomatis = hasilOtomatis(
          items.map((item) => ({
            takaranDasar: item.takaranDasar,
            satuanDasar: item.infoBahan.satuanDasar,
            namaBahan: item.infoBahan.nama,
          })),
        );
        if (!otomatis.hasilGram.gt(0)) {
          throw new PesanError('Hasil adonan otomatis harus lebih dari 0', { field: 'modeHasil' });
        }
        hasilGram = keNumeric(otomatis.hasilGram, 3);
        peringatan = otomatis.peringatan;
      }
      if (!hasilGram || !D(hasilGram).gt(0)) {
        throw new PesanError('Hasil gram wajib diisi untuk mode timbang', { field: 'hasilGram' });
      }

      const nilaiResep = {
        nama: data.nama,
        modeHasil: data.modeHasil,
        hasilGram,
        caraBuat: data.caraBuat,
        ...kolomLoyang(data.loyang),
      };
      let id = data.id;
      if (id) {
        await tx.update(resepAdonan).set(nilaiResep).where(eq(resepAdonan.id, id));
        await tx.delete(resepAdonanItem).where(eq(resepAdonanItem.resepAdonanId, id));
      } else {
        const [baru] = await tx
          .insert(resepAdonan)
          .values(nilaiResep)
          .returning({ id: resepAdonan.id });
        if (!baru) throw new Error('Gagal menyimpan resep');
        id = baru.id;
      }

      await tx.insert(resepAdonanItem).values(
        items.map((item) => ({
          resepAdonanId: id!,
          bahanId: item.bahanId,
          takaran: item.takaran,
          konversiSatuanId: item.konversiSatuanId,
          takaranDasar: item.takaranDasar,
          urutan: item.urutan,
        })),
      );
      return { id: id!, peringatan };
    });

    segarkan(hasil.id);
    return hasil;
  },
});

export const setAktifResep = aksi({
  schema: setAktifResepSchema,
  peran: PEMILIK,
  jalankan: async ({ id, aktif }) => {
    await db.transaction(async (tx) => {
      const [resep] = await tx
        .select({ id: resepAdonan.id })
        .from(resepAdonan)
        .where(eq(resepAdonan.id, id))
        .for('update');
      if (!resep) throw new PesanError(PESAN_TIDAK_ADA);

      if (!aktif) {
        const pemakai = await tx
          .selectDistinct({ nama: produk.nama })
          .from(produkKomponen)
          .innerJoin(produk, eq(produk.id, produkKomponen.produkId))
          .where(and(eq(produkKomponen.resepAdonanId, id), eq(produk.aktif, true)))
          .orderBy(asc(produk.nama));
        if (pemakai.length > 0) {
          throw new PesanError(
            `Resep tidak bisa dinonaktifkan karena dipakai produk aktif ${pemakai.map((item) => item.nama).join(', ')}`,
          );
        }
      }

      await tx.update(resepAdonan).set({ aktif }).where(eq(resepAdonan.id, id));
    });
    segarkan(id);
    return { id };
  },
});
