# Bukti TDD — Step 0.4 Seed Sistem dan Data Contoh

## Sumber

Acceptance criteria berasal dari `docs/prompts/00-fase-0-fondasi.md` bagian 0.4, `docs/ERD.md`
bagian kategori kas dan pengaturan toko, serta keputusan K3 di `docs/PRD.md`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `pnpm typecheck` | Gagal karena modul seed, konstanta kategori, dan saran konversi belum ada; commit `53c045e` |
| GREEN | `pnpm test` | 7 unit test lulus, termasuk validasi daftar saran konversi |
| GREEN | `pnpm test:int` | 35 integration test lulus, termasuk 3 skenario seed sistem |
| CLI | `pnpm db:seed` dua kali | Berhasil dan kategori kas tetap 14 baris |
| Contoh | `pnpm db:seed:contoh` dua kali | Berhasil tanpa duplikasi data contoh |
| Guard | `NODE_ENV=production pnpm db:seed:contoh` | Ditolak dengan pesan bahwa seed contoh tidak boleh dijalankan di production |

## Hasil verifikasi data lokal

- 14 kategori kas.
- 8 bahan contoh dan 8 mutasi stok awal.
- 1 resep `Brownies Panggang` dengan 7 item.
- 3 produk contoh.
- Migrasi `stok_mutasi.dibuat_oleh` menjadi nullable hanya mengubah kolom tersebut agar mutasi
  seed development dapat dicatat sebelum pengguna aplikasi tersedia.

## Batasan

Seed ke Supabase dev tidak dijalankan karena `.env.local` belum memiliki kredensial Supabase.
Verifikasi dilakukan pada PostgreSQL 17 lokal. Insert langsung ke `stok_mutasi` ditandai TODO untuk
diganti dengan `catatMutasi()` pada Step 0.7.
