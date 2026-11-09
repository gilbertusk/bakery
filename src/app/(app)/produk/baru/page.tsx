import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { peranUntuk } from '@/config/navigasi';
import { FormProduk } from '@/features/produk/components/form-produk';
import { pengaturanFormProduk, pilihanBahan, pilihanResep } from '@/features/produk/queries';
import { requirePeran } from '@/lib/auth';

export const metadata: Metadata = { title: 'Tambah produk' };

async function IsiProdukBaru() {
  await requirePeran(...peranUntuk('/produk'));
  const [resep, bahan, pengaturan] = await Promise.all([
    pilihanResep(),
    pilihanBahan(),
    pengaturanFormProduk(),
  ]);
  return (
    <FormProduk resep={resep} bahan={bahan} targetMarginDefault={pengaturan.targetMarginDefault} />
  );
}

export default function HalamanProdukBaru() {
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
        judul="Tambah produk"
        deskripsi="Susun komponen dan lihat HPP per pcs langsung."
      />
      <Suspense fallback={<LoadingSkeleton baris={6} />}>
        <IsiProdukBaru />
      </Suspense>
    </div>
  );
}
