# Fase 3 — Pre-Order, Invoice, Keuangan & Laporan

Tujuan fase: pesanan, pembukuan, dan laporan lengkap. Excel tidak dibutuhkan lagi.

Urutan: 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8 → 3.9 → 3.10 → 3.11 → 3.12 → 🚦 Gerbang 3

---

## 3.1 — Pre-order: data & alur status 🧭🧪

Est. 2 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PO-01, F-PO-03, keputusan K8 (§10), docs/ERD.md (pre_order, pre_order_item; aturan status di §4.4).
Ini langkah 3.1. Peran: pemilik & kasir.

TUGAS
1. src/features/pre-order/status.ts (murni, unit test):
   - TRANSISI_STATUS: dipesan→diproduksi→siap→diambil; dipesan|diproduksi|siap→batal
   - transisiValid(dari, ke): boolean
   - statusBayar(total, dibayar): 'belum'|'dp'|'lunas'
   - labelStatus, warnaStatus untuk UI

2. schemas.ts:
   - namaPemesan 2–100
   - kontak (nomor HP, normalisasi 08 → 628, validasi)
   - tanggalAmbil (≥ hari ini WIB saat membuat), jamAmbil opsional
   - diantar boolean; alamat wajib jika diantar
   - catatan opsional
   - diskon (rp)
   - items min 1: { produkId, qty 1–999, hargaSatuan (default harga_jual, boleh diubah untuk pesanan custom), catatanKue (tulisan di kue, warna, ≤ 300), addOns: [{ addOnId, harga? }] (F-ADD-05: aturan sama dengan kasir, unik per item, harga_normal dari DB) }

3. actions.ts:
   - buatPO:
     - ambilNomor 'PO'
     - hitung subtotal item (qty × (harga + Σ add-on), pakai hitungItemDenganAddOn) & total = Σ − diskon di SERVER
     - simpan pre_order_item_add_on
     - status dipesan, status_bayar belum, dibayar 0
   - ubahPO:
     - item & total hanya bisa diubah selama status dipesan/diproduksi
     - setelah siap hanya catatan/jam/alamat
     - jika total turun di bawah dibayar → tolak dengan pesan "Total lebih kecil dari yang sudah dibayar; catat refund dulu"
     - hitung ulang status_bayar
   - ubahStatusPO({ id, ke }):
     - validasi transisiValid
     - 'diambil' dan 'batal' TIDAK lewat sini (punya action sendiri di 3.2 & 3.3)
   - catatAudit untuk perubahan harga item & status

4. queries.ts:
   - daftarPO({ status, dari, sampai, q })
   - detailPO(id) — kasir tidak mendapat HPP; pemilik mendapat estimasi laba PO

5. Halaman:
   - /pre-order:
     - tab status: Aktif (dipesan+diproduksi+siap) | Diambil | Batal
     - cari nama/no; urut tanggal ambil terdekat
     - kartu: nama, tanggal & jam ambil (badge "Hari ini"/"Besok"), item ringkas, total, sisa bayar, status
   - /pre-order/baru:
     - form pemesan
     - item (pilih produk → harga terisi, bisa diubah; catatan kue per item; "+ Add-on" seperti di kasir)
     - ringkasan total
     - Simpan → arahkan ke detail
   - /pre-order/[id]:
     - info pemesan (tombol WhatsApp ke pemesan)
     - item + catatan kue
     - total/dibayar/sisa
     - stepper status dengan tombol aksi status berikutnya
     - tombol Ubah
     - bagian pembayaran (diisi 3.2)

6. Test:
   - unit transisiValid lengkap
   - integrasi buat/ubah PO, total dihitung server, ubah item setelah siap ditolak, transisi tidak valid ditolak
   - PO dengan add-on: total termasuk add-on, add-on duplikat ditolak

SELESAI JIKA
Pesanan "Brownies Loyang tulisan 'Selamat Ulang Tahun Dinda'" bisa dicatat dari HP dan statusnya dimajukan sampai "siap".
~~~

---

## 3.2 — Pembayaran PO (DP, pelunasan, refund) & pembatalan 🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PO-02, F-PO-07, §7.9, docs/ERD.md (po_pembayaran, kas, catatan DP hangus di §4.5).
Ini langkah 3.2.

TUGAS
1. Action catatPembayaranPO({ preOrderId, nominal, metode }) — pemilik & kasir, satu transaksi:
   - kunci PO; tolak jika status batal/diambil
   - sisa = total − dibayar; nominal 1..sisa (tidak boleh lebih bayar)
   - jenis otomatis: 'pelunasan' jika nominal = sisa, selain itu 'dp'
   - insert po_pembayaran
   - update dibayar & status_bayar
   - catatKas masuk:
     - kategori DP_PRE_ORDER atau PELUNASAN_PRE_ORDER
     - akun dari metode
     - sumber po_pembayaran
   - return status bayar baru

2. Action batalkanPO({ preOrderId, alasan, perlakuanDp: 'kembalikan'|'hangus' }) — HANYA pemilik:
   - status harus dipesan/diproduksi/siap
   - jika dibayar > 0 dan kembalikan:
     - insert po_pembayaran jenis 'refund' nominal = dibayar
     - catatKas keluar REFUND_PRE_ORDER, akun dari metode pembayaran terakhir (atau pilihan pengguna)
     - dibayar → 0
   - jika hangus: tidak ada kas baru (laporan 3.8 menghitungnya sebagai pendapatan lain)
   - status batal, isi alasan_batal dan dibatalkan_pada
   - audit

3. UI di /pre-order/[id]:
   - kartu Pembayaran: total, dibayar, sisa (besar), badge status bayar
   - riwayat pembayaran (tanggal, jenis, metode, nominal)
   - tombol "Catat DP / Pelunasan" → dialog nominal (tombol cepat "Lunasi Rp…", "DP 50%") + metode
   - pemilik: tombol "Batalkan pesanan" → dialog alasan + pilihan DP (jika ada DP)

4. Test integrasi:
   - DP lalu pelunasan → status lunas, 2 kas masuk
   - lebih bayar ditolak
   - batal + kembalikan → kas keluar, dibayar 0
   - batal + hangus → tidak ada kas baru
   - kasir tidak bisa membatalkan
   - invarian pre_order.dibayar = Σ pembayaran (refund negatif)

SELESAI JIKA
Semua skenario pembayaran PO tercatat benar di kas.
~~~

---

## 3.3 — PO diambil → penjualan otomatis 🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PO-06, §7.9 (PO diambil & lunas: stok −, kas tidak dicatat ulang), docs/ERD.md §7 invarian 5.
Fungsi buatPenjualan(tx, input, opsi) ada di src/features/penjualan/inti.ts (langkah 2.6a). Ini langkah 3.3.

TUGAS
1. Action ambilPO({ preOrderId }) — pemilik & kasir, satu transaksi:
   - kunci PO; status harus 'siap' DAN status_bayar 'lunas'
     (pesan jelas untuk masing-masing kasus: "Pesanan belum siap" / "Masih ada sisa pembayaran Rp…")
   - buatPenjualan dengan:
     - items dari pre_order_item (hargaSatuan dari PO, opsi.hargaDariInput true), addOns dari pre_order_item_add_on (harga dari PO; HPP add-on dihitung saat diambil; add-on yang kini nonaktif tetap diterima untuk PO)
     - diskonNota = diskon PO (rupiah)
     - metodeBayar = metode pembayaran terakhir PO
     - dibayar = total
     - preOrderId
     - opsi.catatKas = FALSE
   - Jika stok produk tidak cukup dan pengaturan melarang minus → gagal dengan pesan "Catat produksi dulu untuk: <produk>"
   - status PO 'diambil'
   - audit
   - return no nota
2. UI:
   - tombol "Tandai sudah diambil" di detail PO (hanya muncul jika siap; disabled + alasan jika belum lunas)
   - setelah sukses tampilkan nota & tombol cetak struk
   - di detail penjualan yang berasal dari PO tampilkan tautan "Dari pre-order PO-…"
3. Test integrasi:
   - PO lunas & siap → penjualan dibuat dengan pre_order_id, stok berkurang, TIDAK ada kas baru
   - PO dengan add-on → penjualan_item_add_on tersalin, stok bahan add-on berkurang, total penjualan = total PO
   - laporan omzet (ringkasanPenjualan) memasukkan penjualan ini
   - total kas PO = total PO (tidak ganda)
   - PO belum lunas → ditolak
   - ambil dua kali → ditolak (unique pre_order_id)
   - cekIntegritas tetap bersih (perbarui invarian 5 jika perlu agar mengecualikan penjualan dari PO)

SELESAI JIKA
Siklus PO lengkap: pesan → DP → produksi → siap → lunas → diambil → muncul di laporan penjualan.
~~~

---

## 3.4 — Kalender PO & kartu dashboard

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PO-04, F-DSH-03.
Ini langkah 3.4.

TUGAS
1. Query poPerTanggal({ bulan: 'YYYY-MM' } | { dari, sampai }, status?):
   - hitungan per tanggal + daftar PO
   - default tanpa batal & diambil
2. /pre-order/kalender:
   - Desktop: grid bulan (Senin–Minggu) dengan jumlah PO per hari dan titik warna status; klik hari → panel daftar PO hari itu
   - HP: tampilan daftar per tanggal (agenda) untuk 14 hari ke depan + pemilih bulan
   - navigasi ◀ ▶ bulan, tombol "Hari ini"
   - buat tanpa library kalender berat (date-fns cukup)
   Tautkan dari /pre-order (toggle Daftar | Kalender).
3. Kartu dashboard (pemilik & kasir) "Pre-order hari ini & besok":
   - per PO: jam, nama, item ringkas, status, sisa bayar (merah jika belum lunas)
   - tautan ke detail
   - tombol WhatsApp pemesan
   - maksimal 6 + "lihat semua"
4. Pada navigasi, badge jumlah PO yang diambil hari ini.

SELESAI JIKA
Saya bisa melihat semua pesanan minggu ini dalam satu layar di HP.
~~~

---

## 3.5 — Rekap kebutuhan bahan untuk PO 🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PO-05.
Gunakan kebutuhanUntukPesanan dari src/lib/hpp/kebutuhan.ts dan konteks HPP. Ini langkah 3.5.

TUGAS
1. Query rekapKebutuhanPO({ dari, sampai }):
   - PO berstatus dipesan/diproduksi dengan tanggal ambil di rentang
   - agregasi qty per produk
   - kebutuhan adonan per resep: total gram + saran skala (gram ÷ hasil_gram, dibulatkan ke 0,5 ke atas)
   - kebutuhan bahan (semua adonan proporsional + bahan langsung + bahan add-on via kebutuhanBahanAddOn)
   - bandingkan dengan stok produk jadi saat ini (opsional dikurangi) dan stok bahan
2. /pre-order/rekap?dari=&sampai= (default besok):
   - Bagian 1: Produk yang harus dibuat (qty pesanan, stok jadi, kurang)
   - Bagian 2: Adonan (resep, gram dibutuhkan, saran skala)
   - Bagian 3: Bahan (butuh, stok, kurang — baris kurang disorot)
   - Toggle "Kurangi dengan stok produk jadi yang ada"
   - Tombol "Salin daftar belanja" (teks bahan yang kurang) dan "Cetak"
   - Tombol per resep "Buat draft produksi" → /produksi/baru terisi resep, skala, dan produk
3. Kasir boleh melihat (tanpa nilai rupiah).
4. Test integrasi dengan 3 PO di tanggal sama yang memakai resep yang sama dan berbeda, salah satunya dengan add-on.

SELESAI JIKA
Sehari sebelum pesanan, Khansa tahu persis bahan apa yang kurang dan berapa kali resep harus dibuat.
~~~

---

## 3.6 — Invoice PDF 🧭

Est. 1,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-INV-01 s.d. F-INV-03, docs/ERD.md (invoice; info_pembayaran di pengaturan_toko).
Ini langkah 3.6. Peran: pemilik & kasir.

TUGAS
1. Pasang @react-pdf/renderer (cek kompatibilitas dengan versi React proyek; jika bermasalah di Server Component, render di route handler Node runtime).

2. Action buatAtauAmbilInvoice({ preOrderId } | { penjualanId }):
   - satu invoice per sumber; jika sudah ada kembalikan yang ada
   - ambilNomor 'INV'
   - tanggal = hari ini
   - jatuh_tempo = tanggal ambil PO (penjualan: sama dengan tanggal)

3. src/features/invoice/data.ts — dataInvoice(id): toko (logo, nama, alamat, telp, info_pembayaran), kepada (nama, kontak, alamat jika diantar), no, tanggal, jatuh tempo, item (nama, catatan kue, qty, harga, subtotal), subtotal, diskon, total, daftar pembayaran, sisa, status (dari status_bayar PO; penjualan = lunas). TANPA HPP.

4. Template PDF A4 (src/features/invoice/pdf.tsx):
   - header logo + identitas toko
   - judul INVOICE + nomor
   - blok kepada & tanggal
   - tabel item (zebra)
   - ringkasan kanan
   - cap status besar diagonal transparan (BELUM BAYAR / DP / LUNAS)
   - info pembayaran
   - catatan & footer
   - font: daftarkan font yang mendukung karakter Indonesia (mis. Inter dari file lokal di public/fonts)
   - format Rupiah memakai lib/format

5. Route GET /api/invoice/[id]/pdf:
   - requirePengguna
   - Content-Type application/pdf
   - Content-Disposition inline; filename INV-xxx.pdf
   - runtime nodejs

6. UI:
   - Tombol "Invoice" di detail PO dan detail penjualan → buka pratinjau PDF di tab baru
   - Tombol "Bagikan":
     - jika navigator.canShare({ files }) → fetch PDF lalu navigator.share dengan file + teks
     - jika tidak: unduh file + buka wa.me dengan teks ringkas (nomor pemesan terisi) dan instruksi melampirkan file

7. Test:
   - unit dataInvoice untuk PO DP, lunas, dan penjualan
   - integrasi: route mengembalikan PDF (cek header %PDF) untuk pengguna login, 401/redirect untuk anonim
   - nomor invoice tidak bertambah saat invoice dibuka ulang

SELESAI JIKA
Invoice PO dengan DP bisa dibuka di HP dan dibagikan ke WhatsApp pemesan.
~~~

---

## 3.7 — Keuangan (kas) 🧭🧪

Est. 2 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-KEU-01 s.d. F-KEU-05, §7.9, docs/ERD.md (kategori_kas, kas, catatan di §4.5).
Pakai lib/kas. Ini langkah 3.7. HANYA pemilik.

TUGAS
1. queries.ts:
   - saldoPerAkun() → { tunai, rekening, total } (kas tidak dibatalkan)
   - daftarKas({ dari, sampai, jenis, kategoriId, akun, sumber: 'otomatis'|'manual'|'semua' }):
     - paginasi 50
     - setiap baris otomatis punya tautan ke dokumen sumber (no nota/pembelian/PO)
     - ringkasan masuk/keluar periode
   - daftarKategoriKas()

2. actions.ts:
   - catatKasManual({ tanggal (≤ hari ini), jenis, kategoriId, akun, nominal, keterangan wajib }):
     - kategori sistem yang BOLEH dipakai manual hanya "Pemasukan Bahan Sisa"
     - kategori sistem lain (Penjualan, DP, dsb.) ditolak — hanya dari transaksi otomatis
     - jenis harus sama dengan jenis kategori
     - Pemasukan Bahan Sisa TIDAK menyentuh stok (pastikan tidak ada pemanggilan catatMutasi)
   - batalkanKasManual({ kasId, alasan }):
     - hanya kas manual (sumber_tipe null atau 'manual')
     - kas otomatis ditolak dengan pesan "Batalkan lewat transaksi asalnya"
     - audit
   - transferAntarAkun({ dari: akun, ke: akun, nominal, tanggal, keterangan }):
     - dua baris kas (Transfer Keluar dari akun asal, Transfer Masuk ke akun tujuan) dalam satu transaksi
     - sumber_tipe 'transfer' dengan sumber_id sama untuk keduanya
     - akun asal ≠ tujuan
     - saldo akun asal boleh minus? TIDAK — tolak jika saldo tidak cukup
   - kelolaKategori:
     - tambah/ubah/nonaktifkan kategori non-sistem (nama unik, jenis, kelompok operasional atau pendapatan_lain)
     - kategori sistem tidak bisa diubah/dihapus

3. Halaman:
   - /keuangan:
     - kartu saldo Tunai, Rekening, Total
     - tombol: + Pemasukan, + Pengeluaran, Transfer
     - daftar kas berfilter (HP: kartu; desktop: tabel) dengan ikon otomatis/manual
   - Dialog pemasukan/pengeluaran:
     - kategori disaring sesuai jenis
     - InputRupiah, akun, tanggal, keterangan
     - pilihan cepat kategori yang sering dipakai
   - /keuangan/kategori: kelola kategori

4. Test integrasi:
   - saldo per akun mencakup penjualan, pembelian, DP, refund, manual, transfer
   - kas dibatalkan tidak dihitung
   - kategori sistem ditolak untuk input manual (kecuali Pemasukan Bahan Sisa)
   - Pemasukan Bahan Sisa tidak mengubah stok mana pun
   - transfer: total saldo tidak berubah; saldo asal tidak cukup ditolak
   - kas otomatis tidak bisa dibatalkan manual
   - kasir ditolak di semua action

SELESAI JIKA
Saldo tunai di aplikasi bisa dicocokkan dengan uang di laci, dan biaya listrik/gas bisa dicatat.
~~~

---

## 3.8 — Laporan periode (laba rugi & analisis) 🧭🧪

Est. 2 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-LAP-02 s.d. F-LAP-04, §7.11, docs/ERD.md §4.5 (laba tidak dihitung dari kas; DP hangus).
Kembangkan src/features/laporan/queries.ts. Ini langkah 3.8. Hanya pemilik.

TUGAS
1. Query (semua agregasi di SQL, pengelompokan hari memakai (waktu AT TIME ZONE 'Asia/Jakarta')::date, tanpa N+1):
   a. labaRugi({ mulai, selesai }):
      - omzet = Σ penjualan.total (selesai)
      - diskon
      - hppPenjualan = Σ (hpp_satuan + Σ hpp_satuan add-on) × qty
      - labaKotor
      - pendapatanLain:
        - kas masuk kelompok pendapatan_lain
        - + DP hangus (Σ dibayar PO berstatus batal tanpa refund, diakui pada tanggal pre_order.dibatalkan_pada)
      - biayaOperasional per kategori (kas keluar kelompok operasional)
      - kerugianStok = Σ |qty × nilai_satuan| mutasi penyesuaian/opname dengan qty < 0
      - labaBersih
   b. trenHarian({ mulai, selesai }): per tanggal omzet, labaKotor, jumlah transaksi (isi tanggal kosong dengan 0)
   c. produkTerlaris & produkPalingUntung (top 10, qty & laba)
   d. pemakaianBahan({ mulai, selesai }): Σ |qty| mutasi produksi_pakai per bahan + nilai (qty × nilai_satuan)
   e. nilaiStok(): bahan (stok>0 × harga) dan produk (stok>0 × HPP saat ini), total

2. /laporan:
   - pemilih periode: Hari ini, Minggu ini, Bulan ini, Bulan lalu, Tahun ini, Rentang bebas (simpan di query string)
   - Tab Laba Rugi:
     - tabel bertingkat gaya laporan keuangan sederhana dengan subtotal
     - perbandingan dengan periode sebelumnya (▲/▼ %)
   - Tab Tren: grafik garis/kolom Recharts omzet & laba per hari (warna konsisten, tooltip Rupiah, responsif)
   - Tab Produk: dua daftar top 10 + tabel lengkap per produk (qty, omzet, HPP, laba, margin)
   - Tab Bahan & Stok: pemakaian bahan periode + nilai stok saat ini
   - Laporan harian (2.10) tetap ada sebagai tautan

3. Test integrasi dengan dataset fixture lengkap:
   penjualan, batal, PO diambil, DP hangus, refund, biaya manual, transfer, penyesuaian negatif.
   Hitung manual hasil yang diharapkan di test dan cocokkan SETIAP baris laba rugi. Transfer tidak memengaruhi laba.
   Uji juga batas hari WIB.

SELESAI JIKA
Laporan laba rugi bulan berjalan tampil dan setiap angka bisa ditelusuri ke data sumbernya.

LAPORAN AKHIR
Penjelasan singkat (bahasa awam) cara membaca laporan laba rugi, untuk saya teruskan ke Khansa.
~~~

---

## 3.9 — Ekspor Excel & PDF laporan 🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-LAP-05.
Query laporan ada di src/features/laporan/queries.ts. Ini langkah 3.9. Hanya pemilik.

TUGAS
1. Route GET /api/laporan/ekspor?format=xlsx&dari=&sampai= (requirePeran pemilik, validasi Zod; rentang maks 366 hari):
   Sheet:
   - Laba Rugi
   - Penjualan (per nota: no, waktu WIB, metode, subtotal, diskon, total, status)
   - Item Penjualan (no, produk, add-on, qty, harga, diskon, subtotal, HPP, laba)
   - Produk (ringkasan per produk)
   - Kas (semua baris + kategori + akun + sumber)
   - Pembelian
   - Pemakaian Bahan
   - Nilai Stok
   Format:
   - header tebal dengan freeze pane & autofilter
   - kolom uang format "Rp"#,##0 (angka asli, bukan teks)
   - tanggal format tanggal Excel
   - lebar kolom wajar
   - baris total
   Nama file: laporan-tokokue-YYYYMMDD-YYYYMMDD.xlsx
   Streaming jika data besar.
2. Route GET /api/laporan/laba-rugi.pdf?dari=&sampai=: PDF A4 laba rugi (react-pdf, gaya sama dengan invoice).
3. Tombol "Ekspor Excel" & "Unduh PDF" di halaman /laporan sesuai periode terpilih.
4. Test integrasi:
   - xlsx bisa dibaca kembali dengan exceljs, nama sheet benar, total sheet Laba Rugi = labaRugi()
   - PDF valid
   - kasir ditolak
   - rentang tidak valid ditolak

SELESAI JIKA
File Excel terbuka rapi di Excel/Google Sheets dengan angka yang bisa dijumlah.
~~~

---

## 3.10 — Stock opname & grafik riwayat harga 🧭🧪

Est. 1,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-STK-04, F-STK-05, docs/ERD.md (stok_opname, stok_opname_item).
Ini langkah 3.10. Hanya pemilik.

TUGAS
A. Stock opname
1. Actions:
   - mulaiOpname({ target: 'bahan'|'produk', catatan }):
     - buat draft
     - isi item untuk semua bahan/produk aktif dengan stok_sistem saat ini, stok_fisik null
   - simpanHitungan({ opnameId, items: [{ itemId, stokFisik | null }] }): hanya draft
   - finalisasiOpname({ opnameId }) satu transaksi:
     - untuk setiap item dengan stok_fisik terisi, kunci stok saat ini
     - stok_sistem = stok SAAT INI (bukan saat draft dibuat)
     - selisih = fisik − sistem
     - nilai_selisih = selisih × nilai (harga bahan / HPP produk)
     - jika selisih ≠ 0 → catatMutasi 'opname' sumber opname
     - status final, audit
     - kembalikan daftar item yang stok sistemnya berubah sejak draft dibuat (peringatan)
   - hapusDraftOpname
2. Halaman:
   - /stok/opname: daftar (tanggal, target, status, total nilai selisih)
   - /stok/opname/[id] (mode hitung, dioptimalkan untuk HP sambil berjalan di gudang):
     - pencarian & filter kategori
     - daftar item dengan input angka besar
     - stok sistem kecil di samping
     - selisih langsung tampil (warna)
     - progres "34/50 dihitung"
     - simpan otomatis (debounce 1 detik, indikator "Tersimpan")
     - tombol "Selesaikan" → ringkasan (jumlah item berselisih, total nilai +/−) → konfirmasi finalisasi
     - item tanpa input dilewati (tidak dianggap 0)
   - Final: tampilan baca + tautan ke kartu stok

B. Grafik riwayat harga
3. Tab "Riwayat Harga" di detail bahan:
   - grafik garis Recharts harga_baru per tanggal (12 bulan terakhir) + titik harga beli
   - tooltip: tanggal, harga lama → baru, sumber, no pembelian
   - tabel di bawah grafik

4. Test integrasi:
   - finalisasi membuat mutasi hanya untuk item berselisih
   - stok berubah antara draft dan final → selisih dihitung dari stok terbaru + peringatan
   - item kosong dilewati
   - finalisasi dua kali ditolak
   - cekIntegritas bersih setelah opname

SELESAI JIKA
Opname 50 bahan bisa dilakukan dari HP dan selisihnya masuk laporan kerugian stok.
~~~

---

## 3.11 — Manajemen pengguna & jejak audit 🧪👤

Est. 1 hari · Atur Site URL dan Redirect URLs di Supabase Auth agar email undangan mengarah ke aplikasi.

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-SET-03, F-SET-05, §8.
Pakai src/lib/supabase/admin.ts (service role, server-only). Ini langkah 3.11. Hanya pemilik.

TUGAS
A. Pengguna
1. Actions:
   - undangPengguna({ email, nama, peran }):
     - admin.inviteUserByEmail dengan data { nama, peran }
     - redirectTo halaman /login/atur-password
     - trigger 0.5 membuat baris pengguna
   - ubahPeran({ penggunaId, peran })
   - setAktifPengguna({ penggunaId, aktif }):
     - nonaktif juga memblokir login (admin.updateUserById ban_duration panjang, atau cek aktif di getPengguna yang sudah ada)
     - aktifkan kembali membuka blokir
   - Aturan:
     - tidak boleh menurunkan/menonaktifkan diri sendiri
     - tidak boleh menyisakan 0 pemilik aktif
   - semua perubahan → audit
2. Halaman /login/atur-password: pengguna undangan menetapkan password (min 8, konfirmasi).
3. /pengaturan/pengguna:
   - daftar (nama, email, peran, aktif, terakhir login dari auth jika tersedia)
   - tombol Undang
   - aksi ubah peran / nonaktifkan dengan konfirmasi

B. Audit
4. Query daftarAudit({ tabel, penggunaId, dari, sampai, halaman }).
5. /pengaturan/audit:
   - filter
   - daftar kronologis: waktu, pengguna, aksi, entitas (dengan nama/no yang mudah dibaca), ringkasan perubahan
   - klik → tampilan diff field per field (lama → baru), angka diformat
6. Pastikan audit sudah tercatat untuk: harga bahan, harga jual, penyesuaian/opname, semua pembatalan, perubahan pengaturan, perubahan pengguna.
   Tambahkan yang belum ada dan tulis test untuk masing-masing.

7. Test integrasi:
   - pemilik terakhir tidak bisa dinonaktifkan/diturunkan
   - pengguna nonaktif → getPengguna null
   - kasir ditolak
   - audit tercatat (mock admin client Supabase)

SELESAI JIKA
Khansa bisa mengundang kasir lewat email, kasir bisa login, dan semua perubahan penting terlihat di halaman audit.
~~~

---

## 3.12 — Backup otomatis & ekspor data 🧭👤

Est. 0,5–1 hari · Siapkan penyimpanan backup (mis. bucket Cloudflare R2) dan isi secrets di GitHub sendiri.

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PLAN.md §7 (Backup), docs/PRD.md F-SET-06 dan §9 (backup harian, simpan 14 hari).
Ini langkah 3.12.

TUGAS
1. .github/workflows/backup.yml:
   - schedule cron "0 19 * * *" (02.00 WIB) + workflow_dispatch
   - pasang postgresql-client dengan versi MAYOR sama dengan Postgres di Supabase (cek dulu, jangan menebak; tulis di komentar cara mengeceknya)
   - pg_dump --format=custom --no-owner --no-privileges memakai secret DATABASE_URL_DIRECT_PROD
   - enkripsi dengan age (secret AGE_PUBLIC_KEY; private key HANYA dipegang pemilik, tidak di GitHub)
   - unggah ke penyimpanan S3-compatible (R2): secret S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY; nama file tokokue-YYYYMMDD-HHmm.dump.age
   - hapus file yang lebih tua dari 14 hari
   - gagal → workflow merah (GitHub akan mengirim email)
   - jangan pernah mencetak connection string di log
2. docs/backup-restore.md:
   - cara membuat kunci age
   - cara mengunduh & mendekripsi backup
   - pg_restore ke database baru (lokal docker dan proyek Supabase baru)
   - jalankan pnpm cek-integritas setelah restore
   - checklist uji restore 3 bulanan
3. Ekspor data manual — /pengaturan/ekspor (pemilik):
   - tombol "Unduh semua data (Excel)"
   - route menghasilkan xlsx satu sheet per tabel utama (bahan, konversi, resep, item, produk, komponen, supplier, pembelian, produksi, penjualan, item, PO, pembayaran, kas, mutasi stok)
   - tanpa tabel sistem auth
   - nilai apa adanya + header kolom
4. Uji: jalankan workflow manual satu kali, lalu restore ke docker lokal mengikuti dokumen, dan laporkan hasil cekIntegritas.

SELESAI JIKA
Backup harian berjalan, restore terbukti berhasil, ekspor Excel tersedia.

LAPORAN AKHIR
Daftar secret yang harus saya isi + hasil uji restore.
~~~

---

## 🚦 Gerbang 3 — Tutup buku 1 bulan

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PLAN.md §4 (Gerbang 3), docs/PRD.md §2 (metrik).
Satu bulan penuh sudah berjalan di aplikasi. Siapkan bahan rapat tutup buku dengan Khansa.

TUGAS (read-only terhadap data produksi; jangan mengubah data)
1. Jalankan cekIntegritas di database produksi → lampirkan hasil.
2. Buat docs/gerbang/hasil-gerbang-3.md:
   a. laba rugi bulan [ISI: bulan] dari labaRugi()
   b. rekonsiliasi kas: saldo awal + masuk − keluar = saldo akhir per akun
      (beri kolom kosong "saldo fisik/rekening menurut Khansa")
   c. daftar PO bulan itu per status, termasuk yang batal (DP dikembalikan/hangus)
   d. hasil opname bulanan: total nilai selisih vs nilai stok (target < 5%)
   e. 5 produk acuan: HPP sekarang vs saat Gerbang 1 (perubahan karena harga bahan)
   f. metrik PRD §2 yang bisa diukur dari data (mis. jumlah transaksi/hari)
   g. checklist Gerbang 3 dari PLAN dengan status masing-masing
3. Konfirmasi bahwa uji restore backup (3.12) sudah pernah sukses; jika belum, tandai sebagai blocker.
4. Daftar pertanyaan untuk Khansa jika ada angka yang janggal.

LAPORAN AKHIR
Status Gerbang 3 (LULUS / BELUM) beserta alasannya.
~~~

Setelah lulus: jalankan **U1** dan **U5** dari [README](README.md) untuk Fase 3.
