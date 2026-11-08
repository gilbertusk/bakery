'use client';

import { Ellipsis } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { isMenuAktif, menuBottomNav, menuLainnya } from '@/config/navigasi';
import type { Peran } from '@/db/schema/enums';
import { cn } from '@/lib/utils';

import { LencanaJumlah, type LencanaMenu } from './lencana-menu';

const kelasItem =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.7rem] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function BottomNav({ peran, lencana }: { peran: Peran; lencana: LencanaMenu }) {
  const pathname = usePathname();
  const [bukaLainnya, setBukaLainnya] = useState(false);
  const utama = menuBottomNav(peran);
  const lainnya = menuLainnya(peran);
  const lainnyaAktif = lainnya.some((item) => isMenuAktif(pathname, item.href));
  const lencanaLainnya = lainnya.reduce((total, item) => total + (lencana[item.href] ?? 0), 0);

  return (
    <>
      <nav
        aria-label="Navigasi bawah"
        className="bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2 py-1">
          {utama.map(({ href, label, ikon: Ikon }) => {
            const aktif = isMenuAktif(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={aktif ? 'page' : undefined}
                className={cn(
                  kelasItem,
                  aktif ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    aktif && 'bg-secondary',
                  )}
                >
                  <Ikon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setBukaLainnya(true)}
            aria-haspopup="dialog"
            aria-expanded={bukaLainnya}
            className={cn(
              kelasItem,
              lainnyaAktif ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'relative flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                lainnyaAktif && 'bg-secondary',
              )}
            >
              <Ellipsis className="size-5" aria-hidden />
              <LencanaJumlah
                jumlah={lencanaLainnya}
                label="perlu perhatian"
                className="absolute -top-1 right-0"
              />
            </span>
            Lainnya
          </button>
        </div>
      </nav>

      <Sheet open={bukaLainnya} onOpenChange={setBukaLainnya}>
        <SheetContent
          side="bottom"
          className="max-h-[80svh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader>
            <SheetTitle>Menu lainnya</SheetTitle>
            <SheetDescription className="sr-only">Daftar menu sesuai peran Anda</SheetDescription>
          </SheetHeader>
          <nav
            aria-label="Menu lainnya"
            className="grid grid-cols-3 gap-2 overflow-y-auto px-4 pb-6"
          >
            {lainnya.map(({ href, label, ikon: Ikon }) => {
              const aktif = isMenuAktif(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setBukaLainnya(false)}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'focus-visible:ring-ring relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center text-xs font-medium transition-colors outline-none focus-visible:ring-2',
                    aktif
                      ? 'border-primary bg-secondary text-secondary-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  <Ikon className="size-6" aria-hidden />
                  {label}
                  <LencanaJumlah
                    jumlah={lencana[href]}
                    label="perlu perhatian"
                    className="absolute top-1.5 right-1.5"
                  />
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
