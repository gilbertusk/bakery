'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { type StatusFilter } from '../filter';

export function FilterSupplier({ q, status }: { q: string; status: StatusFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [kata, setKata] = useState(q);
  const [, startTransition] = useTransition();

  function terapkan(perubahan: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [kunci, nilai] of Object.entries(perubahan)) {
      if (nilai) params.set(kunci, nilai);
      else params.delete(kunci);
    }
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  useEffect(() => {
    if (kata.trim() === q) return;
    const timer = setTimeout(() => terapkan({ q: kata.trim() }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya bereaksi pada ketikan
  }, [kata]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          className="h-11 pl-9"
          placeholder="Cari nama atau kontak"
          aria-label="Cari supplier"
          value={kata}
          onChange={(e) => setKata(e.target.value)}
        />
      </div>
      <Tabs value={status} onValueChange={(nilai) => terapkan({ status: String(nilai) })}>
        <TabsList>
          <TabsTrigger value="aktif">Aktif</TabsTrigger>
          <TabsTrigger value="nonaktif">Nonaktif</TabsTrigger>
          <TabsTrigger value="semua">Semua</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
