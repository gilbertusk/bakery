import { ArrowLeft, Info, Plus, Receipt } from 'lucide-react';
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
import { AksiBiayaTambahan } from '@/features/biaya-tambahan/components/aksi-biaya-tambahan';
import { FormBiayaTambahan } from '@/features/biaya-tambahan/components/form-biaya-tambahan';
import { LABEL_METODE, formatNilaiBiaya } from '@/features/biaya-tambahan/format';
import {
  type BarisBiayaTambahan,
  daftarBiayaTambahan,
  pilihanProdukBiaya,
} from '@/features/biaya-tambahan/queries';
import { requirePeran } from '@/lib/auth';

export const metadata: Metadata = { title: 'Biaya tambahan' };

type Produk = { id: string; nama: string }[];

function tombolTambah(produk: Produk) {
  return (
    <FormBiayaTambahan
      produk={produk}
      pemicu={
        <Button className="h-11">
          <Plus />
          Tambah biaya
        </Button>
      }
    />
  );
}

function BerlakuUntuk({ biaya }: { biaya: BarisBiayaTambahan }) {
  return <>{biaya.produkId ? (biaya.namaProduk ?? 'Produk dihapus') : 'Semua produk'}</>;
}

function StatusBadge({ aktif }: { aktif: boolean }) {
  return aktif ? null : <Badge variant="secondary">Nonaktif</Badge>;
}

function BantuanK2() {
  return (
    <aside className="bg-muted/50 flex gap-3 rounded-xl border p-4 text-sm">
      <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Boleh dikosongkan</p>
        <p className="text-muted-foreground">
          Jika biaya gas, listrik, atau tenaga sudah dicatat sebagai biaya operasional bulanan di
          modul Keuangan, tidak perlu diisi di sini. Jangan dicatat dua kali agar laba tidak
          terhitung lebih kecil.
        </p>
      </div>
    </aside>
  );
}

function DaftarKartu({ data, produk }: { data: BarisBiayaTambahan[]; produk: Produk }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {data.map((b) => (
        <li key={b.id} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">{b.nama}</h2>
              <StatusBadge aktif={b.aktif} />
            </div>
            <p className="text-lg font-semibold tabular-nums">
              {formatNilaiBiaya(b.metode, b.nilai)}
            </p>
            <p className="text-muted-foreground text-sm">
              {LABEL_METODE[b.metode]} · <BerlakuUntuk biaya={b} />
            </p>
          </div>
          <AksiBiayaTambahan biaya={b} produk={produk} />
        </li>
      ))}
    </ul>
  );
}

function DaftarTabel({ data, produk }: { data: BarisBiayaTambahan[]; produk: Produk }) {
  return (
    <div className="hidden rounded-xl border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Metode</TableHead>
            <TableHead className="text-right">Nilai</TableHead>
            <TableHead>Berlaku untuk</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {b.nama}
                  <StatusBadge aktif={b.aktif} />
                </div>
              </TableCell>
              <TableCell>{LABEL_METODE[b.metode]}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNilaiBiaya(b.metode, b.nilai)}
              </TableCell>
              <TableCell>
                <BerlakuUntuk biaya={b} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <AksiBiayaTambahan biaya={b} produk={produk} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

async function IsiBiayaTambahan() {
  await requirePeran(...peranUntuk('/produk'));
  const [data, produk] = await Promise.all([daftarBiayaTambahan(), pilihanProdukBiaya()]);

  return (
    <>
      <PageHeader
        judul="Biaya tambahan"
        deskripsi="Overhead yang ikut dihitung dalam HPP per pcs."
        aksi={data.length > 0 ? tombolTambah(produk) : null}
      />
      <BantuanK2 />
      {data.length === 0 ? (
        <EmptyState
          ikon={Receipt}
          judul="Belum ada biaya tambahan"
          deskripsi="HPP saat ini hanya dari biaya bahan. Tambahkan gas, listrik, atau tenaga jika ingin ikut dihitung per pcs."
          aksi={tombolTambah(produk)}
        />
      ) : (
        <>
          <DaftarKartu data={data} produk={produk} />
          <DaftarTabel data={data} produk={produk} />
        </>
      )}
    </>
  );
}

export default function HalamanBiayaTambahan() {
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
        <IsiBiayaTambahan />
      </Suspense>
    </div>
  );
}
