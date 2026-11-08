# Rencana Implementasi — Aplikasi Kasir & HPP Toko Kue Khansa

| | |
| --- | --- |
| Versi | 1.0 (draft) |
| Tanggal | 3 November 2026 |
| Tim | 1 developer full-stack |
| Dokumen terkait | [PRD.md](PRD.md) · [ERD.md](ERD.md) · [Prompt per langkah](prompts/README.md) |

---

## 1. Ringkasan

| Fase | Isi | Durasi | Hasil |
| --- | --- | --- | --- |
| 0 | Fondasi proyek | 1 minggu | Login, kerangka aplikasi, CI, deploy |
| 1 | Master bahan, resep, produk & HPP | 2,5 minggu | **Gerbang 1:** HPP cocok dengan hitungan Khansa |
| 2 | Pembelian, stok, produksi, kasir | 2,5–3 minggu | **Gerbang 2:** uji coba di toko → **MVP go-live** |
| 3 | Pre-order, invoice, keuangan, laporan | 3 minggu | **Gerbang 3:** tutup buku 1 bulan dari aplikasi |
| 4 | Penguatan, pelatihan, serah terima | 1–2 minggu | Rilis v1.0 |
| R3 | Opsional: offline, ESC/POS Bluetooth, push | +2–4 minggu | Sesuai kebutuhan |

**Total inti: ±10–12 minggu.** Khansa sudah bisa memakai HPP di minggu ke-4 dan kasir di minggu ke-7.

Satuan estimasi per tugas: **h = hari kerja**, 1 minggu = 5 hari kerja. Estimasi sudah termasuk menulis test. Waktu tunggu gerbang (misal uji coba 3 hari, tutup buku 1 bulan) berjalan paralel dengan fase berikutnya yang tidak bergantung padanya.

Estimasi ini lebih panjang dari 7–9 minggu di spesifikasi awal, karena memasukkan:
- produksi multi-produk
- pembatalan dengan pembalik stok/kas
- test otomatis
- satu minggu penguatan sebelum serah terima

Setiap gerbang adalah titik uji bersama Khansa. Fase berikutnya baru dimulai setelah gerbang lolos.

## 2. Keputusan teknis

Mengikuti stack di spesifikasi, dengan koreksi berikut.

| Area | Keputusan | Alasan |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript strict | Sesuai spesifikasi |
| UI | Tailwind CSS + shadcn/ui, mobile-first | Sesuai spesifikasi |
| Database | Supabase Postgres | Sesuai spesifikasi |
| Akses data | **Drizzle di server saja**, koneksi langsung (pooler mode transaksi) | Satu jalur akses, transaksi DB penuh |
| Otorisasi | **Dicek di server** (`requirePeran`) per server action/route. RLS aktif deny-all di semua tabel | Drizzle melewati RLS. RLS deny-all menutup akses langsung lewat anon key (ERD §8) |
| Data sensitif kasir | DTO terpisah tanpa HPP/harga bahan/laba | RLS tidak bisa membatasi kolom |
| Operasi stok/kas | `db.transaction()` + `SELECT … FOR UPDATE` pada baris stok | Mencegah data setengah tersimpan dan race condition |
| Angka desimal | `decimal.js` di `lib/hpp`. Postgres `numeric` dibaca sebagai string | Hindari galat float JavaScript |
| Mutasi data | Server Actions + Zod (schema dipakai bersama di form) | Validasi sama di client & server |
| Data fetching | Server Components untuk halaman umum. TanStack Query hanya di kasir & PO | Kurangi kompleksitas |
| Form | React Hook Form + Zod | Sesuai spesifikasi |
| Grafik | Recharts | Sesuai spesifikasi |
| Struk | Halaman `/cetak/struk/[id]` dengan CSS `@page` 58/80 mm + `window.print()` | Jalan di semua perangkat termasuk iPhone |
| Invoice | `@react-pdf/renderer` di route handler server | PDF konsisten |
| Ekspor Excel | `exceljs` | Format rupiah & lebar kolom rapi |
| PWA | Serwist: manifest + cache app shell saja di MVP | Offline penuh ditunda ke R3 |
| Waktu | Simpan `timestamptz` (UTC). Tampilkan & kelompokkan per hari di Asia/Jakarta | Laporan harian tidak meleset di jam 00–07 |
| Package manager | pnpm | |
| Test | Vitest (unit + integrasi DB), Playwright (E2E) | |
| CI | GitHub Actions: typecheck, lint, test, build | |

## 3. Struktur folder

```
tokokue/
├── docs/                      PRD, ERD, PLAN
├── drizzle/                   file migrasi SQL (hasil drizzle-kit)
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (app)/             layout dengan navigasi per peran
│   │   │   ├── dashboard/
│   │   │   ├── bahan/  supplier/  pembelian/  stok/
│   │   │   ├── resep/  produk/  produksi/
│   │   │   ├── kasir/  penjualan/
│   │   │   ├── pre-order/  invoice/
│   │   │   ├── keuangan/  laporan/
│   │   │   └── pengaturan/
│   │   ├── cetak/struk/[id]/  halaman cetak tanpa layout
│   │   └── api/               route handler: PDF invoice, ekspor xlsx
│   ├── db/
│   │   ├── schema/            satu file per domain (master, resep, stok, penjualan, po, kas, sistem)
│   │   ├── client.ts
│   │   └── seed.ts            kategori kas sistem, pengaturan, konversi umum
│   ├── lib/
│   │   ├── hpp/               fungsi murni: konversi, biaya adonan, HPP, margin, skala, harga rata-rata
│   │   ├── stok/              catatMutasi() — satu-satunya jalan mengubah stok
│   │   ├── kas/               catatKas()
│   │   ├── auth/              getPengguna(), requirePeran()
│   │   ├── nomor.ts           ambilNomor(prefix)
│   │   ├── audit.ts
│   │   └── format.ts          rupiah, tanggal WIB, satuan
│   ├── features/<modul>/
│   │   ├── actions.ts         server actions (mutasi)
│   │   ├── queries.ts         query baca
│   │   ├── schemas.ts         Zod
│   │   └── components/
│   └── components/ui/         shadcn
├── tests/
│   ├── integration/           server actions vs Postgres nyata
│   └── e2e/                   Playwright
└── .github/workflows/         ci.yml, backup.yml
```

**Aturan arsitektur:**
- Stok **hanya** boleh diubah lewat `lib/stok/catatMutasi()`.
- Kas **hanya** boleh diubah lewat `lib/kas/catatKas()`.
- Keduanya menerima objek transaksi (`tx`) agar selalu berjalan di dalam transaksi pemanggil.

## 4. Rincian fase

Kode di kurung merujuk ke ID kebutuhan di [PRD §6](PRD.md#6-kebutuhan-fungsional).

### Fase 0 — Fondasi (1 minggu)

| # | Tugas | Est. |
| --- | --- | --- |
| 0.1 | Init repo: Next.js, TS strict, Tailwind, shadcn, ESLint, Prettier, Vitest, Playwright | 0,5 h |
| 0.2 | Proyek Supabase `dev` dan `prod`. Env vars + validasi env saat startup (Zod) | 0,5 h |
| 0.3 | Schema Drizzle **semua tabel** (ERD), migrasi pertama, RLS deny-all di semua tabel | 1,5 h |
| 0.4 | Seed: pengaturan toko, kategori kas sistem, daftar konversi umum | 0,5 h |
| 0.5 | Auth: login email/password, trigger buat `pengguna`, `requirePeran`, middleware sesi | 1 h |
| 0.6 | Layout mobile-first: bottom nav (HP) / sidebar (laptop), menu sesuai peran | 0,5 h |
| 0.7 | Utilitas: `ambilNomor`, `catatMutasi`, `catatKas`, `audit`, `format` + test | 1 h |
| 0.8 | CI GitHub Actions + deploy preview & produksi | 0,5 h |

**Selesai jika:** pemilik bisa login di HP; CI hijau; test integrasi bisa jalan ke database test.

### Fase 1 — Master & HPP (2 minggu)

| # | Tugas | PRD | Est. |
| --- | --- | --- | --- |
| 1.1 | `lib/hpp`: konversi, harga dari kemasan, biaya adonan, HPP + rincian, overhead 3 metode, margin, saran harga, pcs per resep, skala loyang. **TDD, coverage 100%** | §7.1–7.6 | 2 h |
| 1.2 | Bahan: daftar (cari, filter kategori, badge stok), form, input harga "per kemasan", kunci satuan dasar | F-BHN-01, 02, 04 | 1,5 h |
| 1.3 | Konversi satuan per bahan (dialog di halaman bahan) | F-BHN-03 | 0,5 h |
| 1.4 | Supplier CRUD sederhana | F-SUP-01 | 0,5 h |
| 1.5 | Resep: form item dinamis dengan pilihan satuan per bahan, hasil otomatis/timbang, biaya total & per gram live | F-RSP-01–03 | 2 h |
| 1.6 | Duplikat resep + kalkulator skala (tampilan) | F-RSP-04, 05 | 1 h |
| 1.7 | Produk: form + upload foto + komponen (adonan/bahan + peran) | F-PRD-01, 02 | 1,5 h |
| 1.8 | Halaman detail produk: rincian HPP, margin, saran harga, pcs per resep | F-PRD-03–05 | 1 h |
| 1.9 | Biaya tambahan/overhead | F-PRD-06 | 0,5 h |
| 1.9b | Master add-on: skema `add_on` + item add-on, `lib/hpp/add-on.ts` (TDD), CRUD + HPP & margin add-on | F-ADD-01 | 1 h |
| 1.10 | Simulasi kenaikan harga bahan | F-PRD-07 | 0,5 h |
| 1.11 | Impor data awal dari template Excel (bahan, konversi, resep, produk) | — | 1 h |

**Gerbang 1 — HPP akurat**
- [ ] Data awal Khansa sudah masuk.
- [ ] 5 produk acuan: selisih HPP aplikasi vs hitungan Khansa ≤ Rp1/pcs. Jika ada selisih, penyebabnya ditemukan (salah data atau salah rumus) dan diperbaiki.
- [ ] Khansa bisa menambah 1 resep dan 1 produk baru sendiri tanpa bantuan.

### Fase 2 — Operasional harian (2,5 minggu)

| # | Tugas | PRD | Est. |
| --- | --- | --- | --- |
| 2.1 | Pembelian multi-item: stok +, harga rata-rata/terakhir, riwayat harga, kas keluar. Satu transaksi | F-STK-01 | 1,5 h |
| 2.2 | Pembatalan pembelian (pembalik stok & kas) | F-STK-01 KP3 | 0,5 h |
| 2.3 | Kartu stok per bahan & per produk | F-STK-02 | 1 h |
| 2.4 | Penyesuaian stok dengan alasan wajib | F-STK-03 | 0,5 h |
| 2.5 | Produksi: pilih resep + skala + beberapa produk, validasi gram, selesaikan → mutasi bahan & produk, HPP rencana vs aktual, alokasi biaya adonan | F-PRO-01–04, §7.7 | 2,5 h |
| 2.6 | Kasir: grid produk, cari, keranjang, diskon item & nota, add-on per item (harga bisa diubah), bayar tunai/transfer/QRIS, simpan (stok produk & bahan add-on −, HPP snapshot, kas +) | F-POS-01–04, F-ADD-02, 03 | 3,5 h |
| 2.7 | Struk thermal 58/80 mm + link WhatsApp (termasuk add-on) | F-POS-05, 06, F-ADD-04 | 1 h |
| 2.8 | Riwayat penjualan + pembatalan pemilik (stok bahan add-on kembali) | F-POS-07, 08, F-ADD-04 | 1 h |
| 2.9 | Dashboard dasar: omzet & laba hari ini, stok menipis/minus, margin di bawah target | F-DSH-01, 02, 04 | 1 h |
| 2.10 | Laporan harian | F-LAP-01 | 0,5 h |
| 2.11 | Pengaturan toko & parameter hitung | F-SET-01, 02 | 0,5 h |
| 2.12 | PWA: manifest, ikon, install prompt, cache app shell | — | 0,5 h |

**Gerbang 2 — Uji coba di toko (3 hari)**
- [ ] Toko memakai aplikasi paralel dengan cara lama selama 3 hari.
- [ ] Total kas per metode bayar di aplikasi = hitungan fisik/rekening.
- [ ] Stok produk jadi di aplikasi = hitungan fisik di akhir hari.
- [ ] Struk tercetak di printer toko.
- [ ] Tidak ada bug P0 terbuka.
- [ ] → **MVP go-live:** cara lama dihentikan untuk HPP, stok, dan kasir.

### Fase 3 — Pesanan & pembukuan (3 minggu)

| # | Tugas | PRD | Est. |
| --- | --- | --- | --- |
| 3.1 | Pre-order: form, item + catatan kue + add-on, alur status, validasi transisi | F-PO-01, 03, F-ADD-05 | 2 h |
| 3.2 | Pembayaran PO (DP, pelunasan, refund) → kas | F-PO-02, 07 | 1 h |
| 3.3 | Diambil & lunas → penjualan otomatis, add-on ikut (tanpa kas ganda) | F-PO-06, F-ADD-05 | 1 h |
| 3.4 | Kalender/daftar PO + kartu PO di dashboard | F-PO-04, F-DSH-03 | 1 h |
| 3.5 | Rekap kebutuhan bahan per tanggal ambil vs stok (termasuk bahan add-on) | F-PO-05, F-ADD-05 | 1 h |
| 3.6 | Invoice PDF + bagikan (Web Share API / unduh) | F-INV-01–03 | 1,5 h |
| 3.7 | Keuangan: kas manual, kategori, pemasukan bahan sisa, transfer antar akun, saldo per akun | F-KEU-01–05 | 2 h |
| 3.8 | Laporan periode: laba rugi, produk terlaris & paling untung, pemakaian bahan, nilai stok | F-LAP-02–04 | 2 h |
| 3.9 | Ekspor Excel & PDF laba rugi | F-LAP-05 | 1 h |
| 3.10 | Stock opname + grafik riwayat harga | F-STK-04, 05 | 1,5 h |
| 3.11 | Manajemen pengguna (undang, peran, nonaktif) + halaman audit log | F-SET-03, 05 | 1 h |
| 3.12 | Backup otomatis harian + ekspor data manual | F-SET-06, NFR | 0,5 h |

**Gerbang 3 — Tutup buku**
- [ ] Laporan laba rugi 1 bulan penuh dari aplikasi disetujui Khansa.
- [ ] Minimal 5 PO berjalan sampai diambil, termasuk 1 yang dibatalkan dengan DP.
- [ ] Opname bulanan pertama selesai, selisih < 5% nilai stok.
- [ ] Restore backup berhasil diuji ke database terpisah.

### Fase 4 — Penguatan & serah terima (1–2 minggu)

| # | Tugas |
| --- | --- |
| 4.1 | Lengkapi E2E untuk alur kritis (§5), perbaiki bug dari gerbang 2–3 |
| 4.2 | Performa: kasir < 2 detik di 4G, indeks query laporan |
| 4.3 | Review keamanan: otorisasi tiap action, DTO kasir, rate limit login, header keamanan |
| 4.4 | Aksesibilitas dasar: kontras, ukuran target sentuh ≥ 44 px, label form |
| 4.5 | Panduan pengguna singkat (PDF bergambar / video layar 10 menit) + sesi pelatihan |
| 4.6 | Dokumen serah terima: akun, env, cara deploy, cara restore backup, biaya bulanan |

### R3 — Opsional (setelah v1.0, berdasarkan kebutuhan)

| Fitur | Syarat | Est. |
| --- | --- | --- |
| Cetak ESC/POS via Web Bluetooth | Printer Bluetooth + HP Android | 1 minggu |
| Mode offline kasir (IndexedDB + antrean sinkron) | Internet toko sering putus (K6) | 2–3 minggu |
| Notifikasi push stok menipis / PO besok | — | 0,5 minggu |
| Tutup kasir harian (setoran vs sistem) | — | 0,5 minggu |

## 5. Strategi pengujian

| Lapisan | Alat | Cakupan | Target |
| --- | --- | --- | --- |
| Unit | Vitest | `lib/hpp`, `lib/format`, Zod schema | 100% `lib/hpp`, ≥ 80% lainnya |
| Integrasi | Vitest + Postgres test (Docker / Supabase CLI lokal) | Setiap server action yang mengubah stok/kas, transaksi rollback saat gagal, invarian ERD §7, otorisasi per peran | Semua action mutasi |
| E2E | Playwright (viewport HP) | Alur kritis di bawah | 6 alur |

**Alur E2E kritis:**
1. Login pemilik & kasir. Kasir tidak bisa membuka halaman HPP/laporan, dan tidak menerima data HPP.
2. Bahan → resep → produk → HPP tampil benar.
3. Pembelian → stok & harga bahan berubah → HPP produk ikut berubah.
4. Produksi → stok bahan turun, stok produk naik.
5. Kasir jual tunai → struk → stok turun → pemilik batalkan → stok & kas kembali.
6. PO: DP → pelunasan → diambil → muncul di penjualan, kas tidak ganda.

**Fixture angka nyata:** contoh perhitungan dari Khansa (Gerbang 1) dijadikan test unit permanen.

## 6. Definition of Done (per tugas)

- [ ] Kriteria penerimaan PRD terpenuhi.
- [ ] Test ditulis lebih dulu untuk logika hitung dan mutasi stok/kas.
- [ ] Typecheck, lint, dan semua test hijau di CI.
- [ ] Otorisasi dicek di server. Kasir tidak menerima data terlarang.
- [ ] Tampilan dicek di lebar 360 px dan 1280 px.
- [ ] Pesan error dalam bahasa Indonesia yang jelas.
- [ ] Tidak ada `console.log`, tidak ada secret di kode.

## 7. Hosting & biaya

> Harga per akhir 2025. Cek ulang sebelum memilih. Kurs asumsi Rp16.500/USD.

| Opsi | Komponen | Biaya/bulan | Catatan |
| --- | --- | --- | --- |
| **A. Standar** | Vercel Pro ($20) + Supabase Pro ($25) | ±Rp750 rb | Paling mudah. Backup harian & PITR Supabase. Pemakaian komersial sesuai ketentuan |
| **B. Hemat** (disarankan untuk mulai) | Supabase Free + Cloudflare Workers (Next.js via OpenNext) + backup `pg_dump` harian via GitHub Actions ke Cloudflare R2 | Rp0–85 rb | Supabase Free di-pause setelah 7 hari tanpa aktivitas (aman jika toko buka tiap hari), batas DB 500 MB (cukup bertahun-tahun). Tanpa PITR |
| C. VPS | VPS 2 GB + Postgres sendiri + Coolify | ±Rp100–200 rb | Murah tapi perlu dirawat (update, keamanan, backup) |

**Catatan:**
- Vercel Hobby (gratis) **tidak** boleh dipakai untuk usaha komersial.
- Domain (`.com` / `.id`) ±Rp150–250 rb/tahun, opsional.
- Pindah dari B ke A cukup ganti tempat deploy dan upgrade paket Supabase. Tidak perlu migrasi data.

**Backup (semua opsi):** workflow `backup.yml` berjalan harian pukul 02.00 WIB:
1. `pg_dump` database.
2. Kompres dan enkripsi.
3. Unggah ke penyimpanan terpisah.
4. Simpan 14 hari terakhir.
5. Uji restore setiap Gerbang 3 dan setiap 3 bulan.

## 8. Sebelum mulai Fase 0

- [ ] Kirim pertanyaan K1–K8 ([PRD §10](PRD.md#10-keputusan-terbuka-perlu-jawaban-khansa)) ke Khansa.
- [ ] Kirim template Excel data awal: bahan, konversi, resep, produk, 5 produk acuan + HPP manual.
- [ ] Sepakati opsi hosting (§7) dan siapa pemilik akun (sebaiknya atas nama Khansa, developer diundang sebagai anggota).
- [ ] Buat repo GitHub privat, proyek Supabase `dev`, dan proyek deploy.
- [ ] Sepakati jadwal gerbang dan cara melapor progres (misal demo singkat tiap akhir minggu).
