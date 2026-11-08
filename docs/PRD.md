# PRD — Aplikasi Kasir & HPP Toko Kue Khansa

| | |
| --- | --- |
| Versi | 1.0 (draft) |
| Tanggal | 3 November 2026 |
| Sumber | Spesifikasi Aplikasi Kasir & HPP Toko Kue (3 Nov 2026) |
| Dokumen terkait | [ERD.md](ERD.md) · [PLAN.md](PLAN.md) |
| Status | Menunggu konfirmasi keputusan terbuka (§10) |

---

## 1. Latar belakang

Toko kue Khansa saat ini menghitung HPP, stok, dan pembukuan secara manual di Excel. Masalahnya:

- **Excel makan waktu.** Setiap harga bahan naik, HPP semua produk harus dihitung ulang manual.
- **Aplikasi kasir di pasaran terlalu rumit** dan tidak paham konsep "satu adonan → banyak produk".
- **Satu adonan dipakai banyak cetakan.** Adonan brownies yang sama bisa jadi cup kecil, loyang 20×20, atau bites, dengan HPP berbeda per pcs. Kasir umum tidak bisa memodelkan ini.
- **Margin tidak terlihat.** Pemilik tidak tahu produk mana yang sebenarnya rugi atau untungnya tipis.

## 2. Tujuan & metrik keberhasilan

| Tujuan | Metrik | Target |
| --- | --- | --- |
| HPP otomatis dan akurat | Selisih HPP aplikasi vs hitungan manual Khansa untuk 5 produk acuan | ≤ Rp1 per pcs |
| Hemat waktu pencatatan | Waktu update harga bahan sampai HPP semua produk terbarui | < 1 menit (vs ±30 menit di Excel) |
| Transaksi kasir cepat | Waktu dari pilih produk sampai struk tercetak, 3 item, tunai | < 30 detik |
| Margin terlihat | Produk dengan margin di bawah target muncul di dashboard | 100% produk aktif terpantau |
| Pembukuan tanpa Excel | Laporan laba bulanan dibuat dari aplikasi | Bulan pertama setelah go-live |
| Stok terkendali | Selisih stok sistem vs fisik saat opname bulanan | < 5% nilai stok |

## 3. Pengguna

| Persona | Deskripsi | Kebutuhan utama |
| --- | --- | --- |
| **Pemilik (Khansa)** | Mengelola resep, belanja bahan, produksi, harga jual, dan keuangan. Pakai HP dan laptop. | Tahu HPP & margin, kontrol stok, laporan laba |
| **Kasir/Staf** (opsional, 1–2 orang) | Melayani pembeli dan mencatat pre-order. Pakai HP/tablet di toko. | Kasir cepat, cetak struk, catat PO. **Tidak boleh** melihat HPP/laba. |

## 4. Ruang lingkup

### 4.1 Termasuk (in scope)

11 modul, dikelompokkan berdasarkan fase rilis:

| # | Modul | Rilis |
| --- | --- | --- |
| 1 | Dashboard | MVP (sederhana) → lengkap di R2 |
| 2 | Master Bahan & Supplier | MVP |
| 3 | Stok & Pembelian | MVP (pembelian, kartu stok) → R2 (opname, grafik harga) |
| 4 | Resep Adonan (BOM level 1) | MVP |
| 5 | Produk per Cetakan & HPP (BOM level 2), termasuk add-on | MVP |
| 6 | Produksi | MVP |
| 7 | Kasir (POS) | MVP |
| 8 | Pre-Order | R2 |
| 9 | Invoice | R2 |
| 10 | Keuangan | R2 |
| 11 | Laporan & Pengaturan | MVP (pengaturan, laporan harian) → R2 (laporan lengkap, ekspor) |

**MVP** = cukup untuk dipakai harian: HPP, stok, produksi, dan kasir.
**R2** = melengkapi pembukuan dan pesanan.
**R3 (opsional)** = mode offline kasir, cetak ESC/POS via Bluetooth, notifikasi push.

### 4.2 Tidak termasuk (out of scope v1)

- Multi-cabang / multi-toko
- Integrasi payment gateway (QRIS hanya dicatat manual)
- Integrasi marketplace / ojek online
- Program loyalti / member
- Akuntansi lengkap (jurnal, neraca, pajak)
- Aplikasi native (iOS/Android). Cukup PWA.
- Penggajian

## 5. Konsep inti: BOM dua tingkat

```
Bahan (g/ml/pcs, harga per satuan dasar)
   │
   ▼  takaran × harga
Resep Adonan  ──►  biaya per gram adonan
   │
   ▼  gram per pcs × biaya per gram
Produk per Cetakan  ◄── + topping/filling + kemasan + overhead
   │
   ▼
HPP per pcs  ──►  margin, saran harga jual
```

Satu resep adonan dipakai oleh banyak produk. Satu produk bisa terdiri dari lebih dari satu adonan (misal lapis dua rasa). Cetakan berbeda = produk berbeda, tanpa menduplikasi resep.

## 6. Kebutuhan fungsional

Format: **ID — user story**, lalu kriteria penerimaan (KP). Prioritas: **P0** wajib MVP, **P1** wajib R2, **P2** opsional.

### 6.1 Master Bahan & Supplier

**F-BHN-01 (P0)** — Sebagai pemilik, saya ingin mencatat bahan dengan satuan dasar g/ml/pcs agar semua perhitungan konsisten.
- KP1: Field wajib: nama (unik), kategori, satuan dasar. Opsional: stok minimal, supplier utama.
- KP2: Satuan dasar tidak bisa diubah jika bahan sudah dipakai di resep atau punya mutasi stok.
- KP3: Bahan bisa dinonaktifkan (tidak dihapus) jika sudah punya riwayat.

**F-BHN-02 (P0)** — Sebagai pemilik, saya ingin memasukkan harga sesuai cara beli ("tepung 1 kg Rp15.000") dan sistem menghitung harga per gram.
- KP1: Input: isi kemasan + satuan kemasan (kg/g/l/ml/pcs/lusin) + harga. Sistem mengonversi ke satuan dasar.
- KP2: Harga per satuan dasar disimpan presisi 4 desimal (Rp13.500/kg → Rp13,5000/g).
- KP3: Perubahan harga manual tercatat di riwayat harga.

**F-BHN-03 (P0)** — Sebagai pemilik, saya ingin mendefinisikan konversi satuan per bahan (1 sdm gula = 12 g, 1 butir telur = 55 g).
- KP1: Nama satuan unik per bahan, nilai > 0.
- KP2: Konversi yang sedang dipakai resep tidak bisa dihapus.

**F-BHN-04 (P0)** — Stok awal dan stok minimal per bahan.
- KP1: Stok awal dicatat sebagai mutasi `penyesuaian` dengan alasan "stok awal".

**F-SUP-01 (P1)** — Data supplier: nama, kontak, bahan yang biasa dibeli.

### 6.2 Stok & Pembelian

**F-STK-01 (P0)** — Catat pembelian bahan (multi-item per nota).
- KP1: Per item: bahan, jumlah kemasan, isi per kemasan, total harga.
- KP2: Stok bahan bertambah, mutasi `pembelian` tercatat, harga bahan diperbarui sesuai metode harga (§7.8), riwayat harga tercatat, kas keluar tercatat. **Semua dalam satu transaksi database.**
- KP3: Pembelian bisa dibatalkan oleh pemilik. Pembatalan membalik stok dan kas, tidak menghapus data.

**F-STK-02 (P0)** — Kartu stok per bahan: semua mutasi beserta sumber, saldo berjalan, dan pengguna.

**F-STK-03 (P1)** — Penyesuaian stok (rusak, kedaluwarsa, tumpah, selisih hitung). Alasan wajib diisi.

**F-STK-04 (P1)** — Stock opname: input stok fisik banyak bahan sekaligus, sistem menampilkan selisih dan nilainya, lalu pemilik mengonfirmasi untuk membuat mutasi `opname`.

**F-STK-05 (P1)** — Grafik riwayat harga per bahan.

**F-STK-06 (P0)** — Badge stok menipis untuk bahan dengan stok ≤ stok minimal.

### 6.3 Resep Adonan

**F-RSP-01 (P0)** — Buat resep dari daftar bahan dengan takaran dalam satuan bebas (gram, sdm, butir).
- KP1: Satuan yang bisa dipilih = satuan dasar bahan + konversi yang terdaftar untuk bahan itu.
- KP2: Sistem menampilkan takaran dasar hasil konversi di setiap baris.

**F-RSP-02 (P0)** — Hasil total adonan: otomatis (jumlah semua bahan dalam gram) atau input hasil timbang.
- KP1: Mode otomatis menjumlahkan bahan bersatuan g dan ml (ml dianggap 1 g, dengan peringatan). Bahan bersatuan `pcs` tidak ikut terhitung, dan sistem memberi peringatan serta menyarankan mode timbang. Agar akurat, bahan seperti telur sebaiknya bersatuan dasar g dengan konversi "1 butir = 55 g".

**F-RSP-03 (P0)** — Biaya adonan total dan biaya per gram, selalu memakai harga bahan terbaru.

**F-RSP-04 (P1)** — Duplikat resep untuk varian (brownies original → brownies keju).

**F-RSP-05 (P1)** — Kalkulator skala: 0,5×/1,5×/2×, atau dari ukuran loyang bulat/kotak (§7.6). Hanya tampilan, tidak mengubah resep asli.

### 6.4 Produk & HPP

**F-PRD-01 (P0)** — Buat produk: nama, kategori, cetakan, harga jual, foto, status jual.

**F-PRD-02 (P0)** — Komponen produk: satu adonan atau lebih (gram per pcs) + bahan langsung (topping, filling, kemasan) dengan takaran per pcs.
- KP1: Setiap komponen menunjuk tepat satu adonan **atau** satu bahan.
- KP2: Setiap komponen punya peran: adonan / topping / filling / kemasan / lainnya, untuk rincian HPP.

**F-PRD-03 (P0)** — Rincian HPP per pcs: adonan, topping, filling, kemasan, overhead, total.

**F-PRD-04 (P0)** — Margin Rp dan %, plus saran harga jual dari target margin (default dari pengaturan, bisa diubah per produk).

**F-PRD-05 (P0)** — Jumlah pcs per resep (dibulatkan ke bawah) untuk produk satu adonan.

**F-PRD-06 (P1)** — Biaya tambahan/overhead: per pcs, % dari biaya bahan, atau per batch. Berlaku untuk semua produk atau produk tertentu.

**F-PRD-07 (P1)** — Simulasi kenaikan harga: pilih bahan + % kenaikan, tampilkan daftar produk terdampak beserta HPP dan margin lama vs baru. Tidak menyimpan perubahan apa pun.

### 6.4a Add-on (tambahan pilihan pembeli)

Add-on adalah tambahan yang **hanya dipakai jika pembeli memintanya** saat membeli, misalnya "Extra keju". Produk tanpa add-on tetap memakai harga jual dan HPP aslinya. Berbeda dengan komponen produk (F-PRD-02) yang selalu ikut di setiap pcs.

**F-ADD-01 (P0)** — Master add-on (pemilik): nama (unik), satu bahan + takaran per pcs (boleh memakai konversi satuan), harga jual normal, aktif.
- KP1: Satu add-on hanya berisi **satu bahan**.
- KP2: Add-on aktif berlaku untuk **semua produk**, tidak diatur per produk.
- KP3: HPP add-on per pcs = takaran dasar × harga per satuan bahan (§7.12), tampil di daftar beserta margin.
- KP4: Add-on yang sudah pernah dipakai di transaksi tidak bisa dihapus, hanya dinonaktifkan.

**F-ADD-02 (P0)** — Pilih add-on di kasir: setiap baris keranjang bisa diberi satu atau beberapa add-on berbeda.
- KP1: Setiap add-on paling banyak **1× per item** (tidak ada "extra keju 2×").
- KP2: Add-on berlaku untuk **semua pcs** di baris itu. Jika hanya sebagian pcs yang memakai add-on, kasir membuat baris terpisah.
- KP3: Harga add-on terisi dari harga normal dan **boleh diubah kasir** (≥ 0). Sistem menyimpan harga normal dan harga yang dipakai, tanpa wajib alasan.
- KP4: Kasir hanya menerima nama dan harga jual add-on, tanpa HPP.

**F-ADD-03 (P0)** — Simpan transaksi dengan add-on: harga, HPP add-on (snapshot), dan pengurangan stok bahan add-on (takaran × qty) tercatat dalam **satu transaksi database** yang sama dengan penjualan. Pembatalan penjualan mengembalikan stok bahan add-on.

**F-ADD-04 (P0)** — Add-on tampil di keranjang, struk, teks WhatsApp, riwayat, dan detail penjualan. Pemilik melihat HPP, laba, dan selisih harga add-on (harga dipakai vs normal).

**F-ADD-05 (P1)** — Add-on di pre-order: item PO bisa diberi add-on dengan aturan yang sama. Saat PO diambil, add-on ikut ke penjualan. Rekap kebutuhan bahan PO ikut menghitung bahan add-on.

### 6.5 Produksi

**F-PRO-01 (P0)** — Catat produksi: pilih resep, faktor skala, dan satu atau lebih produk yang dicetak dari adonan itu, dengan rencana pcs masing-masing.
- KP1: Sistem memvalidasi total gram adonan yang dibutuhkan semua produk ≤ hasil adonan × skala, atau memberi peringatan.

**F-PRO-02 (P0)** — Saat produksi diselesaikan:
- Stok bahan resep berkurang sebesar takaran × skala.
- Stok bahan non-adonan (topping, kemasan) berkurang sebesar takaran per pcs × pcs aktual.
- Stok produk bertambah sebesar pcs aktual.
- HPP aktual per produk tersimpan dan bisa dibandingkan dengan HPP rencana (§7.7).
- **Semua dalam satu transaksi database.**

**F-PRO-03 (P0)** — Input pcs aktual dan afkir per produk.

**F-PRO-04 (P1)** — Stok bahan boleh menjadi minus (dengan peringatan), karena di dapur produksi sering lebih dulu dari pencatatan pembelian. Bahan dengan stok minus disorot di dashboard.

### 6.6 Kasir (POS)

**F-POS-01 (P0)** — Grid produk dengan foto dan harga, filter kategori, pencarian cepat. Produk stok 0 ditampilkan redup.

**F-POS-02 (P0)** — Keranjang: ubah qty, diskon per item (Rp atau %), diskon per nota, catatan.

**F-POS-03 (P0)** — Pembayaran: tunai (input uang diterima, hitung kembalian), transfer, QRIS (dicatat manual).

**F-POS-04 (P0)** — Simpan transaksi: nomor nota otomatis, stok produk berkurang, HPP per item disalin ke transaksi, kas masuk tercatat. **Satu transaksi database.**
- KP1: Jika stok produk tidak cukup, kasir mendapat peringatan. Pemilik bisa mengizinkan stok minus lewat pengaturan.

**F-POS-05 (P0)** — Cetak struk thermal 58/80 mm via dialog cetak browser.

**F-POS-06 (P1)** — Kirim struk via WhatsApp (link `wa.me` berisi ringkasan teks).

**F-POS-07 (P0)** — Riwayat transaksi (kasir: hari ini saja; pemilik: semua).

**F-POS-08 (P0)** — Pembatalan transaksi oleh pemilik dengan alasan wajib. Stok dan kas dibalik, transaksi ditandai `batal`, tidak dihapus.

**F-POS-09 (P2)** — Cetak ESC/POS via Web Bluetooth (Android Chrome/desktop saja).

**F-POS-10 (P2)** — Mode offline kasir.

### 6.7 Pre-Order

**F-PO-01 (P1)** — Catat PO: nama pemesan, kontak, tanggal & jam ambil, diantar/tidak + alamat, item, catatan khusus per item (tulisan kue, warna).

**F-PO-02 (P1)** — DP dan pelunasan dicatat sebagai pembayaran terpisah (bisa beda metode). Sisa tagihan dan status bayar (belum / DP / lunas) dihitung otomatis.

**F-PO-03 (P1)** — Status pesanan: `dipesan → diproduksi → siap → diambil`, atau `batal` dari status mana pun sebelum diambil.

**F-PO-04 (P1)** — Daftar dan kalender PO per tanggal ambil. Dashboard menampilkan PO hari ini dan besok.

**F-PO-05 (P1)** — Rekap kebutuhan bahan untuk semua PO di tanggal tertentu, dibandingkan dengan stok saat ini.

**F-PO-06 (P1)** — Saat PO berstatus `diambil` **dan** lunas: sistem membuat transaksi penjualan (stok produk berkurang, HPP disalin). Kas tidak dicatat ulang karena sudah tercatat dari DP dan pelunasan (§7.9).

**F-PO-07 (P1)** — Pembatalan PO dengan DP: pemilik memilih DP dikembalikan (kas keluar) atau hangus (tetap sebagai pemasukan).

### 6.8 Invoice

**F-INV-01 (P1)** — Invoice A4/PDF dari PO atau penjualan: logo, nomor otomatis, rincian item, DP, sisa tagihan.

**F-INV-02 (P1)** — Unduh PDF, atau bagikan ke WhatsApp (Web Share API di HP; fallback unduh lalu kirim manual).

**F-INV-03 (P1)** — Status invoice mengikuti status bayar sumbernya: belum bayar / DP / lunas.

### 6.9 Keuangan

**F-KEU-01 (P1)** — Kas masuk otomatis dari penjualan, DP, dan pelunasan PO. Kas keluar otomatis dari pembelian bahan.

**F-KEU-02 (P1)** — Input manual kas masuk/keluar dengan kategori (listrik, gas, gaji, sewa, iklan, dll.). Kategori bisa ditambah pemilik.

**F-KEU-03 (P1)** — Kategori sistem **Pemasukan Bahan Sisa**: tercatat sebagai pemasukan lain-lain, tidak mengubah stok bahan.

**F-KEU-04 (P1)** — Saldo kas per akun: tunai dan rekening (transfer + QRIS masuk ke rekening).

**F-KEU-05 (P1)** — Transfer antar akun (setor tunai ke rekening) tanpa memengaruhi laba.

### 6.10 Laporan

**F-LAP-01 (P0)** — Laporan harian: omzet, jumlah transaksi, HPP terjual, laba kotor.

**F-LAP-02 (P1)** — Laporan periode (harian/mingguan/bulanan/rentang bebas): omzet, HPP penjualan, laba kotor, biaya operasional, laba bersih.

**F-LAP-03 (P1)** — Produk terlaris (qty) dan paling menguntungkan (laba kotor total).

**F-LAP-04 (P1)** — Pemakaian bahan per periode, nilai stok bahan dan produk saat ini.

**F-LAP-05 (P1)** — Ekspor laporan ke Excel (.xlsx). PDF untuk laporan laba-rugi.

### 6.11 Dashboard

**F-DSH-01 (P0)** — Hari ini: omzet, jumlah transaksi, laba kotor (laba kotor hanya untuk pemilik).

**F-DSH-02 (P0)** — Bahan di bawah stok minimal atau minus.

**F-DSH-03 (P1)** — PO yang diambil hari ini dan besok.

**F-DSH-04 (P0)** — Produk dengan margin di bawah target.

### 6.12 Pengaturan & Pengguna

**F-SET-01 (P0)** — Profil toko: nama, alamat, telepon, logo, footer struk, ukuran kertas (58/80 mm).

**F-SET-02 (P0)** — Parameter perhitungan: metode harga bahan (rata-rata tertimbang / harga terakhir), target margin default, izinkan stok produk minus.

**F-SET-03 (P1)** — Manajemen pengguna: undang via email, atur peran, nonaktifkan.

**F-SET-04 (P0)** — Login email + password (Supabase Auth). Sesi tetap login di HP.

**F-SET-05 (P1)** — Jejak audit: perubahan harga, stok, harga jual, dan pembatalan mencatat siapa, kapan, data lama, dan data baru. Halaman audit hanya untuk pemilik.

**F-SET-06 (P1)** — Ekspor seluruh data (backup manual) ke Excel.

## 7. Aturan bisnis & perhitungan

Semua perhitungan memakai satuan dasar bahan (g/ml/pcs). **Pembulatan hanya di akhir**, saat nilai ditampilkan atau disalin ke transaksi.

| Jenis nilai | Tipe penyimpanan |
| --- | --- |
| Uang transaksi (harga jual, total nota, kas, DP) | Integer rupiah |
| Harga per satuan dasar bahan, biaya per gram adonan | `numeric(14,4)` |
| HPP per pcs (snapshot di transaksi) | `numeric(14,2)` |
| Takaran & stok bahan | `numeric(14,3)` |
| Stok produk | Integer pcs |

**7.1 Konversi satuan.** `takaran_dasar = takaran × nilai_konversi`. Contoh: 3 sdm gula × 12 g = 36 g.

**7.2 Harga per satuan dasar dari pembelian.** `harga_beli_per_satuan = total_harga ÷ (jumlah_kemasan × isi_per_kemasan)`.

**7.3 Biaya adonan.**
- `biaya_total_adonan = Σ (takaran_dasar × harga_per_satuan_bahan)`
- `biaya_per_gram = biaya_total_adonan ÷ hasil_gram`

**7.4 HPP per pcs.**
```
biaya_bahan   = Σ komponen adonan (gram_per_pcs × biaya_per_gram_adonan)
              + Σ komponen bahan  (takaran_per_pcs × harga_per_satuan_bahan)
overhead      = Σ per_pcs
              + Σ persen × biaya_bahan
              + Σ per_batch ÷ pcs_per_resep
HPP           = biaya_bahan + overhead
pcs_per_resep = floor(hasil_gram ÷ gram_per_pcs)   (adonan utama)
```
Jika produk punya lebih dari satu adonan, overhead per batch memakai adonan dengan gram terbesar sebagai adonan utama.

**7.5 Margin.**
- `margin_rp = harga_jual − HPP`
- `margin_% = margin_rp ÷ harga_jual`
- `saran_harga = HPP ÷ (1 − target_margin)`, dibulatkan **ke atas** ke kelipatan Rp500.

**7.6 Skala resep.**
- Bulat: `faktor = (diameter_baru ÷ diameter_resep)²`. 24 cm dari resep 20 cm = 1,44×.
- Kotak: `faktor = (p_baru × l_baru) ÷ (p_resep × l_resep)`.
- Bulat ↔ kotak: bandingkan luas (π·r² vs p·l).

**7.7 HPP aktual produksi.** Untuk produksi satu resep yang menghasilkan beberapa produk:
1. Biaya adonan terpakai = Σ (takaran resep × skala × harga saat produksi).
2. Biaya adonan dialokasikan ke tiap produk sebanding dengan gram adonan yang dipakai (`gram_per_pcs × pcs_rencana`).
3. `HPP_aktual_produk = (alokasi_adonan + biaya_bahan_langsung + overhead) ÷ pcs_aktual`.
4. Selisih HPP aktual − HPP rencana ditampilkan sebagai indikator penyusutan.

**7.8 Metode harga bahan saat pembelian.**
- **Rata-rata tertimbang (default):**
  ```
  stok_efektif = max(stok_lama, 0)
  harga_baru   = (stok_efektif × harga_lama + qty_beli × harga_beli) ÷ (stok_efektif + qty_beli)
  ```
  Stok minus dianggap 0 agar pembagi tidak nol atau negatif.
- **Harga terakhir:** `harga_baru = harga_beli`.
- Pembatalan pembelian **tidak** mengembalikan harga lama secara otomatis. Pemilik bisa mengoreksi harga manual (tercatat di riwayat).

**7.9 Matriks dampak kejadian.**

| Kejadian | Stok bahan | Stok produk | Kas | Omzet (laporan) |
| --- | --- | --- | --- | --- |
| Pembelian bahan | + | — | keluar | — |
| Batal pembelian | − | — | kas asal ditandai batal | — |
| Produksi selesai | − (resep × skala, + bahan langsung × pcs) | + pcs aktual | — | — |
| Penjualan kasir | − bahan add-on (takaran × qty) | − qty | masuk | + |
| Batal penjualan | + bahan add-on | + qty | kas asal ditandai batal | − |
| PO: DP diterima | — | — | masuk | — |
| PO: pelunasan | — | — | masuk | — |
| PO: diambil & lunas | − bahan add-on | − qty | — (sudah dari DP + pelunasan) | + |
| PO batal, DP dikembalikan | — | — | keluar | — |
| PO batal, DP hangus | — | — | — (sudah masuk) | pendapatan lain |
| Pemasukan bahan sisa | tidak berubah | — | masuk | pendapatan lain |
| Penyesuaian / opname | ± selisih | ± selisih | — | — (nilai selisih dilaporkan) |
| Biaya operasional manual | — | — | keluar | — (biaya operasional) |

**7.10 Penomoran dokumen.** Format `PREFIX-YYMMDD-NNN`, urut per hari, tanpa celah walau ada transaksi bersamaan:
- `NT` nota penjualan
- `PB` pembelian
- `PR` produksi
- `PO` pre-order
- `INV` invoice

**7.11 Laporan laba.**
- `laba_kotor = Σ (subtotal_item − (hpp_satuan + Σ hpp_satuan_add_on) × qty)` dari penjualan berstatus selesai.
- `laba_bersih = laba_kotor + pendapatan_lain − biaya_operasional − nilai_penyesuaian_stok_negatif`.
- `hpp_satuan` di penjualan memakai HPP rencana (dari harga bahan saat transaksi). Kerugian afkir produksi di v1 tidak masuk laba. Kerugian ini dipantau lewat selisih HPP aktual vs rencana di modul Produksi.

**7.12 Add-on.** Per item penjualan, untuk setiap add-on yang dipilih (maks. 1× per add-on):
```
hpp_add_on_per_pcs = takaran_dasar × harga_per_satuan_bahan        (tanpa overhead)
harga_item_per_pcs = harga_satuan_produk + Σ harga_add_on_dipakai
subtotal_item      = qty × harga_item_per_pcs − diskon_item
stok_bahan_add_on  −= takaran_dasar × qty
```
Diskon item berlaku untuk seluruh baris, termasuk add-on. HPP produk (`hpp_satuan`) tidak berubah karena add-on; HPP add-on disimpan terpisah.

## 8. Hak akses

| Fitur | Pemilik | Kasir |
| --- | --- | --- |
| Dashboard | Semua | Omzet & jumlah transaksi hari ini |
| Master bahan, resep, produk, HPP | Lihat & ubah | Tidak |
| Pembelian bahan | Ya | Catat saja (tanpa lihat harga per gram) |
| Penyesuaian & opname | Ya | Tidak |
| Produksi | Ya | Ya (tanpa lihat HPP) |
| Kasir & cetak struk | Ya | Ya |
| Riwayat transaksi | Semua | Hari ini |
| Pembatalan / retur | Ya | Tidak |
| Pre-order & invoice | Ya | Ya |
| Keuangan & laporan laba | Ya | Tidak |
| Pengaturan, pengguna, audit | Ya | Tidak |

Kasir tidak boleh menerima data HPP, harga bahan, atau laba **dari server**, bukan sekadar disembunyikan di tampilan.

## 9. Kebutuhan non-fungsional

| Area | Kebutuhan |
| --- | --- |
| **Perangkat** | Mobile-first (lebar minimum 360 px), tetap nyaman di laptop. Bisa di-install sebagai PWA. |
| **Browser** | Chrome Android, Safari iOS 16+, Chrome/Edge desktop. |
| **Performa** | Halaman kasir siap dipakai < 2 detik di 4G. Simpan transaksi < 1 detik. |
| **Akurasi** | Test otomatis untuk semua rumus §7 dengan contoh angka nyata. Tidak ada `float` JavaScript untuk uang tanpa pembulatan terkontrol. |
| **Integritas** | Setiap operasi yang mengubah stok/kas berjalan dalam satu transaksi database. Data transaksi tidak pernah dihapus, hanya dibatalkan. |
| **Keamanan** | Otorisasi dicek di server untuk setiap aksi. Tabel database tidak bisa diakses langsung lewat API publik Supabase (RLS aktif, deny-all). HTTPS. Rate limit login. |
| **Backup** | Backup database otomatis harian, disimpan minimal 14 hari, di luar Supabase. |
| **Bahasa & format** | Bahasa Indonesia. Format `Rp15.000`, tanggal `3 Nov 2026`, zona waktu Asia/Jakarta (WIB). |
| **Ketersediaan** | Mengikuti SLA Vercel/Supabase. Tanpa mode offline di MVP. |

## 10. Keputusan terbuka (perlu jawaban Khansa)

| # | Pertanyaan | Default yang dipakai jika belum dijawab | Dampak |
| --- | --- | --- | --- |
| K1 | Metode harga bahan: rata-rata tertimbang atau harga terakhir? | Rata-rata tertimbang, bisa diganti di pengaturan | Rumus §7.8 |
| K2 | Overhead masuk HPP per pcs atau hanya biaya operasional bulanan? | Fitur overhead tersedia tapi kosong. Khansa boleh tidak mengisinya. | HPP & laporan laba |
| K3 | Punya angka gram per sendok/cup per bahan, atau perlu ditimbang? | Disediakan daftar konversi umum sebagai saran awal, bisa diedit | Data awal |
| K4 | Dipakai sendiri atau ada kasir dengan akun terpisah? | Dua peran dibangun sejak awal | Hak akses |
| K5 | Printer: sudah punya? 58/80 mm? Bluetooth/USB? HP Android atau iPhone? | Cetak lewat dialog browser, 58 mm | Modul struk, R3 |
| K6 | Internet di toko stabil? | Stabil, tanpa mode offline | R3 |
| K7 | **(baru)** Boleh berlangganan hosting berbayar (±Rp700 rb/bulan) atau harus gratis? | Lihat [PLAN.md §7](PLAN.md#7-hosting--biaya) | Hosting & backup |
| K8 | **(baru)** Produk PO custom (tulisan, warna) dibuat sebagai produk tersendiri, atau produk biasa + catatan? | Produk biasa + catatan, harga bisa diubah per item PO | Struktur PO |
| K9 | **(dijawab)** Aturan add-on? | Berlaku untuk semua produk; 1 bahan per add-on; maks. 1× per item, berlaku untuk semua pcs di baris; harga boleh diubah kasir, harga normal dicatat | §6.4a, §7.12 |

**Data awal dari Khansa:**
- Daftar bahan dan harga beli terakhir
- 3–5 resep adonan utama
- Daftar cetakan dan gram adonan per cetakan
- Harga jual saat ini
- 5 produk acuan beserta HPP hitungan Excel (untuk uji akurasi)

## 11. Risiko

| Risiko | Kemungkinan | Dampak | Mitigasi |
| --- | --- | --- | --- |
| Data resep/konversi awal tidak akurat → HPP salah | Tinggi | Tinggi | Gerbang 1: cocokkan 5 produk acuan dengan hitungan Khansa sebelum lanjut |
| Pencatatan produksi tidak disiplin → stok bahan melenceng | Tinggi | Sedang | Stok minus diizinkan + disorot; opname bulanan |
| Web Bluetooth tidak jalan di iPhone | Pasti (jika iPhone) | Sedang | Struk via dialog cetak browser sebagai jalur utama |
| Scope bertambah di tengah jalan | Sedang | Tinggi | Fase dengan gerbang; fitur baru masuk backlog R3 |
| Biaya hosting tidak disetujui | Sedang | Sedang | Konfirmasi K7 sebelum Fase 0 |
| Kasir lupa catat → selisih kas | Sedang | Sedang | Laporan kas harian per metode, tutup kasir harian (backlog) |

## 12. Glosarium

| Istilah | Arti |
| --- | --- |
| **HPP** | Harga Pokok Produksi per pcs: biaya bahan + overhead |
| **BOM** | Bill of Materials, daftar bahan penyusun |
| **Satuan dasar** | Satuan terkecil penyimpanan bahan: g, ml, atau pcs |
| **Adonan / resep adonan** | Campuran bahan yang hasilnya diukur dalam gram |
| **Cetakan** | Bentuk/ukuran produk akhir (cup, loyang 20×20, bites) |
| **Afkir** | Produk gagal/rusak saat produksi |
| **Opname** | Penghitungan stok fisik untuk dicocokkan dengan sistem |
| **PO** | Pre-order, pesanan dengan tanggal ambil di masa depan |
| **DP** | Uang muka pesanan |
| **Add-on** | Tambahan pilihan pembeli saat membeli (mis. extra keju), hanya dihitung jika dipilih |
