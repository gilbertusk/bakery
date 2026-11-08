'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { type GrupMenu, LABEL_GRUP, isMenuAktif, menuUntuk } from '@/config/navigasi';
import type { Peran } from '@/db/schema/enums';
import { cn } from '@/lib/utils';

import { LencanaJumlah, type LencanaMenu } from './lencana-menu';

type SidebarProps = {
  peran: Peran;
  namaToko: string;
  ciut: boolean;
  onToggle: () => void;
  lencana: LencanaMenu;
};

export function Sidebar({ peran, namaToko, ciut, onToggle, lencana }: SidebarProps) {
  const pathname = usePathname();
  const menu = menuUntuk(peran);
  const grup = [...new Set(menu.map((item) => item.grup))] as GrupMenu[];

  return (
    <aside
      data-ciut={ciut}
      className={cn(
        'bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-svh shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
        ciut ? 'w-17' : 'w-64',
      )}
    >
      <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-3">
        {ciut ? null : <span className="truncate px-1 font-semibold">{namaToko}</span>}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-11"
          onClick={onToggle}
          aria-label={ciut ? 'Lebarkan menu' : 'Ciutkan menu'}
          aria-expanded={!ciut}
        >
          {ciut ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>

      <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {grup.map((namaGrup) => (
          <div key={namaGrup} className="flex flex-col gap-1">
            {ciut ? null : (
              <p className="text-muted-foreground px-3 pb-1 text-xs font-medium">
                {LABEL_GRUP[namaGrup]}
              </p>
            )}
            {menu
              .filter((item) => item.grup === namaGrup)
              .map(({ href, label, ikon: Ikon }) => {
                const aktif = isMenuAktif(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={aktif ? 'page' : undefined}
                    title={ciut ? label : undefined}
                    className={cn(
                      'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      'focus-visible:ring-sidebar-ring outline-none focus-visible:ring-2',
                      aktif &&
                        'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
                      ciut && 'relative justify-center px-0',
                    )}
                  >
                    <Ikon className="size-5 shrink-0" aria-hidden />
                    <span className={cn(ciut && 'sr-only')}>{label}</span>
                    <LencanaJumlah
                      jumlah={lencana[href]}
                      label="perlu perhatian"
                      className={ciut ? 'absolute top-0.5 right-0.5' : 'ml-auto'}
                    />
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
