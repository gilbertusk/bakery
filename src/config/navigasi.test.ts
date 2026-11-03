import { describe, expect, it } from 'vitest';

import { MENU, isMenuAktif, menuBottomNav, menuLainnya, menuUntuk, peranUntuk } from './navigasi';

const label = (items: { label: string }[]) => items.map((item) => item.label);

describe('menuUntuk', () => {
  it('pemilik mendapat semua menu', () => {
    expect(label(menuUntuk('pemilik'))).toEqual(label(MENU));
    expect(MENU).toHaveLength(14);
  });

  it('kasir tidak mendapat menu khusus pemilik', () => {
    const menuKasir = label(menuUntuk('kasir'));

    for (const terlarang of [
      'Bahan',
      'Supplier',
      'Resep',
      'Produk',
      'Stok',
      'Keuangan',
      'Laporan',
      'Pengaturan',
    ]) {
      expect(menuKasir).not.toContain(terlarang);
    }
    expect(menuKasir).toEqual([
      'Dashboard',
      'Kasir',
      'Penjualan',
      'Pre-Order',
      'Produksi',
      'Pembelian',
    ]);
  });
});

describe('bottom navigation', () => {
  it('menampilkan Dashboard, Kasir, Pre-Order, Produksi untuk kedua peran', () => {
    expect(label(menuBottomNav('pemilik'))).toEqual([
      'Dashboard',
      'Kasir',
      'Pre-Order',
      'Produksi',
    ]);
    expect(label(menuBottomNav('kasir'))).toEqual(['Dashboard', 'Kasir', 'Pre-Order', 'Produksi']);
  });

  it('menu Lainnya berisi sisa menu sesuai peran', () => {
    expect(label(menuLainnya('kasir'))).toEqual(['Penjualan', 'Pembelian']);
    expect(label(menuLainnya('pemilik'))).toContain('Pengaturan');
    expect(label(menuLainnya('pemilik'))).not.toContain('Kasir');
  });
});

describe('peranUntuk', () => {
  it('mengembalikan peran yang boleh membuka halaman', () => {
    expect(peranUntuk('/laporan')).toEqual(['pemilik']);
    expect(peranUntuk('/kasir')).toEqual(['pemilik', 'kasir']);
  });

  it('melempar error untuk href yang tidak terdaftar', () => {
    expect(() => peranUntuk('/tidak-ada')).toThrow();
  });
});

describe('isMenuAktif', () => {
  it('cocok untuk path persis dan sub-path', () => {
    expect(isMenuAktif('/produk', '/produk')).toBe(true);
    expect(isMenuAktif('/produk/123', '/produk')).toBe(true);
  });

  it('tidak cocok untuk path dengan awalan mirip', () => {
    expect(isMenuAktif('/produksi', '/produk')).toBe(false);
    expect(isMenuAktif('/dashboard', '/kasir')).toBe(false);
  });
});
