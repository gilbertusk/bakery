# Fase 4 — Penguatan & Serah Terima, dan R3 (Opsional)

Urutan Fase 4: 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6

R3 hanya dikerjakan jika dibutuhkan (lihat syarat di masing-masing prompt).

---

## 4.1 — Test E2E alur kritis 🧭👤

Est. 2 hari · Pasang Supabase CLI (`supabase` membutuhkan Docker Desktop).

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PLAN.md §5 (6 alur E2E kritis).
Ini langkah 4.1. Test integrasi memakai Postgres biasa, tetapi E2E butuh Supabase Auth sungguhan, jadi kita memakai Supabase CLI lokal.

TUGAS
1. Supabase lokal untuk E2E:
   - supabase init (folder supabase/)
   - config agar migrasi Drizzle diterapkan ke DB lokal Supabase (script pnpm e2e:siapkan: supabase start → drizzle migrate ke URL lokal → seed sistem → seed data E2E)
   - .env.e2e.example (URL & key lokal Supabase CLI sudah standar, aman di-commit)
2. tests/e2e/fixtures/:
   - pembuat data E2E (pemilik & kasir test via admin API lokal, bahan/resep/produk minimal)
   - helper login via storageState per peran (login sekali per worker, bukan per test)
3. Test (project "mobile" wajib, "desktop" untuk alur 1–2):
   1. Hak akses: kasir tidak melihat menu terlarang; buka /laporan & /produk/[id] langsung → ditolak; respons halaman kasir tidak berisi teks "HPP"
   2. Bahan → resep → produk → HPP tampil sesuai angka yang diharapkan
   3. Pembelian → harga bahan berubah → HPP produk berubah
   4. Produksi draft → selesai → stok bahan turun & stok produk naik
   5. Kasir jual tunai → struk tampil → stok turun → pemilik batalkan → stok & kas kembali
   6. PO: buat → DP → status siap → lunasi → diambil → muncul di /penjualan; saldo kas = total PO (tidak ganda)
   Gunakan locator berbasis role/label (getByRole, getByLabel), bukan selector CSS rapuh. Tambahkan aria-label di komponen yang belum punya.
4. CI: job e2e terpisah di ci.yml:
   - supabase/setup-cli → supabase start → e2e:siapkan → playwright (mobile + desktop)
   - upload trace/video saat gagal
   - boleh hanya jalan di branch main & PR ke main
5. Perbaiki bug yang ditemukan test (ikuti alur U2: test gagal dulu, lalu perbaikan minimal).

SELESAI JIKA
6 alur lulus stabil 3 kali berturut-turut secara lokal dan di CI.
~~~

---

## 4.2 — Performa

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md §9 (kasir siap < 2 detik di 4G, simpan transaksi < 1 detik).
Ini langkah 4.2. Ukur dulu, baru optimasi. Jangan mengoptimasi tanpa angka.

TUGAS
1. Pengukuran awal (catat di docs/performa.md):
   - Lighthouse mobile (throttling 4G) untuk /kasir, /dashboard, /produk, /laporan: LCP, INP, CLS, ukuran JS
   - waktu server action simpanPenjualanKasir dan selesaikanProduksi (log durasi di server dengan data seed realistis: 150 bahan, 30 resep, 80 produk, 5.000 penjualan)
   - query lambat: aktifkan pg_stat_statements di Supabase dev atau EXPLAIN ANALYZE untuk query laporan & hppSemuaProduk
2. Script pnpm seed:beban untuk membuat data realistis di atas (dev saja).
3. Optimasi sesuai temuan, misalnya:
   - indeks yang hilang (buat migrasi)
   - query N+1
   - komponen client yang terlalu besar (dynamic import Recharts/react-pdf)
   - next/image untuk foto produk dengan ukuran tepat
   - cache ambilPengaturan
   - React Query prefetch di kasir
   - jika hppSemuaProduk > 300 ms pada 80 produk: pertimbangkan materialized view v_hpp_produk (ERD §6) — jika ya, gunakan prompt U4 dulu
4. Ukur ulang dan catat sebelum/sesudah di docs/performa.md.

SELESAI JIKA
/kasir LCP < 2 detik (mobile 4G simulasi), simpan transaksi < 1 detik p95 di Supabase dev, laporan bulanan < 2 detik.
~~~

---

## 4.3 — Review & pengerasan keamanan 🧭

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/ERD.md §8, docs/PRD.md §8 dan §9 (keamanan).
Ini langkah 4.3. Jalankan review keamanan menyeluruh (gunakan agent security-reviewer jika tersedia), lalu perbaiki.

TUGAS
1. Inventaris: buat tabel semua server action & route handler → peran yang diizinkan → apakah diuji.
   Simpan di docs/keamanan.md. Setiap action tanpa test otorisasi → tambahkan test.
2. Uji kebocoran data kasir secara otomatis: test integrasi yang memanggil semua query/action yang boleh diakses kasir dengan sesi kasir, lalu memastikan JSON hasilnya tidak mengandung kunci: hpp, hppSatuan, hargaPerSatuan, biaya*, laba*, margin*.
3. Periksa:
   - validasi Zod pada SEMUA input termasuk params URL & searchParams
   - tidak ada sql.raw dengan input pengguna
   - upload file divalidasi di server (tipe dari magic bytes, bukan hanya ekstensi)
   - cookie sesi Supabase (httpOnly, secure, sameSite)
   - redirect ?next aman
   - rate limit login (Supabase Auth) — dokumentasikan nilainya
   - rate limit sederhana untuk action sensitif (impor, ekspor, undang pengguna) per pengguna
   - header keamanan + Content-Security-Policy (mulai report-only, lalu enforce setelah dipastikan tidak merusak)
   - dependensi: pnpm audit, perbarui yang rentan
   - secret scanning riwayat git (gitleaks)
   - RLS test masih lulus untuk semua tabel
4. Laporkan temuan per tingkat (CRITICAL/HIGH/MEDIUM/LOW). Perbaiki CRITICAL & HIGH, tulis test untuk masing-masing.

SELESAI JIKA
Tidak ada temuan CRITICAL/HIGH terbuka. docs/keamanan.md lengkap.
~~~

---

## 4.4 — Aksesibilitas & kerapian UI

Est. 0,5–1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md dan docs/PRD.md §9.
Ini langkah 4.4. Target WCAG 2.2 AA untuk halaman utama: login, dashboard, kasir, produk, resep, pembelian, produksi, pre-order, keuangan, laporan.

TUGAS
1. Pasang @axe-core/playwright; tambahkan test e2e yang menjalankan axe di halaman-halaman di atas (mobile & desktop). Tidak boleh ada pelanggaran serious/critical.
2. Periksa manual & perbaiki:
   - kontras warna tema (termasuk badge status & teks kecil)
   - target sentuh ≥ 44 px
   - fokus terlihat saat navigasi keyboard
   - urutan tab logis di form panjang (resep, produk, kasir)
   - label untuk semua input (termasuk InputRupiah & combobox)
   - pesan error terhubung ke input (aria-describedby)
   - dialog mengunci fokus & bisa ditutup Esc
   - ikon tanpa teks punya aria-label
   - tabel punya header
   - status perubahan penting diumumkan (aria-live untuk total keranjang & toast)
3. Konsistensi UI:
   - istilah sama di seluruh aplikasi (buat daftar istilah di docs/panduan/istilah.md)
   - format Rupiah/tanggal seragam
   - semua halaman kosong punya EmptyState
   - semua aksi destruktif memakai ConfirmDialog
4. Uji di lebar 360 px, 768 px, 1280 px dan mode zoom 200%.

SELESAI JIKA
Test axe lulus, checklist manual di atas terpenuhi.
~~~

---

## 4.5 — Panduan pengguna & materi pelatihan

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md dan docs/PRD.md (seluruh §6) untuk memahami fitur.
Ini langkah 4.5: dokumentasi untuk Khansa dan kasir. Pembaca bukan orang teknis.

TUGAS
1. Script Playwright scripts/tangkap-layar.ts:
   - mengambil screenshot halaman-halaman utama dengan data contoh (viewport HP)
   - simpan ke docs/panduan/gambar/
2. Tulis panduan di docs/panduan/ (bahasa Indonesia sederhana, kalimat pendek, langkah bernomor, 1 gambar per langkah penting):
   - 00-mulai.md: login, memasang aplikasi di HP, menu
   - 01-bahan-dan-harga.md: tambah bahan, harga per kemasan, konversi sendok
   - 02-resep-dan-produk.md: resep adonan, produk per cetakan, membaca HPP & margin, saran harga, simulasi
   - 03-belanja-dan-stok.md: catat pembelian, penyesuaian, opname
   - 04-produksi.md
   - 05-kasir.md (khusus kasir, maks 2 halaman): jual, diskon, bayar, cetak struk, kirim WA
   - 06-pre-order-dan-invoice.md
   - 07-keuangan-dan-laporan.md: catat biaya, saldo kas, membaca laba rugi, ekspor
   - 08-pengaturan-dan-pengguna.md
   - 09-tanya-jawab.md: 15 pertanyaan umum (mis. "HPP saya berubah sendiri?", "stok bahan minus?", "salah input nota?")
   - rutinitas.md: harian (kasir, cek kas), mingguan (pembelian, PO), bulanan (opname, laporan, cek backup)
3. Gabungkan menjadi PDF panduan (react-pdf atau md-to-pdf) di docs/panduan/Panduan-Toko-Kue.pdf.
4. Buat docs/panduan/naskah-pelatihan.md: agenda sesi 90 menit + latihan praktik dengan data contoh + checklist "sudah bisa".

SELESAI JIKA
Panduan lengkap dengan gambar, PDF siap dikirim ke Khansa.
~~~

---

## 4.6 — Serah terima

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/setup.md, docs/deploy.md, docs/backup-restore.md, docs/PLAN.md §7.
Ini langkah 4.6: dokumen serah terima v1.0.

TUGAS
1. docs/serah-terima.md:
   - daftar akun & layanan beserta pemiliknya: GitHub, Supabase dev/prod, hosting, penyimpanan backup, domain
     (HANYA nama layanan & email pemilik akun, TANPA password/key)
   - daftar environment variable dan di mana disimpan
   - biaya bulanan per layanan dan tanggal tagihan
   - cara deploy versi baru dan rollback
   - cara restore backup + jadwal uji restore
   - cara menambah pengguna & reset password
   - batasan yang diketahui di v1 (mis. afkir tidak masuk laba, tanpa mode offline, Bluetooth printer belum didukung)
   - backlog R3 dan permintaan yang muncul selama uji coba
   - kontak & masa garansi perbaikan bug [ISI: sesuai kesepakatan]
2. CHANGELOG.md untuk v1.0.0 (ringkasan fitur per modul).
3. Tag git v1.0.0 (beri tahu saya perintahnya, jangan push tag tanpa persetujuan).
4. Checklist akhir:
   - CI hijau
   - E2E lulus
   - cekIntegritas produksi bersih
   - backup terakhir < 24 jam
   - uji restore pernah sukses
   - semua akun sudah dipindahkan/diundang atas nama Khansa

SELESAI JIKA
Dokumen serah terima lengkap dan checklist akhir terpenuhi.
~~~

---

# R3 — Fitur Opsional

## R3.1 — Cetak ESC/POS via Web Bluetooth 🧭👤

Syarat: printer thermal Bluetooth + HP Android (Chrome). Tidak didukung di iPhone.

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-POS-09, keputusan K5.
Printer: [ISI: merek/model printer, 58 atau 80 mm]. Perangkat: Android + Chrome.
Ini langkah R3.1.

TUGAS
1. src/features/struk/escpos.ts (murni, unit test): ubah dataStruk/teksStruk menjadi Uint8Array perintah ESC/POS:
   - init, align, bold, double-size untuk total, line feed, cut (jika didukung)
   - logo bitmap opsional (raster GS v 0) dari logo hitam-putih yang diperkecil
   - codepage untuk karakter Latin
2. src/features/struk/bluetooth.ts (client):
   - deteksi dukungan navigator.bluetooth (sembunyikan fitur jika tidak ada)
   - requestDevice dengan filter service UUID umum printer thermal (sediakan daftar yang bisa diatur dan fallback acceptAllDevices + optionalServices)
   - cari characteristic writable
   - kirim data dalam potongan ≤ 180 byte dengan jeda kecil
   - simpan perangkat terpilih (getDevices jika tersedia) agar tidak perlu memilih ulang
   - error yang jelas ("Printer tidak ditemukan", "Bluetooth mati")
3. Pengaturan:
   - pilihan "Metode cetak: Dialog cetak / Bluetooth langsung" (per perangkat, simpan di localStorage)
   - tombol "Tes cetak"
4. Tombol Cetak Struk di kasir & detail penjualan memakai metode yang dipilih, fallback ke dialog cetak bila gagal.
5. Permissions-Policy bluetooth=(self) sudah diset di 0.8 — verifikasi.

SELESAI JIKA
Struk tercetak langsung ke printer Khansa dari HP Android tanpa dialog cetak, dalam < 3 detik.
~~~

---

## R3.2 — Mode offline kasir 🧭

Syarat: internet toko sering putus (keputusan K6). Est. 2–3 minggu. **Pecah menjadi beberapa sesi** sesuai bagian A–D di bawah.

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-POS-10, docs/ERD.md (penjualan.kunci_idempoten), docs/PLAN.md §2 (PWA).
Ini langkah R3.2 bagian [ISI: A/B/C/D]. Kerjakan HANYA bagian tersebut.

DESAIN (berlaku untuk semua bagian — tulis dulu di docs/offline.md saat bagian A)
- Hanya KASIR yang bisa offline. Modul lain tetap butuh internet.
- Data lokal di IndexedDB (Dexie):
  - katalog produk kasir (DTO tanpa HPP) + harga + stok terakhir + waktu sinkron
  - antrean penjualan tertunda
- Penjualan offline:
  - disimpan lokal dengan kunci_idempoten & nomor sementara "OFF-<perangkat>-<urut>"
  - struk bertanda "MENUNGGU SINKRON"
- Sinkron saat online:
  - kirim antrean berurutan ke simpanPenjualanKasir (idempoten)
  - server memberi nomor NT asli
  - gagal karena stok/harga → tandai "perlu ditinjau", JANGAN dibuang
- Konflik stok: offline tidak bisa menjamin stok. Pengaturan izinkan minus berlaku saat sinkron; jika dilarang, transaksi masuk daftar tinjau pemilik.
- Harga: server memakai harga saat transaksi offline terjadi (kirim harga & waktu; server memvalidasi harga tersebut pernah berlaku ≤ 24 jam terakhir, jika tidak → tinjau).

BAGIAN
A. Desain + penyimpanan lokal Dexie + sinkron katalog (unduh saat online, tampil saat offline) + indikator status online/offline/jumlah antrean.
B. Simpan penjualan offline + struk sementara + antrean.
C. Mesin sinkron:
   - Background Sync API jika didukung, fallback saat aplikasi dibuka / online event
   - retry dengan backoff
   - halaman "Transaksi tertunda"
   - perubahan server untuk menerima waktu & harga asli + validasinya
D. Halaman tinjau pemilik untuk transaksi gagal sinkron + test E2E skenario offline (Playwright context.setOffline).

SELESAI JIKA (untuk keseluruhan R3.2)
Kasir bisa melayani 20 transaksi saat internet mati, dan semuanya tersinkron tanpa duplikat setelah online.
~~~

---

## R3.3 — Notifikasi push

Est. 0,5 minggu

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md dan docs/PRD.md F-STK-06, F-DSH-03.
Ini langkah R3.3: notifikasi push PWA. Catatan: iOS hanya mendukung push untuk PWA yang sudah di-install (iOS 16.4+).

TUGAS
1. Kunci VAPID di env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY), pustaka web-push di server.
2. Tabel langganan_push (pengguna_id, endpoint unik, keys jsonb, perangkat, dibuat_pada) — pakai prompt U4 untuk perubahan skema & ERD. Wajib RLS.
3. UI pengaturan notifikasi per pengguna: aktifkan di perangkat ini, pilih jenis (stok menipis, PO besok, ringkasan harian).
4. Pemicu:
   - stok bahan melewati batas minimal (setelah transaksi yang menurunkannya; maksimal 1 notifikasi per bahan per hari)
   - jadwal harian 18.00 WIB: daftar PO besok + ringkasan omzet hari ini (pemilik)
     Lewat cron (Vercel Cron / Cloudflare Cron Trigger / GitHub Actions) ke route yang dilindungi secret.
5. Service worker: tampilkan notifikasi, klik membuka halaman terkait.
6. Hapus langganan yang mengembalikan 404/410.
7. Test: unit pembuat isi notifikasi; integrasi pemicu stok (web-push di-mock).

SELESAI JIKA
Khansa menerima notifikasi "Besok ada 3 pesanan" di HP pukul 18.00.
~~~

---

## R3.4 — Tutup kasir harian

Est. 0,5 minggu

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md §11 (risiko kasir lupa catat), docs/ERD.md (kas).
Ini langkah R3.4: fitur tutup kasir/setoran harian.

TUGAS
1. Skema baru (pakai prompt U4 untuk skema & ERD):
   tutup_kasir (id, tanggal, dibuat_oleh, kas_tunai_sistem, kas_tunai_fisik, selisih, rincian_pecahan jsonb, catatan, status draft|final, disetujui_oleh)
   UNIQUE(tanggal) per toko. RLS.
2. Alur:
   - Kasir di akhir hari membuka "Tutup Kasir"
   - sistem menampilkan kas tunai masuk/keluar hari ini (penjualan tunai, DP tunai, pengeluaran tunai)
   - kasir menghitung uang per pecahan (100rb, 50rb, …, koin) → total fisik → selisih
   - catatan wajib jika selisih ≠ 0
   - Pemilik menyetujui
   - Jika ada selisih, pemilik memilih mencatatnya sebagai kas manual (kategori baru "Selisih Kas", sistem) agar saldo sistem sama dengan fisik
3. Laporan riwayat tutup kasir + selisih per hari/kasir.
4. Pengingat di dashboard kasir setelah pukul 20.00 jika belum tutup kasir.
5. Test integrasi: hitung kas tunai sistem, persetujuan, pencatatan selisih.

SELESAI JIKA
Setiap hari ada catatan tutup kasir, dan selisih uang laci terlacak.
~~~
