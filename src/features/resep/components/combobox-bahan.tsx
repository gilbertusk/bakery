'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { PilihanBahanResep } from '@/features/resep/queries';
import { cn } from '@/lib/utils';

export type BahanFormResep = PilihanBahanResep & { aktif: boolean };

export function ComboboxBahan({
  bahan,
  value,
  onChange,
  disabled,
  invalid,
}: {
  bahan: BahanFormResep[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const terpilih = bahan.find((item) => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            className="h-11 w-full justify-between px-3 font-normal"
            disabled={disabled}
          />
        }
      >
        <span className={cn('truncate', !terpilih && 'text-muted-foreground')}>
          {terpilih?.nama ?? 'Pilih bahan'}
        </span>
        <ChevronsUpDown className="text-muted-foreground ml-2 size-4 shrink-0" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder="Cari bahan…" />
          <CommandList>
            <CommandEmpty>Bahan tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {bahan.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.nama} ${item.id}`}
                  onSelect={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('size-4', item.id === value ? 'opacity-100' : 'opacity-0')}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{item.nama}</span>
                  <span className="text-muted-foreground">{item.satuanDasar}</span>
                  {item.aktif ? null : <Badge variant="secondary">Nonaktif</Badge>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
