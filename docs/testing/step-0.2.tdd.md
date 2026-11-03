# Bukti TDD — Step 0.2 Environment dan Database

## Sumber

Journey dan kriteria selesai berasal dari `docs/prompts/00-fase-0-fondasi.md` bagian 0.2.

## Journey

Sebagai developer, saya ingin konfigurasi environment gagal dengan aman saat tidak valid dan
database test lokal dapat diinisialisasi secara deterministik, agar aplikasi tidak memakai koneksi
yang salah atau membocorkan secret.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `pnpm exec vitest run src/env-schema.test.ts --project unit` | Gagal karena modul `./env-schema` belum ada; commit `4adadd5` |
| GREEN | Perintah RED yang sama setelah implementasi | 5 test lulus; commit `a10150e` |
| Integrasi | `pnpm db:test:up` lalu `pnpm test:int` | PostgreSQL sehat; global setup dan 1 smoke test database lulus |
| Regresi | `pnpm test:all` | 6 unit, 1 integrasi, dan 2 E2E lulus |

## Spesifikasi test

| # | Jaminan | Bukti | Jenis | Hasil |
| --- | --- | --- | --- | --- |
| 1 | Zona waktu server default ke Asia/Jakarta | `src/env-schema.test.ts` | Unit | PASS |
| 2 | Pesan error menyebut nama variabel tanpa nilai rahasia | `src/env-schema.test.ts` | Unit | PASS |
| 3 | URL runtime wajib memakai port pooler 6543 | `src/env-schema.test.ts` | Unit | PASS |
| 4 | Public URL dan anon key divalidasi terpisah | `src/env-schema.test.ts` | Unit | PASS |
| 5 | Global setup menghasilkan database yang dapat menerima query | `tests/integration/database.test.ts` | Integrasi | PASS |

## Coverage dan batasan

`pnpm exec vitest run src/env-schema.test.ts --project unit --coverage
--coverage.include=src/env-schema.ts` menghasilkan 100% statements, branches, functions, dan lines.

`pnpm db:check` baru dapat diverifikasi setelah `.env.local` diisi sendiri dari dashboard Supabase.
Nilai secret tidak pernah dimasukkan ke repository atau laporan ini.
