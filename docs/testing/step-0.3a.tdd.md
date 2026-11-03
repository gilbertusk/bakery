# Bukti TDD — Step 0.3a Schema Master dan Resep

## Sumber

Journey dan acceptance criteria berasal dari `docs/prompts/00-fase-0-fondasi.md` bagian 0.3a dan
`docs/ERD.md`.

## Journey

Sebagai developer, saya ingin aturan inti bahan, resep, dan produk dijaga langsung oleh PostgreSQL,
agar data tidak valid tetap ditolak walaupun kelak ada kesalahan di lapisan aplikasi.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `pnpm typecheck` | Gagal karena sembilan tabel schema yang dirujuk test belum diekspor; commit `39b3bf2` |
| GREEN | `pnpm test:int` | 9 test integrasi lulus, termasuk 7 penolakan constraint dan 1 rangkaian master yang valid |
| Migrasi | `pnpm db:generate` | Menghasilkan migrasi awal; pemanggilan kedua melaporkan tidak ada perubahan schema |
| Validasi migrasi | `pnpm exec drizzle-kit check` | `Everything's fine` |
| Regresi | `pnpm test:all` | 6 unit, 9 integrasi, dan 2 E2E lulus |

## Spesifikasi test

| # | Jaminan | Bukti | Hasil |
| --- | --- | --- | --- |
| 1 | Komponen wajib menunjuk tepat satu resep atau bahan | `schema-master.test.ts` | PASS |
| 2 | Peran adonan wajib menunjuk resep | `schema-master.test.ts` | PASS |
| 3 | Nama bahan unik tanpa membedakan kapital | `schema-master.test.ts` | PASS |
| 4 | Nama konversi unik per bahan tanpa membedakan kapital | `schema-master.test.ts` | PASS |
| 5 | Pengaturan toko hanya menerima id 1 | `schema-master.test.ts` | PASS |
| 6 | Loyang bulat wajib memiliki diameter | `schema-master.test.ts` | PASS |
| 7 | Rangkaian bahan → konversi → resep → produk valid dapat disimpan | `schema-master.test.ts` | PASS |

## Coverage dan catatan

Schema bersifat deklaratif; bukti utamanya adalah migrasi yang benar-benar diterapkan ke PostgreSQL
17 dan constraint yang diuji melalui query integrasi. Migrasi tidak membuat schema atau tabel
`auth`; `auth.users` disediakan global setup sebagai representasi tabel eksternal Supabase Auth.
