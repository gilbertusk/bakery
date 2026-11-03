import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageHeaderProps = {
  judul: string;
  deskripsi?: ReactNode;
  aksi?: ReactNode;
  className?: string;
};

export function PageHeader({ judul, deskripsi, aksi, className }: PageHeaderProps) {
  return (
    <header
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{judul}</h1>
        {deskripsi ? <p className="text-muted-foreground text-sm">{deskripsi}</p> : null}
      </div>
      {aksi ? <div className="flex shrink-0 flex-wrap gap-2">{aksi}</div> : null}
    </header>
  );
}
