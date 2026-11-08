import { ArrowLeft, ArrowRight, History, PackageSearch } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { peranUntuk } from '@/config/navigasi';
import { TombolAktifBahan } from '@/features/bahan/components/aksi-bahan';
import { BadgeNonaktif, BadgeStok } from '@/features/bahan/components/badge-stok';
import { DialogUbahHarga } from '@/features/bahan/components/dialog-ubah-harga';
import { FormBahan, type PilihanSupplier } from '@/features/bahan/components/form-bahan';
import { TabKonversi } from '@/features/bahan/components/tab-konversi';
import {
  type BarisRiwayatHarga,
  type DetailBahan,
  daftarKonversiBahan,
  detailBahan,
  riwayatHargaBahan,
} from '@/features/bahan/queries';
import { saranKonversiUntuk } from '@/features/bahan/saran-konversi';
import { pilihanSupplier } from '@/features/supplier/queries';
import { requirePeran } from '@/lib/auth';
import { formatHargaSatuan, formatTakaran, formatWaktu } from '@/lib/format';

export const metadata: Metadata = { title: 'Detail bahan' };

const LABEL_SUMBER: Record<BarisRiwayatHarga['sumber'], string> = {
  pembelian: 'Pembelian',
  manual: 'Manual',
};

/** Supplier yang sudah terpasang tetap muncul walau sudah nonaktif. */
function supplierUntukForm(aktif: PilihanSupplier[], bahan: DetailBahan): PilihanSupplier[] {
  const id = bahan.supplierUtamaId;
  if (!id || aktif.some((s) => s.id === id)) return aktif;
  return [...aktif, { id, nama: `${bahan.supplierNama ?? 'Supplier'} (nonaktif)` }];
}

function RingkasanHarga({ bahan }: { bahan: DetailBahan }) {
  return (
    <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">Stok</p>
        <p className="flex flex-wrap items-center gap-2 text-lg font-semibold tabular-nums">
          {formatTakaran(bahan.stok, bahan.satuanDasar)}
          <BadgeStok status={bahan.status} />
        </p>
        <p className="text-muted-foreground text-sm tabular-nums">
          Minimal {formatTakaran(bahan.stokMinimal, bahan.satuanDasar)}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">Harga per {bahan.satuanDasar}</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatHargaSatuan(bahan.hargaPerSatuan, bahan.satuanDasar)}
        </p>
        <div className="pt-1">
          <DialogUbahHarga
            bahan={{ id: bahan.id, nama: bahan.nama, satuanDasar: bahan.satuanDasar }}
          />
        </div>
      </div>
    </section>
  );
}

function DaftarRiwayat({ data, satuan }: { data: BarisRiwayatHarga[]; satuan: string }) {
  if (data.length === 0) {
    return (
      <EmptyState
        ikon={History}
        judul="Belum ada riwayat harga"
        deskripsi="Perubahan harga dari pembelian atau koreksi manual akan tercatat di sini."
      />
    );
  }
  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {data.map((r) => (
        <li key={r.id} className="flex flex-col gap-1 p-4">
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="text-muted-foreground">{formatHargaSatuan(r.hargaLama, satuan)}</span>
            <ArrowRight className="text-muted-foreground size-4" aria-label="menjadi" />
            <span className="font-medium">{formatHargaSatuan(r.hargaBaru, satuan)}</span>
            <Badge variant="outline">{LABEL_SUMBER[r.sumber]}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {formatWaktu(r.berlakuSejak)} · {r.oleh}
          </p>
        </li>
      ))}
    </ul>
  );
}

async function IsiDetail({ params }: Pick<PageProps<'/bahan/[id]'>, 'params'>) {
  const [, { id }] = await Promise.all([requirePeran(...peranUntuk('/bahan')), params]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [bahan, riwayat, suppliers, konversi] = await Promise.all([
    detailBahan(id),
    riwayatHargaBahan(id),
    pilihanSupplier(),
    daftarKonversiBahan(id),
  ]);
  if (!bahan) notFound();

  return (
    <>
      <PageHeader
        judul={bahan.nama}
        deskripsi={
          <span className="flex flex-wrap items-center gap-2">
            {bahan.kategori}
            <BadgeNonaktif aktif={bahan.aktif} />
          </span>
        }
      />
      <Tabs defaultValue="info">
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <TabsList className="h-10!">
            <TabsTrigger value="info" className="px-3">
              Info
            </TabsTrigger>
            <TabsTrigger value="konversi" className="px-3">
              Konversi
            </TabsTrigger>
            <TabsTrigger value="riwayat" className="px-3">
              Riwayat Harga
            </TabsTrigger>
            <TabsTrigger value="kartu-stok" className="px-3">
              Kartu Stok
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="info" className="flex flex-col gap-4 pt-2">
          <RingkasanHarga bahan={bahan} />
          <section className="rounded-xl border p-4 sm:p-6">
            <FormBahan
              key={`${bahan.id}-${bahan.satuanDasar}-${bahan.terkunci}`}
              suppliers={supplierUntukForm(suppliers, bahan)}
              bahan={{
                id: bahan.id,
                nama: bahan.nama,
                kategori: bahan.kategori,
                satuanDasar: bahan.satuanDasar,
                stokMinimal: bahan.stokMinimal,
                supplierUtamaId: bahan.supplierUtamaId,
                terkunci: bahan.terkunci,
              }}
            />
          </section>
          <div className="flex justify-end">
            <TombolAktifBahan bahan={{ id: bahan.id, nama: bahan.nama, aktif: bahan.aktif }} />
          </div>
        </TabsContent>

        <TabsContent value="konversi" className="pt-2">
          <TabKonversi
            bahan={{ id: bahan.id, satuanDasar: bahan.satuanDasar }}
            konversi={konversi}
            saran={saranKonversiUntuk(bahan)}
          />
        </TabsContent>

        <TabsContent value="riwayat" className="pt-2">
          <DaftarRiwayat data={riwayat} satuan={bahan.satuanDasar} />
        </TabsContent>

        <TabsContent value="kartu-stok" className="pt-2">
          <EmptyState
            ikon={PackageSearch}
            judul="Kartu stok segera hadir"
            deskripsi="Riwayat keluar-masuk stok bahan akan tampil di sini."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function HalamanDetailBahan({ params }: PageProps<'/bahan/[id]'>) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Button
        variant="ghost"
        className="h-10 w-fit"
        nativeButton={false}
        render={<Link href="/bahan" />}
      >
        <ArrowLeft />
        Daftar bahan
      </Button>
      <Suspense fallback={<LoadingSkeleton />}>
        <IsiDetail params={params} />
      </Suspense>
    </div>
  );
}
