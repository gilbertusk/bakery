import { ArrowLeft, Copy, Pencil, Scale } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';

import { EmptyState } from '@/components/empty-state';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
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
import { TombolAktifResep } from '@/features/resep/components/aksi-resep';
import { detailResep, type DetailResep } from '@/features/resep/queries';
import { requirePeran } from '@/lib/auth';
import { formatAngka, formatRupiah, formatRupiahDesimal } from '@/lib/format';

export const metadata: Metadata = { title: 'Detail resep' };

function satuanAsli(item: DetailResep['items'][number]) {
  return item.namaSatuan ?? item.satuanDasar;
}

function Ringkasan({ resep }: { resep: DetailResep }) {
  return (
    <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-3 sm:p-6">
      <div>
        <p className="text-muted-foreground text-sm">Hasil adonan</p>
        <p className="text-lg font-semibold tabular-nums">{formatAngka(resep.hasilGram)} g</p>
        <p className="text-muted-foreground text-xs">Mode {resep.modeHasil}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-sm">Biaya total</p>
        <p className="text-lg font-semibold tabular-nums">{formatRupiah(resep.biayaTotal)}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-sm">Biaya per gram</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatRupiahDesimal(resep.biayaPerGram)}/g
        </p>
      </div>
    </section>
  );
}

function BahanResep({ resep }: { resep: DetailResep }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Bahan</h2>
      <ul className="flex flex-col gap-3 md:hidden">
        {resep.items.map((item) => (
          <li key={item.id} className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{item.namaBahan}</h3>
              {item.bahanAktif ? null : <Badge variant="secondary">Nonaktif</Badge>}
            </div>
            <p className="mt-1 tabular-nums">
              {formatAngka(item.takaran)} {satuanAsli(item)}
            </p>
            <p className="text-muted-foreground text-sm tabular-nums">
              = {formatAngka(item.takaranDasar)} {item.satuanDasar} · {formatRupiah(item.biaya)}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bahan</TableHead>
              <TableHead className="text-right">Takaran</TableHead>
              <TableHead className="text-right">Takaran dasar</TableHead>
              <TableHead className="text-right">Biaya</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resep.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {item.namaBahan}
                    {item.bahanAktif ? null : <Badge variant="secondary">Nonaktif</Badge>}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAngka(item.takaran)} {satuanAsli(item)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAngka(item.takaranDasar)} {item.satuanDasar}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatRupiah(item.biaya)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

async function IsiDetailResep({ params }: Pick<PageProps<'/resep/[id]'>, 'params'>) {
  const [, { id }] = await Promise.all([requirePeran(...peranUntuk('/resep')), params]);
  if (!z.uuid().safeParse(id).success) notFound();
  const resep = await detailResep(id);
  if (!resep) notFound();

  return (
    <>
      <PageHeader
        judul={resep.nama}
        deskripsi={resep.aktif ? 'Resep aktif' : <Badge variant="secondary">Nonaktif</Badge>}
        aksi={
          <>
            <Button
              className="h-11"
              nativeButton={false}
              render={<Link href={`/resep/${id}/ubah`} />}
            >
              <Pencil /> Ubah
            </Button>
            <Button variant="outline" className="h-11" disabled>
              <Copy /> Duplikat
            </Button>
            <Button variant="outline" className="h-11" disabled>
              <Scale /> Skala
            </Button>
          </>
        }
      />
      <Ringkasan resep={resep} />
      <BahanResep resep={resep} />
      {resep.caraBuat ? (
        <section className="flex flex-col gap-2 rounded-xl border p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Cara membuat</h2>
          <p className="whitespace-pre-line">{resep.caraBuat}</p>
        </section>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Produk yang memakai</h2>
        {resep.produk.length === 0 ? (
          <EmptyState
            ikon={Scale}
            judul="Belum dipakai produk"
            deskripsi="Produk yang memakai resep ini akan tampil di sini."
          />
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {resep.produk.map((produk) => (
              <li key={produk.id} className="flex items-center gap-2 p-4">
                <span className="flex-1 font-medium">{produk.nama}</span>
                {produk.aktif ? null : <Badge variant="secondary">Nonaktif</Badge>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="flex justify-end">
        <TombolAktifResep resep={{ id: resep.id, nama: resep.nama, aktif: resep.aktif }} />
      </div>
    </>
  );
}

export default function HalamanDetailResep({ params }: PageProps<'/resep/[id]'>) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Button
        variant="ghost"
        className="h-10 w-fit"
        nativeButton={false}
        render={<Link href="/resep" />}
      >
        <ArrowLeft /> Daftar resep
      </Button>
      <Suspense fallback={<LoadingSkeleton />}>
        <IsiDetailResep params={params} />
      </Suspense>
    </div>
  );
}
