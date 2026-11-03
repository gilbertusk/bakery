import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-full">
        <FileQuestion className="size-6" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Halaman tidak ditemukan</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ className: 'h-11 px-4' })}>
        Kembali ke Dashboard
      </Link>
    </main>
  );
}
