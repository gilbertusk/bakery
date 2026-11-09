import { ArrowLeft, FlaskConical } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { EmptyState } from '@/components/empty-state';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { peranUntuk } from '@/config/navigasi';
import { FormSimulasi } from '@/features/simulasi/components/form-simulasi';
import { pilihanBahanSimulasi } from '@/features/simulasi/queries';
import { requirePeran } from '@/lib/auth';

export const metadata: Metadata = { title: 'Simulasi harga bahan' };

async function IsiSimulasi({ searchParams }: Pick<PageProps<'/produk/simulasi'>, 'searchParams'>) {
  const [, params] = await Promise.all([requirePeran(...peranUntuk('/produk')), searchParams]);
  const bahan = await pilihanBahanSimulasi();
  const bahanParam = Array.isArray(params.bahanId) ? params.bahanId[0] : params.bahanId;
  const bahanAwalId = bahan.some((item) => item.id === bahanParam) ? bahanParam : undefined;

  return (
    <>
      <PageHeader
        judul="Simulasi kenaikan harga bahan"
        deskripsi="Lihat dampak perubahan harga bahan terhadap HPP dan margin tanpa menyimpan perubahan."
      />
      {bahan.length === 0 ? (
        <EmptyState
          ikon={FlaskConical}
          judul="Belum ada bahan"
          deskripsi="Tambahkan bahan terlebih dahulu sebelum menjalankan simulasi."
        />
      ) : (
        <FormSimulasi bahan={bahan} bahanAwalId={bahanAwalId} />
      )}
    </>
  );
}

export default function HalamanSimulasi({ searchParams }: PageProps<'/produk/simulasi'>) {
  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        className="h-10 w-fit"
        nativeButton={false}
        render={<Link href="/produk" />}
      >
        <ArrowLeft /> Kembali ke produk
      </Button>
      <Suspense fallback={<LoadingSkeleton />}>
        <IsiSimulasi searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
