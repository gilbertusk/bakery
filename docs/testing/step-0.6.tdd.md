# Bukti TDD — Step 0.6 Layout Aplikasi dan Navigasi per Peran

## Sumber

Acceptance criteria berasal dari `docs/prompts/00-fase-0-fondasi.md` bagian 0.6, `docs/PRD.md` §8
(hak akses) dan §9 (perangkat), serta `docs/PLAN.md` §3.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `pnpm typecheck` | Gagal karena `./navigasi` dan `./rupiah-text` belum ada; commit `c0dba7d` |
| GREEN | `pnpm test` | 31 unit test lulus: `menuUntuk` (kasir tanpa Bahan/Supplier/Resep/Produk/Stok/Keuangan/Laporan/Pengaturan), bottom nav, menu Lainnya, `peranUntuk`, `isMenuAktif` (`/produksi` tidak mengaktifkan `/produk`), `formatRupiahSementara` |
| Regresi | `pnpm test:e2e` | 6 test lulus (redirect login, toggle password) |
| Cek | `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` | Lulus; 14 halaman menu ter-build sebagai Partial Prerender |

## Catatan implementasi

- `src/config/navigasi.ts` menjadi satu sumber kebenaran menu. Halaman placeholder memanggil
  `requirePeran(...peranUntuk(href))`, sehingga hak akses halaman dan menu tidak bisa berbeda.
- Server hanya mengirim nama toko, nama, dan peran ke `AppShell`. Ikon lucide tidak bisa
  diserialisasi, jadi client memfilter `MENU` dengan peran yang sama.
- Kasir yang membuka URL khusus pemilik diarahkan ke `/dashboard?pesan=tidak-berwenang` dan melihat
  pesan penolakan.
- Status sidebar ciut disimpan di `localStorage` lewat `useSyncExternalStore` (aman untuk SSR).
- Kontras tema dihitung dari nilai OKLCH: teks utama 15,9:1, tombol utama 8:1, teks redup 5,8–6,3:1,
  teks merah 5,6:1 (semua ≥ 4,5:1, WCAG AA). Mode gelap juga ≥ 6:1.
- E2E navigasi per peran dilewati sesuai prompt (dikerjakan di 4.1).

## Batasan

Tampilan setelah login di 360 px dan 1280 px, serta penolakan kasir untuk `/laporan`, belum dicoba di
browser karena `.env.local` belum memiliki kredensial Supabase.
