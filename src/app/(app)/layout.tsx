import { Suspense, type ReactNode } from 'react';

import { LoadingSkeleton } from '@/components/loading-skeleton';
import { AppShell } from '@/components/shell/app-shell';
import { Toaster } from '@/components/ui/sonner';
import { requirePengguna } from '@/lib/auth';
import { getIdentitasToko } from '@/lib/toko';

async function ShellDenganData({ children }: { children: ReactNode }) {
  const [pengguna, { namaToko }] = await Promise.all([requirePengguna(), getIdentitasToko()]);

  return (
    <AppShell namaToko={namaToko} pengguna={{ nama: pengguna.nama, peran: pengguna.peran }}>
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
