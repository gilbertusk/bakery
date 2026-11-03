import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type EmptyStateProps = {
  ikon: LucideIcon;
  judul: string;
  deskripsi?: ReactNode;
  aksi?: ReactNode;
  className?: string;
};

export function EmptyState({ ikon: Ikon, judul, deskripsi, aksi, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <div className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-full">
        <Ikon className="size-6" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium">{judul}</h2>
        {deskripsi ? <p className="text-muted-foreground max-w-sm text-sm">{deskripsi}</p> : null}
      </div>
      {aksi ? <div className="mt-2">{aksi}</div> : null}
    </div>
  );
}
