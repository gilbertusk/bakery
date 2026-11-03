'use client';

import type { ReactNode } from 'react';
import { useCallback, useSyncExternalStore } from 'react';

import type { Peran } from '@/db/schema/enums';

import { BottomNav } from './bottom-nav';
import { MenuPengguna } from './menu-pengguna';
import { Sidebar } from './sidebar';

const KUNCI_CIUT = 'tokokue:sidebar-ciut';
const EVENT_CIUT = 'tokokue:sidebar-ciut';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT_CIUT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT_CIUT, callback);
  };
}

function useSidebarCiut() {
  const ciut = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(KUNCI_CIUT) === '1',
    () => false,
  );
  const toggle = useCallback(() => {
    window.localStorage.setItem(KUNCI_CIUT, ciut ? '0' : '1');
    window.dispatchEvent(new Event(EVENT_CIUT));
  }, [ciut]);
  return [ciut, toggle] as const;
}

type AppShellProps = {
  namaToko: string;
  pengguna: { nama: string; peran: Peran };
  children: ReactNode;
};

export function AppShell({ namaToko, pengguna, children }: AppShellProps) {
  const [ciut, toggleCiut] = useSidebarCiut();

  return (
    <div className="flex min-h-svh flex-1">
      <Sidebar peran={pengguna.peran} namaToko={namaToko} ciut={ciut} onToggle={toggleCiut} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
          <span className="truncate font-semibold lg:hidden">{namaToko}</span>
          <div className="ml-auto">
            <MenuPengguna nama={pengguna.nama} peran={pengguna.peran} />
          </div>
        </header>

        <main
          id="konten"
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-4 pb-28 lg:px-6 lg:pt-6 lg:pb-8"
        >
          {children}
        </main>
      </div>

      <BottomNav peran={pengguna.peran} />
    </div>
  );
}
