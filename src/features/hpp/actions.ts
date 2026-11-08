'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db/client';
import { produk } from '@/db/schema';
import { PesanError, aksi } from '@/lib/aksi';
import { catatAudit } from '@/lib/audit';

import { ubahHargaJualSchema } from './schemas';

const PEMILIK = ['pemilik' as const];
const PESAN_TIDAK_ADA = 'Produk tidak ditemukan';

function segarkan(id: string) {
  revalidatePath('/produk');
  revalidatePath(`/produk/${id}`);
}

export const ubahHargaJual = aksi({
  schema: ubahHargaJualSchema,
  peran: PEMILIK,
  jalankan: async (data, pengguna) => {
    const hasil = await db.transaction(async (tx) => {
      const [baris] = await tx
        .select({ id: produk.id, hargaJual: produk.hargaJual })
        .from(produk)
        .where(eq(produk.id, data.id))
        .for('update');
      if (!baris) throw new PesanError(PESAN_TIDAK_ADA);

      const hargaLama = Number(baris.hargaJual);
      const hargaBaru = data.hargaJual;

      await tx.update(produk).set({ hargaJual: hargaBaru }).where(eq(produk.id, data.id));

      if (hargaLama !== hargaBaru) {
        await catatAudit(tx, {
          penggunaId: pengguna.id,
          tabel: 'produk',
          recordId: data.id,
          aksi: 'update',
          dataLama: { hargaJual: String(hargaLama) },
          dataBaru: { hargaJual: String(hargaBaru) },
        });
      }

      return { id: data.id };
    });

    segarkan(data.id);
    return hasil;
  },
});
