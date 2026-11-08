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

## Utilitas inti

Pakai fungsi ini, jangan membuat ulang. `Tx` = transaksi Drizzle (`db.transaction(async (tx) => …)`).
`NilaiAngka` = `string | number | Decimal`.

**`@/lib/angka`** (decimal.js, presisi 30, ROUND_HALF_UP)

- `D(nilai: NilaiAngka): Decimal`
- `keNumeric(nilai: NilaiAngka, skala: number): string`: untuk kolom `numeric`
- `bulatRupiah(nilai: NilaiAngka): number`: integer half up, tanpa `-0`
- `bulatKeAtas(nilai: NilaiAngka, kelipatan: number): number`
- `isNol`, `isNegatif`, `isPositif`, `isBulat` `(nilai: NilaiAngka): boolean`
- `jumlah(daftar: readonly NilaiAngka[]): Decimal`

**`@/lib/format`** (tampilan, zona `ZONA_WIB = 'Asia/Jakarta'`)

- `formatRupiah(nilai: NilaiAngka): string`: `"Rp15.000"`, `"-Rp15.000"`
- `formatRupiahDesimal(nilai: NilaiAngka, desimal = 2): string`: `"Rp13,50"`
- `formatAngka(nilai: NilaiAngka, maksDesimal = 4): string`: `"1.200,5"`
- `formatTakaran(nilai: NilaiAngka, satuan: string): string`: `"36 g"`
- `parseRupiah(input: string): number | null`: null bila tidak valid
- `formatTanggal(waktu: Date | string): string`: `"3 Nov 2026"`; string `YYYY-MM-DD` dianggap tanggal WIB
- `formatWaktu(waktu: Date | string): string`: `"3 Nov 2026 14.05"`
- `tanggalWib(waktu: Date): string` dan `hariIniWib(sekarang?: Date): string`: `"YYYY-MM-DD"`
- `rentangHariWib(tanggal: string): { mulai: Date; selesai: Date }`: `selesai` eksklusif, pakai `waktu >= mulai AND waktu < selesai`

**`@/lib/nomor`**

- `ambilNomor(tx: Tx, prefix: PrefixNomor, tanggal?: string): Promise<string>`: `PrefixNomor = 'NT' | 'PB' | 'PR' | 'PO' | 'INV'`. Wajib di transaksi yang sama dengan penyimpanan dokumen.
- `formatNomor(prefix, tanggal, urutan): string`: `NT-261103-001`, 4 digit setelah 999

**`@/lib/stok`**

- `catatMutasi(tx: Tx, input: InputMutasi): Promise<{ saldoSesudah: string; menjadiMinus: boolean }>`
  - `InputMutasi = { jenis, target: { bahanId } | { produkId }, qty (bertanda), nilaiSatuan, alasan?, sumberTipe, sumberId, dibuatOleh, izinkanMinus }`
  - Mengunci baris (`FOR UPDATE`). Melempar `StokTidakCukupError { nama, stok, diminta }` bila minus dilarang, `PesanError` bila qty nol, qty produk pecahan, atau target tidak ada.
- `hitungUlangSaldo(tx: Tx, target: TargetStok): Promise<Decimal>`: Σ qty buku besar
- `StokTidakCukupError`

**`@/lib/kas`**

- `catatKas(tx: Tx, input: InputKas): Promise<baris kas>`
  - `InputKas = { kategori (nama KATEGORI_KAS atau id), jenis?, akun, nominal (int > 0), keterangan, sumberTipe?, sumberId?, dibuatOleh, waktu? }`
  - Jenis kas selalu mengikuti kategori; `jenis` yang beda ditolak.
- `akunDariMetode(metode: MetodeBayar): AkunKas`: tunai → `tunai`, transfer/qris → `rekening`
- `batalkanKasDariSumber(tx: Tx, sumberTipe: SumberTipe, sumberId: string): Promise<number>`
- `saldoAkun(db: Db | Tx): Promise<Record<AkunKas, number>>` dan `saldoAkun(db, akun): Promise<number>`: kas `dibatalkan` tidak dihitung
- `KATEGORI_KAS` (juga di `@/lib/kas/kategori`)

**`@/lib/audit`**

- `catatAudit(tx: Tx, input: InputAudit): Promise<baris | null>`
  - `InputAudit = { penggunaId, tabel, recordId, aksi: 'insert' | 'update' | 'batal', dataLama?, dataBaru? }`
  - `update` hanya menyimpan field yang berubah (`"15.0000"` = `"15"`); tanpa perubahan tidak menulis dan mengembalikan `null`.
- `selisihData(lama, baru): { lama; baru } | null`

**`@/lib/aksi`** (server-only)

- `aksi({ schema, peran?, jalankan: (input, pengguna) => Promise<T> }): (input: unknown) => Promise<HasilAksi<T>>`
  - Urutan: cek login, cek peran, parse Zod (`fieldErrors` per path; error tingkat form di `_form`), jalankan.
  - Error dipetakan: `PesanError` (termasuk `StokTidakCukupError`), `BelumLoginError`, `TidakBerwenangError` → pesannya; Postgres `23505` → "Data dengan nama ini sudah ada"; `23503` → "Data masih dipakai di tempat lain"; lainnya dicatat `log.error` dan menjadi "Terjadi kesalahan, coba lagi".
  - `redirect()`/`notFound()` diteruskan.
- `HasilAksi<T>`, `PesanError` (juga di `@/lib/error`): lempar `new PesanError('…')` untuk pesan bisnis yang aman ditampilkan.

**`@/lib/hpp`** (murni, Decimal penuh, tanpa pembulatan kecuali `saranHarga`; input salah → `HitungError extends PesanError`)

- `keSatuanDasar(takaran, nilaiKonversi | null): Decimal`: §7.1, `null` = sudah satuan dasar
- `kemasanKeDasar(jumlah, satuanKemasan: 'kg'|'g'|'l'|'ml'|'pcs'|'lusin', satuanDasar): Decimal`
- `hargaPerSatuanDasar(totalHarga, qtyDasar): Decimal`: §7.2
- `hargaBaruBahan({ metode, stokLama, hargaLama, qtyBeli, hargaBeli }): Decimal`: §7.8, stok minus dianggap 0
- `biayaAdonan({ items: { takaranDasar, hargaPerSatuan }[], hasilGram }): { biayaTotal; biayaPerGram }`: §7.3
- `hasilOtomatis(items: { takaranDasar, satuanDasar, namaBahan }[]): { hasilGram; peringatan: string[] }`: F-RSP-02 KP1
- `hitungMargin(hpp, hargaJual): { marginRp; marginPersen: Decimal | null }`: persen berupa pecahan
- `saranHarga(hpp, targetMargin, kelipatan = 500): number`: §7.5, bulat ke atas
- `faktorSkala(InputSkala): Decimal`: `manual` | `bulat` | `kotak` | `campuran` (rasio luas), §7.6
- `skalakanItems(items, faktor)`: salinan dengan `takaran`/`takaranDasar` Decimal
- `hitungHppProduk({ komponen, biayaTambahan }): RincianHpp`: §7.4; `perPeran`, `perKomponen`, `biayaBahan`, `overhead { perPcs, persen, perBatch, total }`, `hpp`, `adonanUtama { resepId, pcsPerResep } | null`, `peringatan`. Adonan utama = gram per pcs terbesar; per batch diabaikan (dengan peringatan) bila tanpa adonan atau `pcsPerResep` 0.
- `alokasiProduksi({ biayaAdonan, hasil[] }): { produkId, alokasiAdonan, hppAktual | null }[]`: §7.7, bobot = gram per pcs × pcs rencana
- `pemakaianBahanProduksi({ resepUtama, faktorSkala, produk[] }): Map<bahanId, Decimal>`: F-PRO-02, resep utama × skala sekali, adonan lain proporsional, bahan langsung × pcs aktual
- `kebutuhanUntukPesanan(produk: { qty, komponen }[]): Map<bahanId, Decimal>`: semua adonan proporsional
- `KonteksHpp`: data mentah bahan, resep, produk (dipakai query 1.8). `hitungHppSemua(konteks): Map<produkId, RincianHpp>`
- `simulasiKenaikan(konteks, { bahanId, persen }[]): DampakSimulasi[]`: F-PRD-07, hanya produk berubah, urut selisih menurun
- `KONVERSI_UMUM` (`@/lib/hpp/konversi-umum`): saran konversi sdm/cup
- Fixture test Brownies: `src/lib/hpp/__fixtures__/brownies.ts`

**`@/lib/telepon`**

- `normalisasiKontak(input: string): { ok: true; nilai: string | null } | { ok: false; error }`: nomor HP `08…`/`+62 8…` → `628…`; kontak lain disimpan apa adanya; kosong → null
- `nomorWhatsApp(kontak): string | null`, `linkWhatsApp(kontak): string | null` (`https://wa.me/628…`)

**Lainnya**

- `@/lib/log`: `log.info | log.warn | log.error(pesan: string, konteks?: { error?, ...lainnya })`, JSON satu baris. Pengganti `console.log`.
- `@/lib/zod-id`: import sekali untuk memasang pesan Zod bahasa Indonesia secara global (sudah diimpor oleh `aksi.ts`; form client perlu `import '@/lib/zod-id'`). `pesanPertama(error: ZodError): string`.

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
