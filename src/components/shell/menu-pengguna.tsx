'use client';

import { CircleUser, LoaderCircle, LogOut } from 'lucide-react';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Peran } from '@/db/schema/enums';
import { keluar } from '@/lib/auth/aksi';

const LABEL_PERAN: Record<Peran, string> = { pemilik: 'Pemilik', kasir: 'Kasir' };

export function MenuPengguna({ nama, peran }: { nama: string; peran: Peran }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-11 max-w-48 gap-2 px-2" aria-label="Menu pengguna" />
        }
      >
        <CircleUser className="size-5" />
        <span className="hidden truncate text-sm sm:inline">{nama}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            <span className="text-foreground truncate text-sm font-medium">{nama}</span>
            <span>{LABEL_PERAN[peran]}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="h-11"
          disabled={pending}
          onClick={() => startTransition(() => keluar())}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
