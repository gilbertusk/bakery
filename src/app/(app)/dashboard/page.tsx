import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { peranUntuk } from '@/config/navigasi';
import { requirePeran } from '@/lib/auth';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function HalamanDashboard({ searchParams }: PageProps<'/dashboard'>) {
  const [pengguna, { pesan }] = await Promise.all([
    requirePeran(...peranUntuk('/dashboard')),
    searchParams,
  ]);

  return (
    <>
      {pesan === 'tidak-berwenang' ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-3 rounded-lg border p-3 text-sm"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Anda tidak memiliki akses ke halaman tersebut.
        </div>
      ) : null}
      <PageHeader
        judul={`Halo, ${pengguna.nama} (${pengguna.peran})`}
        deskripsi="Ringkasan harian akan tampil di sini."
      />
    </>
  );
}
