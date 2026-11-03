# Bukti TDD — Step 0.5 Autentikasi dan Otorisasi

## Sumber

Acceptance criteria berasal dari `docs/prompts/00-fase-0-fondasi.md` bagian 0.5, `docs/PRD.md` §8
dan F-SET-04, serta `docs/ERD.md` §4.6 dan §8.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `pnpm typecheck` | Gagal karena `./next-path`, `@/lib/auth`, dan `@/lib/auth/pengguna` belum ada; commit `e81cd00` |
| GREEN | `pnpm test` | 19 unit test lulus: validasi `?next` (terima `/kasir`, tolak `//evil.com`, `https://…`, `/\evil.com`) dan pesan error login generik |
| GREEN | `pnpm test:int` | 41 integration test lulus: trigger pengguna pertama jadi pemilik, berikutnya kasir, metadata `peran` hanya dihormati bila valid; `requirePeranAksi` melempar `TidakBerwenangError` / `BelumLoginError` |
| GREEN | `pnpm test:e2e` | 6 test lulus (mobile + desktop): `/dashboard` tanpa login diarahkan ke `/login?next=%2Fdashboard`, `/` berakhir di login, tombol tampil/sembunyi password |
| Cek | `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, `drizzle-kit check` | Lulus |

## Catatan implementasi

- Next.js 16 mengganti `middleware.ts` menjadi `src/proxy.ts`. Proxy hanya me-refresh sesi dan
  mengarahkan; otorisasi tetap diperiksa di halaman (`requirePengguna`/`requirePeran`) dan di setiap
  server action (`requirePenggunaAksi`/`requirePeranAksi`).
- Migrasi `0004_trigger_pengguna_baru.sql` memakai advisory lock transaksi agar dua user yang dibuat
  bersamaan tidak sama-sama menjadi pemilik pertama. Eksekusi fungsi dicabut dari `anon` dan
  `authenticated`.
- Helper test lama yang menyisipkan `pengguna` manual diganti `buatPenggunaTest()` yang lewat trigger.
  Client SQL mentah test dipisah dari client Drizzle karena Drizzle mengganti serializer JSON.
- Vitest memetakan `server-only` ke modul kosong agar modul auth bisa diuji.
- Playwright menjalankan dev server dengan `SKIP_ENV_VALIDATION=1` bila env Supabase belum ada.

## Batasan

`pnpm buat-pemilik`, login sungguhan, dan reset password belum dicoba karena `.env.local` belum
memiliki kredensial Supabase. Migrasi 0004 belum diterapkan ke Supabase dev.
