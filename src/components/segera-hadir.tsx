import 'server-only';

import { Construction } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { MENU, peranUntuk } from '@/config/navigasi';
import { requirePeran } from '@/lib/auth';

/** Halaman placeholder; hak akses diambil dari config navigasi. */
export async function HalamanSegeraHadir({ href }: { href: string }) {
  await requirePeran(...peranUntuk(href));
  const judul = MENU.find((item) => item.href === href)?.label ?? href;

  return (
    <>
      <PageHeader judul={judul} />
      <EmptyState
        ikon={Construction}
        judul="Segera hadir"
        deskripsi="Fitur ini sedang dibangun dan akan tersedia di tahap berikutnya."
      />
    </>
  );
}
