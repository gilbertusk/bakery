import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';

import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { peranUntuk } from '@/config/navigasi';
import { FormProduk } from '@/features/produk/components/form-produk';
import {
  detailProduk,
  pengaturanFormProduk,
  pilihanBahan,
  pilihanResep,
} from '@/features/produk/queries';
import { requirePeran } from '@/lib/auth';

export const metadata: Metadata = { title: 'Ubah produk' };

async function IsiUbahProduk({ params }: Pick<PageProps<'/produk/[id]/ubah'>, 'params'>) {
  const [, { id }] = await Promise.all([requirePeran(...peranUntuk('/produk')), params]);
  if (!z.uuid().safeParse(id).success) notFound();
  const [produk, resep, bahan, pengaturan] = await Promise.all([
    detailProduk(id),
    pilihanResep(),
    pilihanBahan(),
    pengaturanFormProduk(),
  ]);
  if (!produk) notFound();

  return (
    <FormProduk
      resep={resep}
      bahan={bahan}
      targetMarginDefault={pengaturan.targetMarginDefault}
      produk={{
        id: produk.id,
        nama: produk.nama,
        kategori: produk.kategori,
        cetakan: produk.cetakan,
        hargaJual: produk.hargaJual,
        targetMargin: produk.targetMargin,
        stok: produk.stok,
        fotoUrl: produk.fotoUrl,
        dijual: produk.dijual,
        komponen: produk.komponen.map((item) =>
          item.jenis === 'adonan'
            ? {
                jenis: 'adonan' as const,
                resepAdonanId: item.resepAdonanId ?? '',
                gramPerPcs: item.gramPerPcs ?? '',
              }
            : {
                jenis: 'bahan' as const,
                peran: item.peran as 'topping' | 'filling' | 'kemasan' | 'lainnya',
                bahanId: item.bahanId ?? '',
                takaran: item.takaran ?? '',
                konversiSatuanId:
                  item.konversi.find((konversi) => konversi.namaSatuan === item.namaSatuan)?.id ??
                  null,
              },
        ),
      }}
    />
  );
}

export default function HalamanUbahProduk({ params }: PageProps<'/produk/[id]/ubah'>) {
  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        className="h-10 w-fit"
        nativeButton={false}
        render={<Link href="/produk" />}
      >
        <ArrowLeft /> Daftar produk
      </Button>
      <PageHeader
        judul="Ubah produk"
        deskripsi="Stok hanya dapat diubah lewat produksi atau penyesuaian."
      />
      <Suspense fallback={<LoadingSkeleton baris={6} />}>
        <IsiUbahProduk params={params} />
      </Suspense>
    </div>
  );
}
