import {
  BookOpen,
  Boxes,
  Cake,
  ChartColumn,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Wallet,
  Wheat,
} from 'lucide-react';

import type { Peran } from '@/db/schema/enums';

export type GrupMenu = 'utama' | 'transaksi' | 'master' | 'keuangan' | 'sistem';

export type ItemMenu = {
  href: string;
  label: string;
  ikon: LucideIcon;
  peran: readonly Peran[];
  grup: GrupMenu;
  tampilDiBottomNav: boolean;
};

const SEMUA: readonly Peran[] = ['pemilik', 'kasir'];
const PEMILIK: readonly Peran[] = ['pemilik'];

export const LABEL_GRUP: Record<GrupMenu, string> = {
  utama: 'Utama',
  transaksi: 'Transaksi',
  master: 'Data Master',
  keuangan: 'Keuangan',
  sistem: 'Sistem',
};

export const MENU: ItemMenu[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    ikon: LayoutDashboard,
    peran: SEMUA,
    grup: 'utama',
    tampilDiBottomNav: true,
  },
  {
    href: '/kasir',
    label: 'Kasir',
    ikon: ShoppingCart,
    peran: SEMUA,
    grup: 'utama',
    tampilDiBottomNav: true,
  },
  {
    href: '/penjualan',
    label: 'Penjualan',
    ikon: Receipt,
    peran: SEMUA,
    grup: 'transaksi',
    tampilDiBottomNav: false,
  },
  {
    href: '/pre-order',
    label: 'Pre-Order',
    ikon: ClipboardList,
    peran: SEMUA,
    grup: 'transaksi',
    tampilDiBottomNav: true,
  },
  {
    href: '/produksi',
    label: 'Produksi',
    ikon: ChefHat,
    peran: SEMUA,
    grup: 'transaksi',
    tampilDiBottomNav: true,
  },
  {
    href: '/pembelian',
    label: 'Pembelian',
    ikon: ShoppingBag,
    peran: SEMUA,
    grup: 'transaksi',
    tampilDiBottomNav: false,
  },
  {
    href: '/bahan',
    label: 'Bahan',
    ikon: Wheat,
    peran: PEMILIK,
    grup: 'master',
    tampilDiBottomNav: false,
  },
  {
    href: '/supplier',
    label: 'Supplier',
    ikon: Truck,
    peran: PEMILIK,
    grup: 'master',
    tampilDiBottomNav: false,
  },
  {
    href: '/resep',
    label: 'Resep',
    ikon: BookOpen,
    peran: PEMILIK,
    grup: 'master',
    tampilDiBottomNav: false,
  },
  {
    href: '/produk',
    label: 'Produk',
    ikon: Cake,
    peran: PEMILIK,
    grup: 'master',
    tampilDiBottomNav: false,
  },
  {
    href: '/stok',
    label: 'Stok',
    ikon: Boxes,
    peran: PEMILIK,
    grup: 'master',
    tampilDiBottomNav: false,
  },
  {
    href: '/keuangan',
    label: 'Keuangan',
    ikon: Wallet,
    peran: PEMILIK,
    grup: 'keuangan',
    tampilDiBottomNav: false,
  },
  {
    href: '/laporan',
    label: 'Laporan',
    ikon: ChartColumn,
    peran: PEMILIK,
    grup: 'keuangan',
    tampilDiBottomNav: false,
  },
  {
    href: '/pengaturan',
    label: 'Pengaturan',
    ikon: Settings,
    peran: PEMILIK,
    grup: 'sistem',
    tampilDiBottomNav: false,
  },
];

export function menuUntuk(peran: Peran): ItemMenu[] {
  return MENU.filter((item) => item.peran.includes(peran));
}

export function menuBottomNav(peran: Peran): ItemMenu[] {
  return menuUntuk(peran).filter((item) => item.tampilDiBottomNav);
}

export function menuLainnya(peran: Peran): ItemMenu[] {
  return menuUntuk(peran).filter((item) => !item.tampilDiBottomNav);
}

export function peranUntuk(href: string): Peran[] {
  const item = MENU.find((menu) => menu.href === href);
  if (!item) throw new Error(`Menu ${href} tidak terdaftar di navigasi`);
  return [...item.peran];
}

export function isMenuAktif(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
