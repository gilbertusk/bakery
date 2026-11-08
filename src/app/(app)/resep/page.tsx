import { BookOpen, ChevronRight, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { EmptyState } from '@/components/empty-state';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { peranUntuk } from '@/config/navigasi';
import { daftarResep } from '@/features/resep/queries';
import { requirePeran } from '@/lib/auth';
import { formatAngka, formatRupiah, formatRupiahDesimal } from '@/lib/format';

export const metadata: Metadata = { title: 'Resep' };

function tombolTambah() {
  return (
    <Button className="h-11" nativeButton={false} render={<Link href="/resep/baru" />}>
      <Plus /> Tambah resep
    </Button>
  );
}

async function IsiResep() {
  await requirePeran(...peranUntuk('/resep'));
  const data = await daftarResep();

  return (
    <>
      <PageHeader
        judul="Resep adonan"
        deskripsi="Takaran, hasil adonan, dan biaya bahan terbaru."
        aksi={data.length > 0 ? tombolTambah() : null}
      />
      {data.length === 0 ? (
        <EmptyState
          ikon={BookOpen}
          judul="Belum ada resep"
          deskripsi="Buat resep pertama untuk menghitung biaya adonan per gram."
          aksi={tombolTambah()}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((resep) => (
            <li key={resep.id}>
              <Link
                href={`/resep/${resep.id}`}
                className="hover:bg-muted/50 focus-visible:ring-ring flex h-full min-h-44 flex-col gap-4 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-2"
              >
                <div className="flex items-start gap-2">
                  <h2 className="min-w-0 flex-1 font-medium">{resep.nama}</h2>
                  {resep.aktif ? null : <Badge variant="secondary">Nonaktif</Badge>}
                  <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Hasil</dt>
                  <dd className="text-right tabular-nums">{formatAngka(resep.hasilGram)} g</dd>
                  <dt className="text-muted-foreground">Biaya total</dt>
                  <dd className="text-right tabular-nums">{formatRupiah(resep.biayaTotal)}</dd>
                  <dt className="text-muted-foreground">Biaya/gram</dt>
                  <dd className="text-right tabular-nums">
                    {formatRupiahDesimal(resep.biayaPerGram)}/g
                  </dd>
                </dl>
                <p className="text-muted-foreground mt-auto text-sm">
                  {resep.jumlahProduk === 0
                    ? 'Belum dipakai produk'
                    : `Dipakai ${resep.jumlahProduk} produk`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function HalamanResep() {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<LoadingSkeleton />}>
        <IsiResep />
      </Suspense>
    </div>
  );
}
