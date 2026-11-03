# Fase 0 — Fondasi

Tujuan fase: proyek siap dikembangkan. Hasil akhirnya:
- login berfungsi
- skema database lengkap
- utilitas inti (stok, kas, nomor, format) teruji
- CI hijau dan aplikasi ter-deploy

Urutan: 0.1 → 0.2 → 0.3a → 0.3b → 0.4 → 0.5 → 0.6 → 0.7 → 0.8

---

## 0.1 — Inisialisasi proyek & CLAUDE.md

Est. 0,5 hari · Prasyarat: Node.js LTS dan pnpm terpasang · Git sudah terpasang

~~~text
Kamu adalah senior full-stack engineer yang memulai proyek "Aplikasi Kasir & HPP Toko Kue Khansa".
Folder kerja saat ini sudah berisi docs/ (PRD.md, ERD.md, PLAN.md, prompts/). Belum ada kode sama sekali.

BACA DULU
- docs/PLAN.md §2 (keputusan teknis) dan §3 (struktur folder)
- docs/PRD.md §9 (kebutuhan non-fungsional)

TUGAS
1. Inisialisasi Next.js versi stabil terbaru (App Router) DI FOLDER INI (bukan subfolder) memakai pnpm:
   - TypeScript, folder src/, alias import "@/*", Tailwind CSS, ESLint
   - JANGAN menghapus atau menimpa folder docs/
   - Jika create-next-app menolak karena folder tidak kosong, buat di folder sementara lalu pindahkan isinya
2. tsconfig.json: "strict": true, "noUncheckedIndexedAccess": true, "noImplicitOverride": true.
3. Prettier:
   - pasang prettier + prettier-plugin-tailwindcss
   - buat .prettierrc (semi true, singleQuote true, printWidth 100)
   - buat .editorconfig (LF, indent 2 spasi)
   - tambahkan .gitattributes "* text=auto eol=lf" (kita di Windows)
4. shadcn/ui init (CSS variables, base color neutral). Tambahkan komponen:
   button, input, label, form, select, textarea, checkbox, switch, radio-group, dialog, alert-dialog,
   sheet, drawer, popover, command, dropdown-menu, table, card, badge, tabs, separator, skeleton,
   sonner, calendar, tooltip, scroll-area, avatar.
5. Vitest dengan dua project di vitest.config.ts:
   - "unit": src/**/*.test.ts(x), environment node
   - "integration": tests/integration/**/*.test.ts, environment node, fileParallelism false, timeout 30 detik
   Buat satu test contoh src/lib/utils.test.ts untuk fungsi cn() dari shadcn.
6. Playwright di tests/e2e:
   - project "mobile" (devices['Pixel 7']) dan "desktop" (1280x800)
   - webServer: pnpm dev
   - satu test contoh yang membuka halaman beranda
7. Dependency yang dipasang sekarang (versi stabil terbaru):
   zod, react-hook-form, @hookform/resolvers, decimal.js, date-fns, @date-fns/tz, server-only, lucide-react.
   JANGAN memasang Drizzle/Supabase dulu (itu langkah 0.2).
8. Script package.json:
   dev, build, start, lint, typecheck (tsc --noEmit), format, format:check,
   test (vitest run --project unit), test:int (vitest run --project integration),
   test:e2e (playwright test), test:all.
9. html lang="id", font Inter via next/font, metadata title "Toko Kue Khansa".
   Halaman beranda sementara berisi teks "Aplikasi Toko Kue — sedang dibangun".
10. .gitignore memuat .env*.local, .env, /playwright-report, /test-results, /coverage.
    Buat .env.example kosong dengan komentar "diisi di langkah 0.2".
11. Buat CLAUDE.md di root. Isinya (bahasa Indonesia, ringkas, berbentuk aturan; maksimal ±150 baris):
   a. Ringkasan proyek 3 kalimat + tautan ke docs/PRD.md, docs/ERD.md, docs/PLAN.md, docs/prompts/.
   b. Perintah: install, dev, lint, typecheck, test, test:int, test:e2e, db:* (tulis "ditambahkan di 0.2").
   c. Bahasa:
      - semua teks UI dan pesan error dalam Bahasa Indonesia
      - nama tabel/kolom mengikuti ERD (snake_case di DB, camelCase di TypeScript, mis. harga_per_satuan → hargaPerSatuan)
      - nama domain dalam bahasa Indonesia (bahan, resep, produk, penjualan); istilah teknis boleh Inggris
   d. Struktur folder (salin dari PLAN §3) dan pola fitur:
      src/features/<modul>/{actions.ts, queries.ts, schemas.ts, components/}
   e. Aturan arsitektur WAJIB:
      - Drizzle hanya dipakai di server; file yang mengimpor db wajib import 'server-only'
      - stok hanya diubah lewat src/lib/stok (catatMutasi)
      - kas hanya diubah lewat src/lib/kas (catatKas)
      - setiap server action diawali requirePeran(...) atau requirePengguna()
      - operasi yang menyentuh >1 tabel wajib di dalam db.transaction
      - transaksi tidak pernah dihapus, hanya dibatalkan
      - data untuk kasir memakai DTO tanpa HPP/harga bahan/laba
   f. Angka & uang:
      - uang transaksi = integer rupiah
      - harga per satuan/takaran/HPP = Decimal (decimal.js), dari DB berupa string
      - DILARANG menghitung uang/takaran dengan operator number biasa
      - pembulatan hanya di akhir
   g. Waktu: simpan timestamptz UTC; tampilkan dan kelompokkan per hari di Asia/Jakarta.
   h. Format hasil server action: { ok: true, data } | { ok: false, error: string, fieldErrors?: Record<string, string[]> }.
   i. Testing:
      - TDD untuk src/lib/hpp dan semua logika mutasi stok/kas
      - setiap server action yang mengubah data punya test integrasi
      - target coverage 80% (lib/hpp 100%)
   j. Definition of Done: salin dari docs/PLAN.md §6.
   k. Larangan: console.log, tipe any, secret di kode, mengedit migrasi yang sudah diterapkan, menghapus data transaksi.
   l. Commit: conventional commits (feat:, fix:, chore:, test:, docs:, refactor:).
12. git init, lalu commit pertama: "chore: inisialisasi proyek Next.js".

SELESAI JIKA
- pnpm lint, pnpm typecheck, pnpm test, dan pnpm build semuanya lulus
- pnpm dev menampilkan halaman beranda
- CLAUDE.md ada dan memuat poin a–l
- folder docs/ utuh

JANGAN
- Memasang Drizzle, Supabase, atau membuat fitur apa pun
- Mengubah isi docs/

LAPORAN AKHIR
Daftar file utama yang dibuat, versi Next.js/React/Tailwind yang terpasang, dan perintah untuk verifikasi.
~~~

---

## 0.2 — Supabase, environment, koneksi database & DB test 👤

Est. 0,5 hari

**Langkah manual sebelum menjalankan prompt:**
1. Buat 2 proyek di supabase.com: `tokokue-dev` dan `tokokue-prod`. Region: Singapore.
2. Pasang Docker Desktop (untuk database test lokal).
3. Setelah agent membuat `.env.example`, salin ke `.env.local` dan isi sendiri dari dashboard Supabase:
   - Project Settings → Database → Connection string
   - Project Settings → API

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md dan docs/PLAN.md §2.
Ini langkah 0.2: koneksi database dan konfigurasi environment.

PENTING: Jangan pernah meminta saya menempel password/key/connection string di chat.
Saya akan mengisi .env.local sendiri.

TUGAS
1. Pasang: drizzle-orm, postgres (postgres-js), drizzle-kit (dev), @supabase/supabase-js, @supabase/ssr, dotenv (dev), tsx (dev).

2. src/env.ts — validasi env dengan Zod, dipisah server vs client:
   Server:
   - DATABASE_URL: pooler Supabase mode transaksi, port 6543, untuk runtime
   - DATABASE_URL_DIRECT: koneksi langsung/session port 5432, untuk migrasi
   - SUPABASE_SERVICE_ROLE_KEY: service_role / secret key, hanya untuk admin auth & storage
   - APP_TIMEZONE: default "Asia/Jakarta"
   Client:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY (anon / publishable key)
   Aturan:
   - validasi berjalan saat modul diimpor; jika gagal, lempar error yang menyebut nama variabel yang salah TANPA mencetak nilainya
   - dukung SKIP_ENV_VALIDATION=1 untuk build di CI
   - modul server diberi import 'server-only'

3. .env.example berisi semua variabel di atas dengan komentar penjelasan (dari mana mengambilnya di dashboard Supabase) dan nilai placeholder.
   Buat juga .env.test.example untuk DB test lokal.

4. src/db/client.ts:
   - drizzle + postgres-js memakai DATABASE_URL, opsi prepare: false (wajib untuk pooler mode transaksi)
   - casing: 'snake_case'
   - singleton saat development (simpan di globalThis agar HMR tidak membuat koneksi baru terus)
   - import 'server-only'
   - ekspor tipe Db dan Tx (tipe parameter callback db.transaction) untuk dipakai fungsi lain

5. drizzle.config.ts:
   - schema: src/db/schema/index.ts
   - out: drizzle/
   - dbCredentials dari DATABASE_URL_DIRECT
   - casing snake_case, strict true, verbose true
   Buat src/db/schema/index.ts kosong (ekspor nanti).

6. Script package.json:
   - db:generate (drizzle-kit generate)
   - db:migrate (drizzle-kit migrate)
   - db:studio
   - db:check (menjalankan scripts/db-check.ts: SELECT 1 lalu cetak "Koneksi database OK")
   - db:test:up / db:test:down (docker compose)

7. Database test lokal:
   - docker-compose.yml dengan service postgres:17 (sesuaikan dengan versi Postgres proyek Supabase jika berbeda), port 54329, database tokokue_test
   - tests/integration/setup/global-setup.ts:
     a) DROP SCHEMA public CASCADE; CREATE SCHEMA public;
     b) buat stub Supabase supaya migrasi bisa jalan di Postgres biasa:
        - schema auth
        - tabel auth.users (id uuid PK, email text, raw_user_meta_data jsonb, created_at timestamptz)
        - role anon dan authenticated (jika belum ada)
        - fungsi auth.uid() yang mengembalikan null
     c) jalankan migrasi Drizzle (migrate() dari drizzle-orm/postgres-js/migrator)
   - tests/integration/setup/db.ts:
     - ekspor koneksi db test
     - helper resetData() yang TRUNCATE semua tabel public kecuali yang berisi seed sistem
   - vitest project "integration" memakai global-setup ini dan memuat .env.test

8. Tambahkan bagian "Setup lokal" di CLAUDE.md (perintah db:*, docker) dan buat docs/setup.md berisi langkah lengkap untuk developer baru:
   - buat proyek Supabase
   - isi .env.local
   - jalankan docker
   - jalankan migrasi
   - nonaktifkan "Allow new users to sign up" di Supabase Auth

SELESAI JIKA
- pnpm typecheck lulus
- pnpm db:test:up lalu pnpm test:int berjalan (boleh 0 test, tapi global setup sukses)
- Setelah saya mengisi .env.local, pnpm db:check mencetak "Koneksi database OK"

JANGAN
- Membuat tabel apa pun (langkah 0.3a)
- Menulis nilai secret ke file yang di-commit

LAPORAN AKHIR
Daftar variabel env yang harus saya isi beserta lokasinya di dashboard Supabase, dan perintah verifikasi.
~~~

---

## 0.3a — Skema database bagian 1: enum, sistem, master, resep 🧭🧪

Est. 0,75 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, lalu docs/ERD.md SELURUHNYA (terutama §1, §3.1, §3.4, §4.1, §4.2, §4.6, §5).
Ini langkah 0.3a: skema Drizzle untuk enum, tabel sistem, master, dan resep/produk.

TUGAS
1. src/db/schema/_kolom.ts — helper kolom standar:
   - id(): uuid PK defaultRandom
   - dibuatPada(): timestamptz default now, not null
   - diubahPada(): timestamptz default now, $onUpdate(() => new Date())
   - dibuatOleh(): uuid FK → pengguna.id
   Semua timestamp memakai { withTimezone: true }.

2. src/db/schema/enums.ts — SEMUA enum di ERD §5 sebagai pgEnum.
   Nama enum dan nilai persis seperti ERD. Ekspor juga tipe TypeScript-nya.

3. src/db/schema/sistem.ts:
   - authUsers: referensi ke tabel auth.users memakai pgSchema('auth'), hanya kolom id; jangan dimigrasikan, tandai sebagai existing
   - pengguna: id = FK auth.users ON DELETE CASCADE
   - pengaturan_toko: CHECK id = 1; default nilai sesuai ERD §3.4, termasuk info_pembayaran
   - nomor_urut: PK komposit (prefix, tanggal)
   - audit_log: indeks (tabel, record_id) dan (waktu DESC)

4. src/db/schema/master.ts:
   - supplier
   - bahan:
     - unique index lower(nama)
     - numeric(14,4) untuk harga_per_satuan; numeric(14,3) untuk stok dan stok_minimal
     - CHECK harga_per_satuan >= 0 dan stok_minimal >= 0
   - konversi_satuan:
     - ON DELETE CASCADE
     - unique index (bahan_id, lower(nama_satuan))
     - CHECK nilai_dasar > 0

5. src/db/schema/resep.ts:
   - resep_adonan:
     - unique lower(nama)
     - CHECK hasil_gram > 0
     - CHECK konsistensi loyang (bulat → diameter_cm not null; kotak → panjang_cm & lebar_cm not null)
     - FK induk_resep_id ke dirinya sendiri, ON DELETE SET NULL
   - resep_adonan_item:
     - CASCADE dari resep, RESTRICT ke bahan, FK konversi_satuan RESTRICT
     - CHECK takaran > 0
   - produk:
     - unique lower(nama)
     - CHECK harga_jual >= 0
     - CHECK target_margin antara 0 dan 0.95 bila tidak null
   - produk_komponen:
     - CHECK num_nonnulls(resep_adonan_id, bahan_id) = 1
     - CHECK peran = 'adonan' → resep_adonan_id is not null
     - CHECK takaran > 0
   - biaya_tambahan: CHECK nilai >= 0; CHECK metode='persen' → nilai <= 1

6. Tipe numeric: gunakan mode string (default Drizzle). Jangan memakai mode number.

7. Definisikan relations() Drizzle untuk semua relasi di tabel-tabel ini.

8. Ekspor semuanya dari src/db/schema/index.ts.

9. CATATAN tabel riwayat_harga: punya FK ke pembelian_item. Tabel ini dibuat di langkah 0.3b (file stok.ts) untuk menghindari import melingkar.

10. pnpm db:generate → periksa SQL migrasi yang dihasilkan:
    - pastikan CHECK, unique index lower(), dan FK sesuai
    - pastikan migrasi TIDAK mencoba membuat schema/tabel auth

11. Test integrasi tests/integration/schema-master.test.ts (TDD: tulis dulu). Masing-masing harus GAGAL dengan error constraint:
    - insert produk_komponen dengan resep_adonan_id dan bahan_id sama-sama null
    - insert produk_komponen dengan keduanya terisi
    - insert produk_komponen peran 'adonan' dengan bahan_id
    - insert bahan dengan nama "Tepung" lalu "tepung" (duplikat case-insensitive)
    - insert konversi "Sdm" dan "sdm" untuk bahan yang sama
    - insert pengaturan_toko id = 2
    - insert resep_adonan bentuk bulat tanpa diameter
    Plus satu test yang SUKSES: insert bahan + konversi + resep + item + produk + komponen yang valid.
    Buat helper test pembuatPengguna() yang insert ke auth.users stub lalu pengguna.

SELESAI JIKA
- pnpm db:generate menghasilkan migrasi bersih
- pnpm test:int lulus semua
- pnpm typecheck lulus
- nama tabel/kolom 100% sama dengan ERD

JANGAN
- Membuat tabel stok/penjualan/po/kas (langkah 0.3b)
- Menerapkan migrasi ke Supabase dev sebelum saya cek (cukup ke DB test lokal)

LAPORAN AKHIR
Daftar tabel + jumlah constraint per tabel, dan perbedaan dengan ERD jika ada (beserta alasannya).
~~~

---

## 0.3b — Skema database bagian 2: stok, penjualan, PO, kas + RLS 🧭🧪

Est. 0,75 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, lalu docs/ERD.md §3.2, §3.3, §4.3, §4.4, §4.5, §7, §8.
Skema bagian 1 (enum, sistem, master, resep) sudah ada di src/db/schema/. Ini langkah 0.3b.

TUGAS
1. src/db/schema/stok.ts:
   - pembelian, pembelian_item
     - CHECK jumlah_kemasan > 0, isi_per_kemasan > 0, total_harga >= 0
   - riwayat_harga
     - indeks (bahan_id, berlaku_sejak DESC)
     - CHECK sumber='pembelian' → pembelian_item_id not null
   - produksi
     - CHECK faktor_skala > 0
   - produksi_hasil
     - UNIQUE(produksi_id, produk_id)
     - CHECK pcs_* >= 0
   - stok_mutasi
     - CHECK num_nonnulls(bahan_id, produk_id) = 1
     - CHECK qty <> 0
     - CHECK jenis='penyesuaian' → alasan not null dan tidak kosong
     - indeks (bahan_id, waktu), (produk_id, waktu), (sumber_tipe, sumber_id)
   - stok_opname, stok_opname_item
     - CHECK num_nonnulls(bahan_id, produk_id) = 1

2. src/db/schema/penjualan.ts:
   - penjualan
     - no_nota unik
     - pre_order_id unik bila tidak null
     - kunci_idempoten unik bila tidak null
     - CHECK diskon_nota antara 0 dan subtotal
     - CHECK total = subtotal - diskon_nota
     - CHECK status='batal' → alasan_batal, dibatalkan_oleh, dibatalkan_pada not null
     - indeks (waktu)
   - penjualan_item
     - CHECK qty > 0
     - CHECK subtotal = qty*harga_satuan - diskon_item
     - CHECK diskon_item antara 0 dan qty*harga_satuan

3. src/db/schema/po.ts:
   - pre_order
     - indeks (tanggal_ambil), (status)
     - CHECK status='batal' → alasan_batal dan dibatalkan_pada not null
   - pre_order_item: CHECK qty > 0
   - po_pembayaran: CHECK nominal > 0
   - invoice: CHECK num_nonnulls(pre_order_id, penjualan_id) = 1; no_invoice unik

4. src/db/schema/kas.ts:
   - kategori_kas: nama unik
   - kas
     - CHECK nominal > 0
     - indeks (waktu), (akun), (sumber_tipe, sumber_id)

5. relations() untuk semua tabel baru. Ekspor dari index.ts.

6. Migrasi SQL kustom (pnpm drizzle-kit generate --custom --name rls_deny_all):
   - ALTER TABLE ... ENABLE ROW LEVEL SECURITY untuk SETIAP tabel di schema public (tulis eksplisit per tabel)
   - REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated
   - ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated
   - komentar di atas file yang menjelaskan alasannya (ERD §8)

7. Test integrasi tests/integration/schema-transaksi.test.ts (TDD):
   - semua CHECK di atas: minimal satu kasus gagal per CHECK
   - kasus sukses: satu alur pembelian, penjualan, PO, dan kas yang valid
   - tests/integration/rls.test.ts: query pg_class untuk SEMUA tabel di schema public, pastikan relrowsecurity = true.
     Test ini harus gagal otomatis jika kelak ada tabel baru tanpa RLS. Beri pesan error yang menyebut nama tabelnya.

8. Setelah semua test hijau, terapkan migrasi ke Supabase dev: pnpm db:migrate.
   Lalu cek di dashboard Supabase bahwa semua tabel berlabel "RLS enabled".
   (Jika .env.local belum terisi, lewati dan beri tahu saya.)

SELESAI JIKA
- pnpm test:int lulus
- pnpm typecheck lulus
- jumlah tabel di DB = jumlah tabel di ERD
- semua tabel RLS aktif

LAPORAN AKHIR
- Tabel per file
- Daftar CHECK yang dibuat
- Hasil migrasi ke Supabase dev
- Penyimpangan dari ERD (jika ada)
~~~

---

## 0.4 — Seed data sistem & data contoh 🧪

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/ERD.md §4.5 (kategori kas) dan §3.4 (pengaturan_toko), docs/PRD.md §10 (K3).
Ini langkah 0.4: seed data.

TUGAS
1. src/db/seed/sistem.ts — idempoten (aman dijalankan berkali-kali, pakai ON CONFLICT):
   a. pengaturan_toko id=1:
      - nama_toko "Toko Kue Khansa"
      - ukuran_kertas 58
      - metode_harga rata_rata
      - target_margin_default 0.30
      - izinkan_stok_produk_minus false
      - pembulatan_saran_harga 500
      - footer_struk "Terima kasih, selamat menikmati!"
      Jika baris sudah ada, JANGAN timpa nilai yang sudah diubah pengguna (DO NOTHING).
   b. kategori_kas sesuai tabel ERD §4.5:
      - sistem=true: Penjualan, DP Pre-Order, Pelunasan Pre-Order, Pemasukan Bahan Sisa, Pembelian Bahan, Refund Pre-Order, Transfer Masuk, Transfer Keluar
      - sistem=false: Listrik, Gas, Gaji, Sewa, Iklan, Lain-lain (kelompok operasional, keluar)
   c. src/lib/kas/kategori.ts: konstanta nama kategori sistem (KATEGORI_KAS.PENJUALAN, dst.).
      Seed dan kode lain WAJIB memakai konstanta ini, bukan string ketik ulang.

2. src/lib/hpp/konversi-umum.ts — daftar SARAN konversi (tidak disimpan di DB), dipakai UI di langkah 1.3.
   Struktur: { kataKunci: string[], satuan: string, nilaiDasar: string, satuanDasar: 'g'|'ml' }[].
   Isi perkiraan umum:
   - tepung terigu: 1 sdm ≈ 8 g, 1 cup ≈ 125 g
   - gula pasir: 1 sdm ≈ 12,5 g, 1 cup ≈ 200 g
   - gula halus: 1 sdm ≈ 8 g, 1 cup ≈ 120 g
   - mentega/margarin: 1 sdm ≈ 14 g
   - minyak: 1 sdm ≈ 13 g
   - susu cair: 1 sdm = 15 ml, 1 cup = 240 ml
   - coklat bubuk: 1 sdm ≈ 7 g
   - maizena: 1 sdm ≈ 8 g
   - baking powder / soda kue: 1 sdt ≈ 4 g
   - garam: 1 sdt ≈ 6 g
   - vanili bubuk: 1 sdt ≈ 3 g
   - telur: 1 butir ≈ 55 g, 1 kuning ≈ 18 g, 1 putih ≈ 33 g
   Beri komentar: "Perkiraan. Wajib dicek dengan timbangan di dapur Khansa (keputusan K3)."

3. src/db/seed/contoh.ts — data contoh HANYA untuk development (tolak jalan jika NODE_ENV=production):
   - 8 bahan dengan harga realistis:
     tepung terigu, gula pasir, telur (satuan dasar g + konversi butir), mentega, coklat batang, coklat bubuk, keju parut, kemasan cup plastik (pcs)
   - konversi satuan yang relevan
   - 1 resep "Brownies Panggang" (hasil timbang 1.200 g) dengan 7 item
   - 3 produk dari resep itu:
     - Brownies Cup 50 g + kemasan cup
     - Brownies Loyang 20×20 (1.000 g) + topping keju
     - Brownies Bites 25 g
   - stok awal via catatan mutasi stok_awal. Jika lib/stok belum ada, insert langsung ke stok_mutasi + update bahan.stok dan beri TODO untuk diganti di langkah 0.7.

4. Script:
   - db:seed → sistem
   - db:seed:contoh → sistem + contoh
   Keduanya membaca DATABASE_URL_DIRECT.

5. Test integrasi tests/integration/seed.test.ts:
   - seed sistem dijalankan 2x → jumlah kategori_kas tetap
   - pengaturan yang diubah tidak tertimpa seed kedua
   - semua nama di KATEGORI_KAS ada di DB

6. Jalankan pnpm db:seed:contoh ke Supabase dev (jika env sudah terisi).

SELESAI JIKA
Test lulus, seed idempoten, data contoh terlihat di Supabase Table Editor.

LAPORAN AKHIR
Isi data contoh (nama bahan, harga, resep, produk) supaya bisa saya cocokkan nanti dengan perhitungan HPP.
~~~

---

## 0.5 — Autentikasi & otorisasi 🧭🧪👤

Est. 1 hari

**Langkah manual:** di Supabase dev dan prod, buka Authentication → Sign In / Providers → matikan "Allow new users to sign up". Login email tetap aktif.

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md §8 (hak akses) dan F-SET-04, docs/ERD.md §4.6 (pengguna) dan §8.
Ini langkah 0.5: login dan otorisasi.

TUGAS
1. Klien Supabase (hanya untuk AUTH, bukan untuk data):
   - src/lib/supabase/server.ts: createServerClient dari @supabase/ssr dengan cookies() Next.js
   - src/lib/supabase/client.ts: createBrowserClient (dipakai hanya bila perlu)
   - src/lib/supabase/admin.ts: client service role, import 'server-only', untuk invite/create user

2. Middleware (src/middleware.ts) mengikuti pola resmi @supabase/ssr:
   - refresh sesi di setiap request
   - redirect ke /login?next=<path> jika belum login
   - kecualikan: /login, /_next, file statis, /manifest.webmanifest, /sw.js, ikon, /offline

3. Migrasi SQL kustom "trigger_pengguna_baru": fungsi public.tangani_pengguna_baru()
   - SECURITY DEFINER, SET search_path = ''
   - trigger AFTER INSERT ON auth.users
   - insert ke public.pengguna:
     - id
     - email
     - nama = raw_user_meta_data->>'nama' atau bagian sebelum @ dari email
     - peran = 'pemilik' jika belum ada pemilik sama sekali, selain itu ambil raw_user_meta_data->>'peran' bila valid, default 'kasir'
   Pastikan migrasi ini juga jalan di DB test (stub auth.users dari 0.2).

4. src/lib/auth/index.ts (import 'server-only'):
   - getPengguna(): dibungkus React cache()
     - pakai supabase.auth.getUser() (BUKAN getSession) untuk verifikasi token
     - lalu ambil baris pengguna via Drizzle
     - return null jika tidak login atau aktif=false
   - requirePengguna(): untuk halaman → redirect('/login') bila null
   - requirePeran(...peran): untuk halaman → redirect ke /dashboard dengan pesan bila peran tidak sesuai
   - Varian untuk server action: lempar class error TidakBerwenangError / BelumLoginError.
     Error ini nanti diterjemahkan helper aksi() (langkah 0.7) menjadi { ok:false, error:"..." }.
   - Tipe PenggunaAktif { id, nama, email, peran }

5. Halaman /login (src/app/(auth)/login/page.tsx):
   - form email + password (React Hook Form + Zod), tombol tampil/sembunyi password
   - server action masuk(): signInWithPassword
   - pesan error Indonesia ("Email atau password salah", "Terlalu banyak percobaan, coba lagi beberapa menit")
     JANGAN membedakan "email tidak terdaftar" vs "password salah"
   - setelah sukses redirect ke ?next (hanya path internal yang diawali "/", tolak URL eksternal) atau /dashboard
   - tampilan mobile-first, logo/nama toko dari pengaturan_toko
   - link "Lupa password?": resetPasswordForEmail + halaman /login/reset untuk set password baru

6. Server action keluar() dan tombol keluar sementara di halaman /dashboard placeholder
   (halaman berisi "Halo, {nama} ({peran})").

7. scripts/buat-pemilik.ts (pnpm buat-pemilik):
   - membuat user pemilik pertama memakai admin.createUser (email_confirm true, user_metadata { nama })
   - email, nama, dan password DIMINTA INTERAKTIF lewat stdin (password tidak di-echo), tidak lewat argumen CLI
   - tolak jika sudah ada pemilik

8. Test:
   - unit: validasi path ?next (tolak "//evil.com", "https://...", terima "/kasir")
   - integrasi: trigger → user pertama jadi pemilik, user kedua jadi kasir, metadata peran 'pemilik' dihormati hanya jika valid
   - integrasi: requirePeran versi action melempar TidakBerwenangError untuk kasir saat butuh pemilik (mock getPengguna)

SELESAI JIKA
- Saya bisa menjalankan pnpm buat-pemilik, login di /login, melihat nama saya di /dashboard, dan keluar
- Akses /dashboard tanpa login → diarahkan ke /login
- Semua test lulus

LAPORAN AKHIR
Langkah yang harus saya lakukan untuk mencoba, dan pengaturan Supabase Auth yang perlu dicek (URL redirect untuk reset password).
~~~

---

## 0.6 — Layout aplikasi & navigasi per peran 🧪

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md §8 (hak akses) dan §9 (perangkat), docs/PLAN.md §3.
Ini langkah 0.6: kerangka tampilan aplikasi.

TUGAS
1. src/config/navigasi.ts — satu sumber kebenaran menu:
   { href, label, ikon (lucide), peran: ('pemilik'|'kasir')[], grup, tampilDiBottomNav: boolean }

   Menu:
   - Dashboard (semua)
   - Kasir (semua)
   - Penjualan (semua)
   - Pre-Order (semua)
   - Produksi (semua)
   - Pembelian (semua)
   - Bahan, Supplier, Resep, Produk, Stok (pemilik)
   - Keuangan, Laporan (pemilik)
   - Pengaturan (pemilik)

   Fungsi menuUntuk(peran) + unit test.

2. src/app/(app)/layout.tsx (server component):
   - panggil requirePengguna()
   - ambil pengaturan_toko (nama toko)
   - render AppShell

3. AppShell (client component kecil, server tetap mengirim data):
   - Layar < lg: header atas (nama toko, menu pengguna) + bottom navigation 5 ikon:
     Dashboard, Kasir, Pre-Order, Produksi, "Lainnya" (membuka Sheet berisi sisa menu sesuai peran)
   - Layar ≥ lg: sidebar kiri yang bisa diciutkan + header
   - Menu aktif ditandai
   - Target sentuh minimal 44×44 px
   - Menu pengguna: nama, peran, tombol Keluar
   - Toaster (sonner) dipasang sekali di layout

4. Halaman placeholder untuk SETIAP menu:
   - judul + teks "Segera hadir"
   - masing-masing memanggil requirePeran sesuai config navigasi (kasir yang mengetik URL /laporan langsung harus ditolak)

5. Komponen bersama di src/components/:
   - PageHeader (judul, deskripsi, slot aksi)
   - EmptyState (ikon, judul, deskripsi, aksi)
   - LoadingSkeleton
   - ConfirmDialog
   - RupiahText (memakai formatRupiah — buat versi sementara jika lib/format belum ada; diganti di 0.7)

6. src/app/(app)/loading.tsx dan error.tsx (pesan Indonesia + tombol "Coba lagi").
   not-found.tsx global.

7. Tema: warna utama hangat (cokelat/krem, cocok toko kue) lewat CSS variables shadcn. Kontras teks minimal WCAG AA.

8. Test:
   - unit menuUntuk(): kasir tidak mendapat Bahan/Resep/Produk/Keuangan/Laporan/Pengaturan
   - e2e (opsional di langkah ini): skip dulu, dikerjakan di 4.1

SELESAI JIKA
- Login sebagai pemilik → semua menu terlihat
- Buat user kasir lewat Supabase dashboard dengan metadata { "peran": "kasir" } → menu terbatas, dan URL /laporan ditolak
- Tampilan rapi di lebar 360 px dan 1280 px

LAPORAN AKHIR
Screenshot tidak perlu. Jelaskan cara saya mencoba sebagai kasir.
~~~

---

## 0.7 — Utilitas inti: format, angka, nomor, stok, kas, audit, aksi 🧭🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md §7 (aturan hitung, terutama 7.9 dan 7.10), docs/ERD.md §1, §4.3 (stok_mutasi), §4.5 (kas), §4.6 (nomor_urut, audit_log), §7.
Ini langkah 0.7: fungsi inti yang akan dipakai semua modul. Kerjakan dengan TDD: test dulu, lalu implementasi.

TUGAS
1. src/lib/angka.ts:
   - Decimal.set({ precision: 30, rounding: ROUND_HALF_UP })
   - D(x: string | number | Decimal): Decimal
   - keNumeric(d, skala): string untuk disimpan ke kolom numeric
   - bulatRupiah(d): number integer (half up)
   - bulatKeAtas(d, kelipatan): number
   - isNol, isNegatif, dll. seperlunya

2. src/lib/format.ts:
   - formatRupiah(15000) → "Rp15.000"; negatif → "-Rp15.000"
   - formatRupiahDesimal("13.5", 2) → "Rp13,50"
   - formatAngka("1200.500") → "1.200,5"
   - formatTakaran("36", "g") → "36 g"
   - parseRupiah("15.000") → 15000; terima "15000", "Rp 15.000"; tolak input tidak valid
   - formatTanggal(date) → "3 Nov 2026" (WIB)
   - formatWaktu(date) → "3 Nov 2026 14.05" (WIB)
   - rentangHariWib(tanggal: "YYYY-MM-DD") → { mulai: Date UTC, selesai: Date UTC }
   - hariIniWib() → "YYYY-MM-DD"
   Pakai Intl/date-fns + @date-fns/tz. Test harus mencakup jam 00.30 WIB (masih tanggal sebelumnya di UTC).

3. src/lib/nomor.ts — ambilNomor(tx, prefix: 'NT'|'PB'|'PR'|'PO'|'INV'): Promise<string>
   - upsert ke nomor_urut seperti SQL di ERD §4.6, tanggal WIB
   - format PREFIX-YYMMDD-NNN (3 digit, lanjut 4 digit bila > 999)
   - test integrasi: 20 transaksi paralel mendapat nomor unik 001–020 tanpa celah; prefix berbeda punya urutan sendiri; hari berbeda reset ke 001

4. src/lib/stok/index.ts — catatMutasi(tx, input):
   Input:
   {
     jenis,
     target: { bahanId } | { produkId },
     qty: Decimal | string (bertanda),
     nilaiSatuan,
     alasan?,
     sumberTipe,
     sumberId,
     dibuatOleh,
     izinkanMinus: boolean
   }
   Alur:
   a. SELECT stok … FOR UPDATE pada baris bahan/produk
   b. saldoBaru = stok + qty
   c. jika saldoBaru < 0 dan !izinkanMinus → lempar StokTidakCukupError { nama, stok, diminta }
   d. untuk produk: qty wajib bilangan bulat
   e. UPDATE stok cache
   f. INSERT stok_mutasi dengan saldo_sesudah
   g. return { saldoSesudah, menjadiMinus: boolean }
   Tambahkan juga: hitungUlangSaldo(tx, target) yang mengembalikan Σ qty dari stok_mutasi (untuk rekonsiliasi).
   Test integrasi:
   - saldo benar setelah beberapa mutasi
   - error saat minus dilarang
   - minus diizinkan menandai menjadiMinus
   - rollback: jika transaksi luar melempar error setelah catatMutasi, stok dan mutasi kembali seperti semula
   - dua transaksi paralel mengurangi stok yang sama tidak saling menimpa
   - qty pecahan untuk produk ditolak

5. src/lib/kas/index.ts:
   - catatKas(tx, { kategori: nama dari KATEGORI_KAS atau id, akun, nominal (int > 0), keterangan, sumberTipe?, sumberId?, dibuatOleh, waktu? })
     validasi jenis kas mengikuti jenis kategori
   - akunDariMetode(metode): tunai → 'tunai'; transfer/qris → 'rekening'
   - batalkanKasDariSumber(tx, sumberTipe, sumberId): set dibatalkan = true, return jumlah baris
   - saldoAkun(db, akun?)
   Test integrasi untuk semua fungsi, termasuk kas dibatalkan tidak dihitung di saldo.

6. src/lib/audit.ts — catatAudit(tx, { penggunaId, tabel, recordId, aksi, dataLama?, dataBaru? }).
   Simpan hanya field yang berubah bila update.

7. src/lib/aksi.ts — helper pembungkus server action:
   aksi({ schema: ZodSchema, peran?: Peran[], jalankan: async (input, pengguna) => T })
   → fungsi (input: unknown) => Promise<HasilAksi<T>>
   - parse Zod → fieldErrors bahasa Indonesia
   - cek login & peran
   - tangkap error yang dikenal (StokTidakCukupError, TidakBerwenangError, BelumLoginError, unique violation 23505 → "Data dengan nama ini sudah ada", FK violation 23503 → "Data masih dipakai di tempat lain") → pesan ramah
   - error lain: catat ke logger server (src/lib/log.ts, tanpa console.log mentah di kode fitur) dan kembalikan "Terjadi kesalahan, coba lagi"
   Buat juga src/lib/zod-id.ts: pesan error Zod berbahasa Indonesia (z.config / errorMap global).

8. Ganti TODO di seed contoh (0.4) dan RupiahText (0.6) agar memakai fungsi baru.

SELESAI JIKA
- Semua test unit dan integrasi lulus
- coverage src/lib ≥ 90%
- pnpm typecheck lulus

LAPORAN AKHIR
Daftar fungsi publik beserta signature-nya. Saya akan memakai ini sebagai referensi di langkah berikutnya, jadi tambahkan juga ringkasannya ke CLAUDE.md bagian "Utilitas inti".
~~~

---

## 0.8 — CI & deploy 👤

Est. 0,5 hari

**Langkah manual:**
1. Buat repo GitHub privat, lalu push.
2. Pilih opsi hosting di [PLAN §7](../PLAN.md#7-hosting--biaya) dan isi `[ISI: A atau B]` di prompt.
3. Isi secrets di GitHub/Vercel/Cloudflare sendiri saat diminta.

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PLAN.md §2, §5, §7.
Ini langkah 0.8: CI dan deploy. Opsi hosting yang dipilih: [ISI: A (Vercel Pro + Supabase) atau B (Cloudflare Workers via OpenNext + Supabase)].

TUGAS
1. .github/workflows/ci.yml — jalan pada push ke semua branch dan pull request:
   - pnpm/action-setup + setup-node dengan cache pnpm
   - service postgres (versi sama dengan docker-compose) untuk test integrasi
   - langkah: install --frozen-lockfile → lint → typecheck → format:check → test (unit, dengan coverage) → test:int → build (SKIP_ENV_VALIDATION=1)
   - upload laporan coverage sebagai artifact
   - concurrency: batalkan run lama di branch yang sama

2. .github/workflows/migrate.yml — menerapkan migrasi ke produksi:
   - hanya dijalankan manual (workflow_dispatch) atau setelah CI sukses di branch main
   - memakai GitHub Environment "production" dengan required reviewer (saya)
   - secret: DATABASE_URL_DIRECT_PROD
   - perintah: pnpm db:migrate lalu pnpm db:seed (seed sistem saja)

3. Deploy:
   - Jika opsi A (Vercel):
     a. tulis docs/deploy.md: hubungkan repo di dashboard Vercel, set env per environment (Preview → Supabase dev, Production → Supabase prod), region sin1
     b. tambahkan vercel.json hanya jika perlu
   - Jika opsi B (Cloudflare):
     a. pasang @opennextjs/cloudflare dan wrangler
     b. buat wrangler.jsonc dengan compatibility_flags ["nodejs_compat"] dan open-next.config.ts
     c. workflow deploy.yml: build OpenNext lalu deploy dengan secret CLOUDFLARE_API_TOKEN dan CLOUDFLARE_ACCOUNT_ID
     d. VERIFIKASI koneksi postgres-js dari Workers (pertimbangkan Cloudflare Hyperdrive). Jika tidak bisa berjalan andal, BERHENTI dan laporkan alternatifnya ke saya, jangan memaksa.
     e. tulis docs/deploy.md
   Untuk kedua opsi: jelaskan di docs/deploy.md env apa saja yang harus diisi, URL redirect Supabase Auth yang perlu ditambahkan (domain produksi + preview), dan cara rollback.

4. Header keamanan di next.config:
   - X-Content-Type-Options nosniff
   - Referrer-Policy strict-origin-when-cross-origin
   - X-Frame-Options DENY
   - Permissions-Policy (camera, mic, geolocation off; bluetooth=self untuk R3)

5. Badge status CI di README.md root. README berisi ringkasan + tautan ke docs/setup.md dan docs/deploy.md.

SELESAI JIKA
- Push ke GitHub → CI hijau
- Aplikasi bisa dibuka di URL produksi/preview dan login berfungsi

LAPORAN AKHIR
Daftar secret/env yang harus saya isi di GitHub dan di platform hosting, beserta urutan langkahnya.
~~~
