import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';

import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { peranUntuk } from '@/config/navigasi';
import { type BahanFormResep } from '@/features/resep/components/combobox-bahan';
import { FormResep } from '@/features/resep/components/form-resep';
import { detailResep, pilihanBahan } from '@/features/resep/queries';
import { requirePeran } from '@/lib/auth';

export const metadata: Metadata = { title: 'Ubah resep' };

async function IsiUbahResep({ params }: Pick<PageProps<'/resep/[id]/ubah'>, 'params'>) {
  const [, { id }] = await Promise.all([requirePeran(...peranUntuk('/resep')), params]);
  if (!z.uuid().safeParse(id).success) notFound();
  const [resep, aktif] = await Promise.all([detailResep(id), pilihanBahan()]);
  if (!resep) notFound();

  const bahan: BahanFormResep[] = aktif.map((item) => ({ ...item, aktif: true }));
  const idTerdaftar = new Set(bahan.map((item) => item.id));
  for (const item of resep.items) {
    if (idTerdaftar.has(item.bahanId)) continue;
    bahan.push({
      id: item.bahanId,
      nama: item.namaBahan,
      satuanDasar: item.satuanDasar,
      hargaPerSatuan: item.hargaPerSatuan,
      konversi: item.konversi,
      aktif: item.bahanAktif,
    });
    idTerdaftar.add(item.bahanId);
  }

  return (
    <FormResep
      bahan={bahan}
      resep={{
        id: resep.id,
        nama: resep.nama,
        modeHasil: resep.modeHasil,
        hasilGram: resep.hasilGram,
        caraBuat: resep.caraBuat,
        bentukLoyang: resep.bentukLoyang,
        diameterCm: resep.diameterCm,
        panjangCm: resep.panjangCm,
        lebarCm: resep.lebarCm,
        items: resep.items.map((item) => ({
          bahanId: item.bahanId,
          takaran: item.takaran,
          konversiSatuanId: item.konversiSatuanId,
        })),
      }}
    />
  );
}

export default function HalamanUbahResep({ params }: PageProps<'/resep/[id]/ubah'>) {
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
      <PageHeader
        judul="Ubah resep"
        deskripsi="Perubahan biaya bahan langsung memakai harga terbaru."
      />
      <Suspense fallback={<LoadingSkeleton />}>
        <IsiUbahResep params={params} />
      </Suspense>
    </div>
  );
}
