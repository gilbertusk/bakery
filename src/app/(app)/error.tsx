'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function ErrorApp({ error, retry }: { error: unknown; retry: () => void }) {
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error
      ? String((error as { digest?: unknown }).digest ?? '')
      : '';

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Terjadi kesalahan</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Halaman ini gagal dimuat. Periksa koneksi internet, lalu coba lagi.
        </p>
        {digest ? <p className="text-muted-foreground text-xs">Kode: {digest}</p> : null}
      </div>
      <Button className="h-11" onClick={() => retry()}>
        <RotateCcw />
        Coba lagi
      </Button>
    </div>
  );
}
