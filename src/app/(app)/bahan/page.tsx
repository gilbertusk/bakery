import { ChevronRight, Plus, SearchX, Wheat } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { EmptyState } from '@/components/empty-state';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { peranUntuk } from '@/config/navigasi';
import { BadgeNonaktif, BadgeStok } from '@/features/bahan/components/badge-stok';
import { FilterBahan } from '@/features/bahan/components/filter-bahan';
import { type BarisBahan, daftarBahan, kategoriBahan } from '@/features/bahan/queries';
import { bacaFilterStok } from '@/features/bahan/status-stok';
import { requirePeran } from '@/lib/auth';
import { aktifDariStatus, bacaStatus } from '@/lib/filter';
import { formatHargaSatuan, formatTakaran } from '@/lib/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Bahan' };

function tombolTambah(label = 'Tambah bahan') {
  return (
    <Button className="h-11" nativeButton={false} render={<Link href="/bahan/baru" />}>
      <Plus />
      {label}
    </Button>
  );
}

function teksStok(b: BarisBahan) {
  return (
    <span className={cn('tabular-nums', b.status === 'minus' && 'text-destructive font-medium')}>
      {formatTakaran(b.stok, b.satuanDasar)}
    </span>
  );
}

function DaftarKartu({ data }: { data: BarisBahan[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {data.map((b) => (
        <li key={b.id}>
          <Link
            href={`/bahan/${b.id}`}
            className="hover:bg-muted/50 focus-visible:ring-ring flex items-center gap-3 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-2"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-medium">{b.nama}</h2>
                <BadgeStok status={b.status} />
                <BadgeNonaktif aktif={b.aktif} />
              </div>
              <p className="text-muted-foreground text-sm">{b.kategori}</p>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span>Stok {teksStok(b)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatHargaSatuan(b.hargaPerSatuan, b.satuanDasar)}
                </span>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DaftarTabel({ data }: { data: BarisBahan[] }) {
  return (
    <div className="hidden rounded-xl border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-right">Stok</TableHead>
            <TableHead className="text-right">Stok minimal</TableHead>
            <TableHead className="text-right">Harga</TableHead>
            <TableHead>Supplier utama</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Link href={`/bahan/${b.id}`} className="hover:underline">
                    {b.nama}
                  </Link>
                  <BadgeStok status={b.status} />
                  <BadgeNonaktif aktif={b.aktif} />
                </div>
              </TableCell>
              <TableCell>{b.kategori}</TableCell>
              <TableCell className="text-right">{teksStok(b)}</TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {formatTakaran(b.stokMinimal, b.satuanDasar)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatHargaSatuan(b.hargaPerSatuan, b.satuanDasar)}
              </TableCell>
              <TableCell className="text-muted-foreground">{b.supplierNama ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

async function IsiBahan({ searchParams }: Pick<PageProps<'/bahan'>, 'searchParams'>) {
  const [, params] = await Promise.all([requirePeran(...peranUntuk('/bahan')), searchParams]);
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const kategori = typeof params.kategori === 'string' ? params.kategori : '';
  const stok = bacaFilterStok(params.stok);
  const status = bacaStatus(params.status);

  const [data, daftarKategori] = await Promise.all([
    daftarBahan({
      q,
      kategori: kategori || undefined,
      status: stok,
      aktif: aktifDariStatus(status),
    }),
    kategoriBahan(),
  ]);
  const tanpaFilter = q === '' && kategori === '' && stok === 'semua' && status === 'aktif';

  return (
    <>
      <PageHeader
        judul="Bahan"
        deskripsi="Stok dan harga bahan baku."
        aksi={data.length > 0 || !tanpaFilter ? tombolTambah() : null}
      />
      {daftarKategori.length > 0 ? (
        <FilterBahan
          q={q}
          kategori={kategori}
          stok={stok}
          status={status}
          daftarKategori={daftarKategori}
        />
      ) : null}
      {data.length === 0 ? (
        tanpaFilter ? (
          <EmptyState
            ikon={Wheat}
            judul="Belum ada bahan"
            deskripsi="Tambahkan bahan baku seperti tepung, gula, dan telur beserta harganya."
            aksi={tombolTambah()}
          />
        ) : (
          <EmptyState
            ikon={SearchX}
            judul="Bahan tidak ditemukan"
            deskripsi="Coba kata kunci lain atau ubah filter."
          />
        )
      ) : (
        <>
          <DaftarKartu data={data} />
          <DaftarTabel data={data} />
        </>
      )}
    </>
  );
}

export default function HalamanBahan({ searchParams }: PageProps<'/bahan'>) {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<LoadingSkeleton />}>
        <IsiBahan searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
