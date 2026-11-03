import { LogOut } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { requirePengguna } from '@/lib/auth';
import { keluar } from '@/lib/auth/aksi';

export const metadata: Metadata = { title: 'Dashboard' };

async function Sapaan() {
  const pengguna = await requirePengguna();
  return (
    <h1 className="text-2xl font-semibold">
      Halo, {pengguna.nama} ({pengguna.peran})
    </h1>
  );
}

export default function HalamanDashboard() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
        <Sapaan />
      </Suspense>
      <form action={keluar}>
        <Button type="submit" variant="outline" className="h-11">
          <LogOut />
          Keluar
        </Button>
      </form>
    </main>
  );
}
