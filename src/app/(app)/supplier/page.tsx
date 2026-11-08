import { Plus, SearchX, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { EmptyState } from '@/components/empty-state';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { peranUntuk } from '@/config/navigasi';
import { AksiSupplier } from '@/features/supplier/components/aksi-supplier';
import { FilterSupplier } from '@/features/supplier/components/filter-supplier';
import { FormSupplier } from '@/features/supplier/components/form-supplier';
import { type BarisSupplier, daftarSupplier } from '@/features/supplier/queries';
import { requirePeran } from '@/lib/auth';
import { aktifDariStatus, bacaStatus } from '@/lib/filter';

export const metadata: Metadata = { title: 'Supplier' };

function tombolTambah(label = 'Tambah supplier') {
  return (
    <FormSupplier
      pemicu={
        <Button className="h-11">
          <Plus />
          {label}
        </Button>
      }
    />
  );
}

function StatusBadge({ aktif }: { aktif: boolean }) {
  return aktif ? null : <Badge variant="secondary">Nonaktif</Badge>;
}

function JumlahBahan({ jumlah }: { jumlah: number }) {
  return <>{jumlah === 0 ? 'Belum ada bahan' : `${jumlah} bahan`}</>;
}

function DaftarKartu({ data }: { data: BarisSupplier[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {data.map((s) => (
        <li key={s.id} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">{s.nama}</h2>
              <StatusBadge aktif={s.aktif} />
            </div>
            {s.kontak ? <p className="text-sm break-all">{s.kontak}</p> : null}
            <p className="text-muted-foreground text-sm">
              <JumlahBahan jumlah={s.jumlahBahan} />
            </p>
            {s.catatan ? (
              <p className="text-muted-foreground text-sm whitespace-pre-line">{s.catatan}</p>
            ) : null}
          </div>
          <AksiSupplier supplier={s} />
        </li>
      ))}
    </ul>
  );
}

function DaftarTabel({ data }: { data: BarisSupplier[] }) {
  return (
    <div className="hidden rounded-xl border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Kontak</TableHead>
            <TableHead>Bahan utama</TableHead>
            <TableHead>Catatan</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {s.nama}
                  <StatusBadge aktif={s.aktif} />
                </div>
              </TableCell>
              <TableCell>{s.kontak ?? '—'}</TableCell>
              <TableCell>
                <JumlahBahan jumlah={s.jumlahBahan} />
              </TableCell>
              <TableCell className="text-muted-foreground max-w-64 truncate">
                {s.catatan ?? '—'}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <AksiSupplier supplier={s} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

async function IsiSupplier({ searchParams }: Pick<PageProps<'/supplier'>, 'searchParams'>) {
  const [, params] = await Promise.all([requirePeran(...peranUntuk('/supplier')), searchParams]);
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const status = bacaStatus(params.status);
  const data = await daftarSupplier({ q, aktif: aktifDariStatus(status) });
  const tanpaFilter = q === '' && status === 'aktif';

  return (
    <>
      <PageHeader
        judul="Supplier"
        deskripsi="Daftar tempat membeli bahan."
        aksi={data.length > 0 || !tanpaFilter ? tombolTambah() : null}
      />
      <FilterSupplier q={q} status={status} />
      {data.length === 0 ? (
        tanpaFilter ? (
          <EmptyState
            ikon={Truck}
            judul="Belum ada supplier"
            deskripsi="Tambahkan tempat Anda biasa membeli bahan agar mudah dipilih di form bahan."
            aksi={tombolTambah()}
          />
        ) : (
          <EmptyState
            ikon={SearchX}
            judul="Supplier tidak ditemukan"
            deskripsi="Coba kata kunci lain atau ubah filter status."
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

export default function HalamanSupplier({ searchParams }: PageProps<'/supplier'>) {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<LoadingSkeleton />}>
        <IsiSupplier searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
