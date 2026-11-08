import { Cake, Filter, Plus, Search, X } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { EmptyState } from '@/components/empty-state';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { peranUntuk } from '@/config/navigasi';
import { daftarProduk } from '@/features/produk/queries';
import { requirePeran } from '@/lib/auth';
import { formatRupiah, formatRupiahDesimal } from '@/lib/format';

export const metadata: Metadata = { title: 'Produk' };

function tombolTambah() {
  return (
    <Button className="h-11" nativeButton={false} render={<Link href="/produk/baru" />}>
      <Plus /> Tambah produk
    </Button>
  );
}

function buildUrl(
  searchParams: { [key: string]: string | string[] | undefined },
  updates: Record<string, string | null>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function filterLink(
  searchParams: { [key: string]: string | string[] | undefined },
  updates: Record<string, string | null>,
  aktif: boolean,
  children: React.ReactNode,
) {
  return (
    <Button
      variant={aktif ? 'default' : 'outline'}
      className="flex h-10 items-center gap-1.5"
      nativeButton={false}
      render={<Link href={buildUrl(searchParams, updates)} />}
    >
      {children}
    </Button>
  );
}

async function IsiProduk(props: {
  params: Promise<{ searchParams: { [key: string]: string | string[] | undefined } }>;
}) {
  const { searchParams } = await props.params;
  await requirePeran(...peranUntuk('/produk'));

  const q = (searchParams.q as string | undefined) ?? '';
  const kategori = (searchParams.kategori as string | undefined) ?? undefined;
  const dijualRaw = searchParams.dijual as string | undefined;
  const dijual = dijualRaw === undefined ? undefined : dijualRaw === '1';
  const marginDiBawahTarget = searchParams.margin === '1';

  const data = await daftarProduk({
    q: q || undefined,
    kategori,
    dijual,
    aktif: true,
    marginDiBawahTarget,
  });

  const kategoriTersedia = [...new Set(data.map((item) => item.kategori))].sort();

  return (
    <>
      <PageHeader
        judul="Daftar produk"
        deskripsi="Atur komponen, lihat HPP, dan kelola margin tiap produk."
        aksi={tombolTambah()}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-64">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input placeholder="Cari nama produk…" value={q} className="pl-10" />
            {q ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                onClick={() => {
                  // no-op; navigasi melalui link di bawah
                }}
              >
                <X className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {filterLink(searchParams, { kategori: null }, kategori === null, 'Semua kategori')}
            {kategoriTersedia.map((kat) =>
              filterLink(searchParams, { kategori: kat }, kategori === kat, kat),
            )}
          </div>
        </div>
        <div className="flex w-full flex-col items-end gap-3 sm:w-auto sm:flex-row">
          {filterLink(
            searchParams,
            { dijual: dijual === true ? null : '1' },
            dijual === true,
            'Dijual',
          )}
          {filterLink(
            searchParams,
            { dijual: dijual === false ? null : '0' },
            dijual === false,
            'Tidak dijual',
          )}
          {filterLink(
            searchParams,
            { margin: marginDiBawahTarget ? null : '1' },
            marginDiBawahTarget,
            <>
              <Filter className="size-4" aria-hidden />
              Margin di bawah target
            </>,
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState
          ikon={Cake}
          judul="Belum ada produk"
          deskripsi="Buat produk pertama untuk mengelola komponen dan HPP."
          aksi={tombolTambah()}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((produk) => (
            <li key={produk.id}>
              <Link
                href={`/produk/${produk.id}`}
                className="hover:bg-muted/50 focus-visible:ring-ring flex h-full min-h-52 flex-col gap-3 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 flex-1 font-medium">{produk.nama}</h2>
                  {produk.aktif ? null : <Badge variant="secondary">Nonaktif</Badge>}
                  {produk.dijual ? null : <Badge variant="outline">Tidak dijual</Badge>}
                </div>
                {produk.cetakan ? (
                  <p className="text-muted-foreground text-sm">{produk.cetakan}</p>
                ) : null}
                <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Harga jual</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {formatRupiah(produk.hargaJual)}
                  </dd>
                  <dt className="text-muted-foreground">HPP</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {formatRupiah(produk.hpp)}
                  </dd>
                  <dt className="text-muted-foreground">Margin</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {formatRupiahDesimal(Number(produk.marginPersen) * 100)}%
                  </dd>
                </dl>
                <div className="mt-auto">
                  <Badge
                    variant={produk.diBawahTarget ? 'destructive' : 'secondary'}
                    className={`w-fit ${
                      produk.diBawahTarget ? 'bg-destructive/10 text-destructive' : ''
                    }`}
                  >
                    {produk.diBawahTarget ? 'Di bawah target' : 'Margin aman'}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function HalamanProduk(props: {
  params: Promise<{ searchParams: { [key: string]: string | string[] | undefined } }>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<LoadingSkeleton baris={6} />}>
        <IsiProduk params={props.params} />
      </Suspense>
    </div>
  );
}
