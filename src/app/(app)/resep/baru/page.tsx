import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { peranUntuk } from '@/config/navigasi';
import { FormResep } from '@/features/resep/components/form-resep';
import { pilihanBahan } from '@/features/resep/queries';
import { requirePeran } from '@/lib/auth';

export const metadata: Metadata = { title: 'Tambah resep' };

async function IsiResepBaru() {
  await requirePeran(...peranUntuk('/resep'));
  const bahan = (await pilihanBahan()).map((item) => ({ ...item, aktif: true }));
  return <FormResep bahan={bahan} />;
}

export default function HalamanResepBaru() {
  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        className="h-10 w-fit"
        nativeButton={false}
        render={<Link href="/resep" />}
      >
        <ArrowLeft /> Daftar resep
      </Button>
      <PageHeader judul="Tambah resep" deskripsi="Susun bahan dan lihat biaya adonan langsung." />
      <Suspense fallback={<LoadingSkeleton />}>
        <IsiResepBaru />
      </Suspense>
    </div>
  );
}
