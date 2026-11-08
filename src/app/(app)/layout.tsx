import { Suspense, type ReactNode } from 'react';

import { LoadingSkeleton } from '@/components/loading-skeleton';
import { AppShell } from '@/components/shell/app-shell';
import type { LencanaMenu } from '@/components/shell/lencana-menu';
import { Toaster } from '@/components/ui/sonner';
import type { Peran } from '@/db/schema/enums';
import { jumlahBahanPerluPerhatian } from '@/features/bahan/queries';
import { requirePengguna } from '@/lib/auth';
import { getIdentitasToko } from '@/lib/toko';

/** Angka badge menu. Data stok bahan hanya dihitung untuk pemilik. */
async function lencanaUntuk(peran: Peran): Promise<LencanaMenu> {
  if (peran !== 'pemilik') return {};
  return { '/bahan': await jumlahBahanPerluPerhatian() };
}

async function ShellDenganData({ children }: { children: ReactNode }) {
  const [pengguna, { namaToko }] = await Promise.all([requirePengguna(), getIdentitasToko()]);
  const lencana = await lencanaUntuk(pengguna.peran);

  return (
    <AppShell
      namaToko={namaToko}
      pengguna={{ nama: pengguna.nama, peran: pengguna.peran }}
      lencana={lencana}
    >
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-6xl p-4 lg:p-6">
            <LoadingSkeleton />
          </div>
        }
      >
        <ShellDenganData>{children}</ShellDenganData>
      </Suspense>
      <Toaster position="top-center" richColors closeButton />
    </>
  );
}
