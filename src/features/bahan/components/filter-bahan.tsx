'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StatusFilter } from '@/lib/filter';

import type { FilterStok } from '../status-stok';

const LABEL_STATUS: Record<StatusFilter, string> = {
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  semua: 'Semua status',
};

type Props = {
  q: string;
  kategori: string;
  stok: FilterStok;
  status: StatusFilter;
  daftarKategori: string[];
};

export function FilterBahan({ q, kategori, stok, status, daftarKategori }: Props) {
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
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          className="h-11 pl-9"
          placeholder="Cari nama bahan"
          aria-label="Cari bahan"
          value={kata}
          onChange={(e) => setKata(e.target.value)}
        />
      </div>

      {daftarKategori.length > 0 ? (
        <div
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
          role="group"
          aria-label="Filter kategori"
        >
          {['', ...daftarKategori].map((k) => {
            const aktif = k === kategori;
            return (
              <Button
                key={k || 'semua'}
                type="button"
                size="sm"
                variant={aktif ? 'default' : 'outline'}
                className="h-9 shrink-0 rounded-full"
                aria-pressed={aktif}
                onClick={() => terapkan({ kategori: k })}
              >
                {k || 'Semua kategori'}
              </Button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={stok}
          onValueChange={(nilai) => terapkan({ stok: nilai === 'semua' ? '' : String(nilai) })}
        >
          <TabsList>
            <TabsTrigger value="semua">Semua stok</TabsTrigger>
            <TabsTrigger value="menipis">Menipis</TabsTrigger>
            <TabsTrigger value="minus">Minus</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select
          items={LABEL_STATUS}
          value={status}
          onValueChange={(nilai) => terapkan({ status: nilai && nilai !== 'aktif' ? nilai : '' })}
        >
          <SelectTrigger className="h-9! w-36" aria-label="Filter status aktif">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LABEL_STATUS) as StatusFilter[]).map((s) => (
              <SelectItem key={s} value={s}>
                {LABEL_STATUS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
