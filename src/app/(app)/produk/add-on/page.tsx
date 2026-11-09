import { ArrowLeft, Info, Plus, Puzzle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

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
import { AksiAddOn } from '@/features/add-on/components/aksi-add-on';
import { FormAddOn } from '@/features/add-on/components/form-add-on';
import { teksBahanAddOn, teksMargin } from '@/features/add-on/format';
import {
  type BarisAddOn,
  type PilihanBahanAddOn,
  daftarAddOnPemilik,
  pilihanBahanAddOn,
  targetMarginToko,
} from '@/features/add-on/queries';
import { requirePeran } from '@/lib/auth';
import { formatRupiah, formatRupiahDesimal } from '@/lib/format';

export const metadata: Metadata = { title: 'Add-on' };

function tombolTambah(bahan: PilihanBahanAddOn[], targetMargin: string) {
  return (
    <FormAddOn
      bahan={bahan}
      targetMargin={targetMargin}
      pemicu={
        <Button className="h-11">
          <Plus /> Tambah add-on
        </Button>
      }
    />
  );
}

function Status({ addOn }: { addOn: BarisAddOn }) {
  return (
    <div className="flex flex-wrap gap-2">
      {addOn.diBawahTarget ? (
        <Badge variant="destructive" className="bg-destructive/10 text-destructive">
          Di bawah target
        </Badge>
      ) : (
        <Badge variant="secondary">Margin aman</Badge>
      )}
      {addOn.aktif ? null : <Badge variant="outline">Nonaktif</Badge>}
    </div>
  );
}

function Bantuan() {
  return (
    <aside className="bg-muted/50 flex gap-3 rounded-xl border p-4 text-sm">
      <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="text-muted-foreground">
        Add-on hanya dihitung jika pembeli memintanya. Untuk topping yang selalu ada, pakai komponen
        produk.
      </p>
    </aside>
  );
}

type DaftarProps = {
  data: BarisAddOn[];
  bahan: PilihanBahanAddOn[];
  targetMargin: string;
};

function DaftarKartu({ data, bahan, targetMargin }: DaftarProps) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {data.map((addOn) => (
        <li key={addOn.id} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-medium">{addOn.nama}</h2>
              <p className="text-muted-foreground text-sm">{teksBahanAddOn(addOn)}</p>
            </div>
            <Status addOn={addOn} />
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Harga</dt>
            <dd className="text-right font-medium tabular-nums">{formatRupiah(addOn.harga)}</dd>
            <dt className="text-muted-foreground">HPP</dt>
            <dd className="text-right font-medium tabular-nums">
              {formatRupiahDesimal(addOn.hpp)}
            </dd>
            <dt className="text-muted-foreground">Margin</dt>
            <dd className="text-right font-medium tabular-nums">
              {teksMargin(addOn.marginRp, addOn.marginPersen)}
            </dd>
          </dl>
          <AksiAddOn addOn={addOn} bahan={bahan} targetMargin={targetMargin} />
        </li>
      ))}
    </ul>
  );
}

function DaftarTabel({ data, bahan, targetMargin }: DaftarProps) {
  return (
    <div className="hidden rounded-xl border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Bahan &amp; takaran</TableHead>
            <TableHead className="text-right">Harga</TableHead>
            <TableHead className="text-right">HPP</TableHead>
            <TableHead className="text-right">Margin</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((addOn) => (
            <TableRow key={addOn.id}>
              <TableCell className="font-medium">{addOn.nama}</TableCell>
              <TableCell>{teksBahanAddOn(addOn)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRupiah(addOn.harga)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRupiahDesimal(addOn.hpp)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {teksMargin(addOn.marginRp, addOn.marginPersen)}
              </TableCell>
              <TableCell>
                <Status addOn={addOn} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <AksiAddOn addOn={addOn} bahan={bahan} targetMargin={targetMargin} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

async function IsiAddOn() {
  await requirePeran(...peranUntuk('/produk'));
  const data = await daftarAddOnPemilik();
  const [bahan, targetMargin] = await Promise.all([pilihanBahanAddOn(data), targetMarginToko()]);

  return (
    <>
      <PageHeader
        judul="Add-on"
        deskripsi="Tambahan pilihan pembeli yang berlaku untuk semua produk."
        aksi={data.length > 0 ? tombolTambah(bahan, targetMargin) : null}
      />
      <Bantuan />
      {data.length === 0 ? (
        <EmptyState
          ikon={Puzzle}
          judul="Belum ada add-on"
          deskripsi="Tambahkan pilihan seperti Extra keju agar HPP dan marginnya langsung terlihat."
          aksi={tombolTambah(bahan, targetMargin)}
        />
      ) : (
        <>
          <DaftarKartu data={data} bahan={bahan} targetMargin={targetMargin} />
          <DaftarTabel data={data} bahan={bahan} targetMargin={targetMargin} />
        </>
      )}
    </>
  );
}

export default function HalamanAddOn() {
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
        <IsiAddOn />
      </Suspense>
    </div>
  );
}
