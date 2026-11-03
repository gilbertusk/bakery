# Bukti TDD — Step 0.3b Transaksi dan RLS

## Sumber

Journey dan acceptance criteria berasal dari `docs/prompts/00-fase-0-fondasi.md` bagian 0.3b dan
`docs/ERD.md` bagian stok, penjualan, pre-order, kas, invarian, dan keamanan.

## Journey

Sebagai developer, saya ingin PostgreSQL menolak transaksi yang melanggar invarian dan menutup
akses langsung dari peran browser, agar stok, kas, serta laporan tetap konsisten dan aman.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `pnpm typecheck` | Gagal karena 16 tabel transaksi belum tersedia; commit `e9a3a1d` |
| GREEN | `pnpm test:int` | 32 integration test lulus, termasuk seluruh CHECK dan audit RLS |
| Migrasi | `pnpm db:generate` | Migrasi schema dibuat; pemanggilan ulang melaporkan tidak ada perubahan |
| Validasi migrasi | `pnpm exec drizzle-kit check` | `Everything's fine` |
| Regresi | `pnpm test:all` | 6 unit, 32 integrasi, dan 2 E2E lulus |

## Jaminan test

- Nilai pembelian, produksi, dan mutasi stok yang tidak valid ditolak oleh CHECK database.
- Total, diskon, pembatalan, dan item penjualan dijaga oleh CHECK database.
- PO, pembayaran, invoice, dan kas yang tidak valid ditolak.
- Alur pembelian, penjualan, PO, invoice, dan kas yang valid dapat disimpan.
- Daftar tabel public harus persis 28 tabel sesuai ERD.
- Test menyebut tabel mana yang belum mengaktifkan RLS dan gagal otomatis bila tabel baru lupa
  ditambahkan ke migrasi RLS.

## Migrasi dan batasan

Migrasi lokal berhasil pada PostgreSQL 17. Migrasi ke Supabase dev sengaja dilewati karena
`.env.local` belum berisi kredensial Supabase; file lokal saat ini hanya menunjuk database test.
Tidak ada secret yang dicatat di repository.
