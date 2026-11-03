# Bukti TDD — Step 0.8 CI & Deploy

## Sumber

`docs/prompts/00-fase-0-fondasi.md` bagian 0.8 dan `docs/PLAN.md` §7. Hosting dipilih pengguna:
Vercel Hobby (gratis) + Supabase.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run src/header-keamanan.test.ts` | 3 test gagal: header belum dipasang, `poweredByHeader` belum `false`; commit `7e24f6e` |
| GREEN | `pnpm test --coverage` | 21 file, 143 unit test lulus (perintah sama dengan CI) |
| GREEN | `pnpm test:e2e` | 8 test lulus, termasuk header keamanan dari server sungguhan (mobile + desktop) |
| Regresi | `pnpm test:int` | 74 test integrasi lulus, 5 run berturut-turut |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `SKIP_ENV_VALIDATION=1 pnpm build` | Lulus |

## Yang dibuktikan test

- Semua path mendapat `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
- `Permissions-Policy` berisi `camera=()`, `microphone=()`, `geolocation=()`, `bluetooth=(self)`.
- Header `X-Powered-By` tidak dikirim.

## Catatan

- Satu run integrasi sempat gagal karena container baru belum benar-benar siap: `pg_isready` lewat
  socket lapor siap saat server init sementara masih jalan. Health check di `docker-compose.yml`
  dan `ci.yml` sekarang memakai `-h 127.0.0.1`.
- Workflow CI dan migrasi belum terbukti hijau di GitHub sampai repo di-push dan run pertama selesai.
- Deploy Vercel dan login produksi belum bisa dicek: menunggu proyek Supabase dan env di Vercel.
