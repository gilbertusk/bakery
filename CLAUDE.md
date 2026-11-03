# CLAUDE.md — Aplikasi Kasir & HPP Toko Kue Khansa

## Ringkasan

Aplikasi web (PWA) untuk toko kue Khansa: stok bahan, resep adonan, HPP per produk, kasir, pre-order, dan pembukuan dalam satu tempat.
Inti perhitungannya adalah BOM dua tingkat: bahan → resep adonan (biaya per gram) → produk per cetakan (HPP per pcs).
Pengguna: pemilik (akses penuh) dan kasir (tanpa akses HPP, harga bahan, maupun laba).

Dokumen acuan (baca bagian yang relevan sebelum mengerjakan tugas):

- [docs/PRD.md](docs/PRD.md): kebutuhan, kriteria penerimaan, aturan hitung (§7), hak akses (§8)
- [docs/ERD.md](docs/ERD.md): skema database, constraint, invarian
- [docs/PLAN.md](docs/PLAN.md): fase, keputusan teknis, struktur folder
- [docs/prompts/](docs/prompts/README.md): prompt per langkah

## Perintah

| Perintah                            | Fungsi                                            |
| ----------------------------------- | ------------------------------------------------- |
| `pnpm install`                      | Pasang dependency                                 |
| `pnpm dev`                          | Server development                                |
| `pnpm build`                        | Build produksi                                    |
| `pnpm lint`                         | ESLint                                            |
| `pnpm typecheck`                    | `tsc --noEmit`                                    |
| `pnpm format` / `pnpm format:check` | Prettier                                          |
| `pnpm test`                         | Test unit (Vitest)                                |
| `pnpm test:int`                     | Test integrasi (butuh DB test, mulai langkah 0.2) |
| `pnpm test:e2e`                     | Test E2E (Playwright)                             |
| `pnpm test:all`                     | Unit + integrasi + E2E                            |
| `pnpm db:generate` / `db:migrate`   | Generate dan jalankan migrasi Drizzle             |
| `pnpm db:studio` / `db:check`       | Buka Drizzle Studio / cek koneksi runtime         |
| `pnpm db:test:up` / `db:test:down`  | Hidupkan / matikan PostgreSQL test lokal          |

## Setup lokal

1. Jalankan `pnpm install`.
2. Salin `.env.example` ke `.env.local`, lalu isi dari dashboard Supabase. Jangan commit secret.
3. Jalankan `pnpm db:check` untuk memeriksa koneksi runtime.
4. Jalankan `pnpm db:test:up`, lalu `pnpm test:int` untuk test integrasi lokal.
5. Matikan database test dengan `pnpm db:test:down` setelah selesai.

Panduan lengkap tersedia di [docs/setup.md](docs/setup.md).

## Stack

- Next.js 16 (App Router, Turbopack). **Cache Components aktif** (`cacheComponents: true`):
  - pakai `'use cache'` + `cacheTag` / `revalidateTag` untuk caching
  - akses data dinamis (cookies, sesi) dibungkus `<Suspense>`
  - ikuti dokumentasi Next.js 16, bukan pola Next 14/15 (`unstable_cache`, `export const dynamic`)
- React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui
- Supabase (Postgres + Auth + Storage), Drizzle ORM
- Zod, React Hook Form, decimal.js, date-fns + @date-fns/tz
- Vitest, Playwright

## Bahasa & penamaan

- Semua teks UI dan pesan error dalam **Bahasa Indonesia**.
- Nama tabel/kolom mengikuti ERD:
  - snake_case di database
  - camelCase di TypeScript (`harga_per_satuan` → `hargaPerSatuan`)
- Nama domain dalam bahasa Indonesia (bahan, resep, produk, penjualan, kas). Istilah teknis boleh Inggris (`schema`, `query`, `action`).
- Komponen React: PascalCase. Hook: `useXxx`. Konstanta: UPPER_SNAKE_CASE.

## Struktur folder

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (app)/<modul>/        halaman per modul, layout dengan navigasi per peran
│   ├── cetak/struk/[id]/     halaman cetak tanpa layout
│   └── api/                  route handler: PDF, ekspor xlsx
├── db/
│   ├── schema/               satu file per domain
│   ├── client.ts
│   └── seed/
├── lib/
│   ├── hpp/                  fungsi hitung murni
│   ├── stok/                 catatMutasi()
│   ├── kas/                  catatKas()
│   ├── auth/                 getPengguna(), requirePeran()
│   ├── nomor.ts  audit.ts  format.ts  angka.ts  aksi.ts
├── features/<modul>/
│   ├── actions.ts            server actions (mutasi)
│   ├── queries.ts            query baca
│   ├── schemas.ts            Zod, dipakai bersama form & server
│   └── components/
└── components/
    ├── ui/                   shadcn (jangan diedit kecuali perlu)
    └── ...                   komponen bersama
tests/
├── integration/              server action vs Postgres nyata
└── e2e/                      Playwright
```

## Aturan arsitektur (WAJIB)

1. Drizzle **hanya di server**. File yang mengimpor `db` wajib `import 'server-only'`.
2. Stok **hanya** diubah lewat `src/lib/stok` (`catatMutasi`).
3. Kas **hanya** diubah lewat `src/lib/kas` (`catatKas`).
4. Setiap server action dan route handler diawali `requirePengguna()` / `requirePeran(...)` (lewat helper `aksi()`).
5. Operasi yang menyentuh lebih dari satu tabel wajib di dalam `db.transaction`.
6. Transaksi (penjualan, pembelian, produksi, kas, PO) **tidak pernah dihapus**, hanya dibatalkan dengan pembalik.
7. Data untuk kasir memakai DTO terpisah tanpa HPP, harga per satuan bahan, biaya, maupun laba. Disaring di server, bukan disembunyikan di UI.
8. Nilai dari client (harga, total, takaran dasar) **dihitung ulang di server**.

## Angka & uang

- Uang transaksi (harga jual, total, kas, DP) = **integer rupiah**.
- Harga per satuan, takaran, stok bahan, HPP = **Decimal** (decimal.js). Dari database berupa string.
- **Dilarang** menghitung uang/takaran dengan operator `number` biasa (`+ - * /`).
- Pembulatan hanya di akhir (saat ditampilkan atau disalin ke transaksi).

## Waktu

- Simpan `timestamptz` (UTC).
- Tampilkan dan kelompokkan per hari di **Asia/Jakarta (WIB)**. Gunakan helper di `src/lib/format.ts`.

## Format hasil server action

```ts
type HasilAksi<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

## Testing

- **TDD** untuk `src/lib/hpp` dan semua logika mutasi stok/kas: test dulu, lalu implementasi.
- Setiap server action yang mengubah data punya test integrasi (termasuk penolakan untuk peran yang salah).
- Target coverage 80% (`src/lib/hpp` 100%).
- Unit test berdampingan dengan file (`*.test.ts`). Integrasi di `tests/integration/`, E2E di `tests/e2e/`.

## Definition of Done

- [ ] Kriteria penerimaan PRD terpenuhi.
- [ ] Test ditulis lebih dulu untuk logika hitung dan mutasi stok/kas.
- [ ] Typecheck, lint, dan semua test hijau.
- [ ] Otorisasi dicek di server. Kasir tidak menerima data terlarang.
- [ ] Tampilan dicek di lebar 360 px dan 1280 px.
- [ ] Pesan error dalam bahasa Indonesia yang jelas.
- [ ] Tidak ada `console.log`, tidak ada secret di kode.

## Larangan

- `console.log` di kode aplikasi (pakai logger server, mulai langkah 0.7)
- Tipe `any`
- Secret, password, atau connection string di kode maupun di file yang di-commit
- Mengedit file migrasi yang sudah diterapkan (buat migrasi baru)
- Menghapus data transaksi

## Commit

Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`, `perf:`, `ci:`.
Satu langkah di `docs/prompts/` = satu commit atau beberapa commit kecil.
