# Bukti TDD — Step 0.7 Utilitas Inti

## Sumber

Acceptance criteria berasal dari `docs/prompts/00-fase-0-fondasi.md` bagian 0.7, `docs/PRD.md` §7
(terutama 7.9 dan 7.10), serta `docs/ERD.md` §1, §4.3, §4.5, §4.6, dan §7.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `pnpm typecheck` | Gagal: modul `angka`, `format`, `nomor`, `stok`, `kas`, `audit`, `aksi`, `log`, `zod-id` belum ada; commit `63c6c0d` |
| GREEN | `pnpm test` | 20 file, 140 unit test lulus |
| GREEN | `pnpm test:int` (PostgreSQL 17 Docker) | 12 file, 74 test integrasi lulus |
| Coverage | `vitest run --coverage --coverage.include=src/lib/**` | `src/lib`: statements 97,6%, branch 92,7%, functions 100%, lines 99,3% |
| Regresi | `pnpm test:e2e` | 6 test lulus |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

## Yang dibuktikan test

- **Angka:** `0.1 + 0.2 = 0.3`; half up (`13.5 → 14`, `-1.5 → -2`); tanpa `-0`; `bulatKeAtas(3822.86, 500) = 4000`.
- **Format:** `Rp15.000`, `-Rp15.000`, `Rp13,50`, `1.200,5`, `36 g`. `parseRupiah` menerima `15000`,
  `15.000`, `Rp 15.000`, `15.000,00`, dan menolak `15.00`, `1.5`, `15,5`, negatif, teks.
- **Waktu WIB:** 2 Nov 17.30 UTC tampil `3 Nov 2026 00.30` dan bertanggal `2026-11-03`.
  `rentangHariWib('2026-11-03')` = `2026-11-02T17:00Z` s/d `2026-11-03T17:00Z`. Tanggal mustahil ditolak.
- **Nomor:** 20 transaksi paralel (20 koneksi) mendapat `NT-261103-001` s/d `-020` tanpa celah dan
  duplikat; prefix punya urutan sendiri; hari baru mulai dari 001; nomor dari transaksi yang gagal
  ikut di-rollback; setelah 999 menjadi `-1000`.
- **Stok:** saldo dan `saldo_sesudah` benar setelah beberapa mutasi dan cocok dengan
  `hitungUlangSaldo`; minus dilarang melempar `StokTidakCukupError { nama, stok, diminta }` tanpa
  mengubah data; minus diizinkan menandai `menjadiMinus` (hanya saat melewati nol); rollback
  transaksi luar mengembalikan stok dan mutasi; 5 pengurangan paralel menghasilkan 1000 → 500 dengan
  rantai saldo utuh; stok 250 diperebutkan 5 × 100 → tepat 2 berhasil, 3 ditolak; qty pecahan untuk
  produk, qty nol, dan target fiktif ditolak.
- **Kas:** jenis mengikuti kategori (nama atau id); jenis berbeda ditolak; nominal 0, negatif, dan
  pecahan ditolak; saldo per akun = masuk − keluar; kas dibatalkan keluar dari saldo; pembatalan
  kedua mengembalikan 0.
- **Audit:** update hanya menyimpan field yang berubah; `"15.0000"` vs `"15"` bukan perubahan
  sehingga tidak ada baris; Decimal disimpan sebagai string.
- **aksi():** belum login, peran salah (dicek sebelum validasi), `fieldErrors` Indonesia,
  `_form` untuk error refine, pemetaan `StokTidakCukupError`, `PesanError`, `23505`, `23503`
  (termasuk yang dibungkus `cause` oleh drizzle), error tak dikenal dicatat ke `log.error` tanpa
  membocorkan detail, dan `redirect()` tetap diteruskan.
- **Seed contoh:** stok awal sekarang lewat `catatMutasi`; dijalankan dua kali tetap satu mutasi per
  bahan dan saldo cache = Σ buku besar.

## Catatan implementasi

- Utilitas yang menulis ke DB menerima `tx` dan tidak mengimpor `db`, sehingga bisa dipakai script
  seed (tsx) maupun server action.
- `PesanError` (`src/lib/error.ts`) adalah kelas dasar untuk pesan bisnis yang aman ditampilkan;
  `StokTidakCukupError` turunannya.
- Test lama `trigger-pengguna.test.ts` sekarang memakai `resetData()`. Sebelumnya ia hanya menghapus
  `auth.users`, yang gagal setelah test audit menyisakan baris `audit_log` yang merujuk pengguna.
- Untuk mencapai coverage `src/lib` ≥ 90%, ditambahkan unit test dengan mock untuk kode 0.5 yang
  belum dites: `auth/aksi.ts`, `auth/pengguna.ts`, `requirePengguna`/`requirePeran`, `toko.ts`, dan
  client Supabase.
- `formatRupiahSementara` dihapus; `RupiahText` memakai `formatRupiah` dan menerima `NilaiAngka`.
