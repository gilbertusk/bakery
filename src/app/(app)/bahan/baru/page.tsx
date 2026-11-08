import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { peranUntuk } from '@/config/navigasi';
import { FormBahan } from '@/features/bahan/components/form-bahan';
import { pilihanSupplier } from '@/features/supplier/queries';
import { requirePeran } from '@/lib/auth';

export const metadata: Metadata = { title: 'Tambah bahan' };

async function IsiBahanBaru() {
  await requirePeran(...peranUntuk('/bahan'));
  const suppliers = await pilihanSupplier();
  return (
    <div className="rounded-xl border p-4 sm:p-6">
      <FormBahan suppliers={suppliers} />
    </div>
  );
}

export default function HalamanBahanBaru() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Button
        variant="ghost"
        className="h-10 w-fit"
        nativeButton={false}
        render={<Link href="/bahan" />}
      >
        <ArrowLeft />
        Daftar bahan
      </Button>
      <PageHeader judul="Tambah bahan" deskripsi="Harga dan stok awal boleh diisi nanti." />
      <Suspense fallback={<LoadingSkeleton />}>
        <IsiBahanBaru />
      </Suspense>
    </div>
  );
}
