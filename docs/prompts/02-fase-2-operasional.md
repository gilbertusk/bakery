# Fase 2 — Operasional Harian (Pembelian, Stok, Produksi, Kasir)

Tujuan fase: toko bisa memakai aplikasi setiap hari untuk belanja bahan, produksi, dan jualan. Fase ini diakhiri dengan **MVP go-live**.

Urutan: 2.11 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5a → 2.5b → 2.6a → 2.6b → 2.7 → 2.8 → 2.9 → 2.10 → 2.12 → 🚦 Gerbang 2

(2.11 Pengaturan dikerjakan pertama karena metode harga dan izin stok minus dipakai oleh pembelian dan kasir.)

---

## 2.11 — Pengaturan toko & parameter hitung

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-SET-01, F-SET-02, docs/ERD.md (pengaturan_toko).
Ini langkah 2.11 (dikerjakan pertama di Fase 2). Hanya pemilik.

TUGAS
1. src/features/pengaturan/queries.ts:
   - ambilPengaturan(): dibungkus unstable_cache / cache dengan tag 'pengaturan'
   - dipakai di semua tempat yang butuh pengaturan; ganti query langsung yang sudah ada
2. Halaman /pengaturan berupa menu kartu: Toko, Perhitungan, Biaya Tambahan (link 1.9), Impor Data (link 1.11), dan placeholder Pengguna, Audit, Integritas, Ekspor.
3. /pengaturan/toko — form:
   - nama toko, alamat, telepon, footer struk (≤ 200 karakter, multi-baris)
   - info pembayaran (rekening untuk invoice)
   - ukuran kertas struk (58/80 mm, dengan gambar ilustrasi lebar)
   - logo: upload ke bucket 'publik' path logo/ (buat bucket ini dengan cara yang sama seperti bucket 'produk' di langkah 1.7); validasi server png/jpg/webp ≤ 1 MB; disarankan hitam-putih untuk struk
   - pratinjau struk contoh di samping (komponen struk dibuat lebih awal secara sederhana; disempurnakan di 2.7)
4. /pengaturan/perhitungan — form:
   - metode harga bahan (rata-rata tertimbang / harga terakhir) dengan penjelasan + contoh angka masing-masing
   - target margin default (%)
   - izinkan stok produk minus saat menjual (switch + penjelasan risikonya)
   - pembulatan saran harga (100/500/1.000)
   - peringatan: mengubah metode harga tidak menghitung ulang harga bahan lama
5. Action simpanPengaturanToko & simpanPengaturanHitung:
   - catatAudit (data lama/baru)
   - revalidateTag('pengaturan')
6. Test integrasi: simpan + audit; kasir ditolak; nilai di luar batas ditolak.

SELESAI JIKA
Perubahan pengaturan langsung terlihat di nama toko pada header dan di saran harga produk.
~~~

---

## 2.1 — Pembelian bahan 🧭🧪

Est. 1,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-STK-01, §7.2, §7.8, §7.9, §8 (kasir boleh mencatat pembelian tanpa melihat harga per satuan), docs/ERD.md (pembelian, pembelian_item, riwayat_harga).
Pakai: lib/hpp (kemasanKeDasar, hargaPerSatuanDasar, hargaBaruBahan), lib/stok (catatMutasi), lib/kas (catatKas), lib/nomor (ambilNomor), ambilPengaturan.
Ini langkah 2.1.

TUGAS
1. schemas.ts:
   - header { tanggal (≤ hari ini), supplierId?, akunBayar: tunai|rekening, catatan? }
   - items min 1: { bahanId, jumlahKemasan > 0, isiPerKemasan > 0, satuanKemasan, totalHarga ≥ 0 }

2. Action simpanPembelian (peran pemilik & kasir) dalam SATU transaksi:
   a. no = ambilNomor(tx, 'PB')
   b. insert pembelian + items:
      - qty_dasar = kemasanKeDasar(jumlah × isi)
      - harga_per_satuan = total ÷ qty_dasar
   c. untuk setiap item, BERURUTAN (bahan sama bisa muncul dua kali):
      - SELECT bahan FOR UPDATE (stok, harga)
      - hargaBaru = hargaBaruBahan(metode dari pengaturan, …)
      - UPDATE harga bahan
      - insert riwayat_harga (sumber pembelian, pembelian_item_id)
      - catatMutasi jenis 'pembelian' qty +qty_dasar, nilaiSatuan = harga beli, izinkanMinus true
   d. catatKas keluar, kategori KATEGORI_KAS.PEMBELIAN_BAHAN, akun sesuai input, nominal = total, sumber pembelian
   e. total pembelian = Σ total_harga item (hitung di server)
   f. total 0 (mis. bahan gratis/hibah): tidak membuat kas
   Return untuk pemilik: { id, no, perubahanHarga: [{ bahan, lama, baru, persen }] }
   Return untuk kasir: { id, no } saja

3. Halaman /pembelian:
   - daftar: no, tanggal, supplier, jumlah item, total, status; filter tanggal & supplier
   - kasir hanya melihat pembelian yang dia buat hari ini

4. /pembelian/baru — form cepat untuk HP:
   - header ringkas (tanggal default hari ini, supplier, dibayar dari Tunai/Rekening)
   - item: bahan (combobox; menampilkan satuan dasar), "jumlah [2] × isi [1] [kg ▾]", total harga Rp
   - tampilkan "= 2.000 g"
   - KHUSUS pemilik: "Rp13,5/g (sebelumnya Rp13/g, ▲3,8%)"
   - total keseluruhan sticky di bawah
   - setelah simpan (pemilik): ringkasan perubahan harga bahan + jumlah produk yang HPP-nya naik

5. /pembelian/[id] — detail
   - kolom harga per satuan hanya untuk pemilik
   - tombol Batalkan (langkah 2.2)

6. Tab "Riwayat Harga" di detail bahan menampilkan entri baru ini.

7. Test integrasi:
   - rata-rata tertimbang & harga terakhir sesuai pengaturan
   - dua item bahan sama dalam satu nota → harga & stok benar berurutan
   - kas keluar di akun yang benar
   - satu item tidak valid → seluruh transaksi rollback (tidak ada stok/kas/nomor yang tersisa)
   - respons untuk kasir tidak memuat harga per satuan / perubahan harga
   - stok minus sebelumnya + pembelian → harga mengikuti aturan max(stok, 0)

SELESAI JIKA
Pembelian dari HP < 1 menit untuk 3 item, stok dan harga bahan ter-update, HPP produk ikut berubah.
~~~

---

## 2.2 — Pembatalan pembelian 🧪

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-STK-01 KP3, §7.8 (harga tidak dikembalikan otomatis), §7.9, docs/ERD.md §4.5 (catatan pembatalan kas).
Ini langkah 2.2. Hanya pemilik.

TUGAS
1. Action batalkanPembelian({ pembelianId, alasan (min 5 karakter) }) dalam satu transaksi:
   - kunci baris pembelian (FOR UPDATE)
   - tolak jika sudah batal
   - setiap item → catatMutasi 'batal_pembelian' qty −qty_dasar, izinkanMinus true (catat bahan yang jadi minus)
   - batalkanKasDariSumber('pembelian', id)
   - update status batal + alasan
   - catatAudit aksi 'batal'
   - return daftar bahan yang menjadi minus
2. UI di /pembelian/[id]:
   - tombol "Batalkan pembelian" → AlertDialog dengan alasan wajib
   - penjelasan: "Stok bahan akan dikurangi kembali. Harga bahan TIDAK dikembalikan otomatis; ubah manual di halaman bahan bila perlu."
   - Setelah batal: badge BATAL, alasan, siapa, kapan. Tautan ke bahan yang harganya mungkin perlu dikoreksi.
3. Test integrasi:
   - stok & kas kembali, harga tetap
   - batal dua kali ditolak
   - kasir ditolak
   - invarian stok (Σ mutasi = stok cache) terjaga

SELESAI JIKA
Pembatalan aman dan tercatat lengkap.
~~~

---

## 2.3 — Kartu stok & ringkasan stok

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-STK-02, F-STK-06, docs/ERD.md (stok_mutasi), §7.
Ini langkah 2.3.

TUGAS
1. src/features/stok/queries.ts:
   - kartuStok({ target: { bahanId } | { produkId }, dari, sampai, halaman }):
     - saldo awal periode (saldo_sesudah dari mutasi terakhir sebelum 'dari', atau 0)
     - daftar mutasi: waktu, jenis, qty, saldo_sesudah, nilai_satuan, alasan, nomor dokumen sumber (join ke pembelian/produksi/penjualan/opname untuk ambil no-nya), nama pengguna
     - total masuk, total keluar, saldo akhir
     - paginasi 50 baris
   - ringkasanStok({ jenis: 'bahan'|'produk', filter }):
     - bahan: stok, satuan, stok minimal, status, nilai stok (stok × harga — pemilik saja)
     - produk: stok, nilai (stok × HPP saat ini — pemilik saja)
   - Rentang tanggal memakai rentangHariWib.

2. UI:
   - Tab "Kartu Stok" di /bahan/[id] dan /produk/[id]:
     - filter rentang (default 30 hari)
     - label jenis berbahasa Indonesia (Pembelian, Pemakaian produksi, Hasil produksi, Penjualan, Batal penjualan, Penyesuaian, Opname, Stok awal, …)
     - qty berwarna hijau (+) / merah (−)
     - nomor sumber bisa diklik
   - /stok: dua tab Bahan | Produk
     - filter status (semua/menipis/minus), cari
     - total nilai stok di atas (pemilik)
     - tombol aksi per baris: Penyesuaian (2.4), Kartu stok
   - Kasir: /stok tidak tersedia (sesuai navigasi)

3. Label jenis mutasi di satu tempat: src/features/stok/label.ts.

4. Test integrasi: saldo awal periode benar, total masuk/keluar benar, paginasi, kasir ditolak.

SELESAI JIKA
Saya bisa menelusuri ke mana perginya 1 kg tepung dari kartu stoknya.
~~~

---

## 2.4 — Penyesuaian stok 🧪

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-STK-03, §7.9, §7.11 (nilai penyesuaian negatif mengurangi laba).
Ini langkah 2.4. Hanya pemilik.

TUGAS
1. Action sesuaikanStok({ target, arah: 'tambah'|'kurang', qty > 0, alasanJenis, catatan }):
   - alasanJenis: rusak | kedaluwarsa | tumpah | selisih_hitung | sampel_gratis | lainnya
   - catatan wajib jika 'lainnya'
   - alasan disimpan "Rusak: <catatan>"
   - produk: qty bulat
   - nilaiSatuan: bahan = harga_per_satuan saat ini; produk = HPP saat ini (hppUntukSnapshot)
   - catatMutasi jenis 'penyesuaian', izinkanMinus false (tolak jika hasil minus; pesan menyebut stok saat ini)
   - catatAudit
2. UI: dialog "Sesuaikan stok" dari /stok, detail bahan, dan detail produk:
   - menampilkan stok sekarang → stok sesudah, dan nilai Rp perubahan
3. Test integrasi:
   - nilai_satuan terisi
   - alasan wajib
   - minus ditolak
   - kasir ditolak

SELESAI JIKA
Penyesuaian muncul di kartu stok dengan alasan dan nilainya.
~~~

---

## 2.5a — Produksi: logika server 🧭🧪

Est. 1,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PRO-01 s.d. F-PRO-04, §7.7, §7.9, docs/ERD.md (produksi, produksi_hasil).
Pakai: lib/hpp (pemakaianBahanProduksi, alokasiProduksi, hitungHppProduk), features/hpp/queries, lib/stok, lib/nomor.
Ini langkah 2.5a: HANYA server action + query + test. UI di 2.5b.

TUGAS
1. schemas.ts:
   - draft: { tanggal, resepAdonanId, faktorSkala > 0 (≤ 10), catatan?, hasil: [{ produkId, pcsRencana > 0 }] min 1, produk unik }
   - penyelesaian: { produksiId, hasil: [{ produkId, pcsAktual ≥ 0, pcsAfkir ≥ 0 }] }

2. Validasi draft:
   - setiap produk harus punya komponen adonan dengan resep ini
   - hitung kebutuhan gram = Σ gramPerPcs × pcsRencana vs tersedia = hasil_gram × skala
   - jika melebihi: BOLEH disimpan, kembalikan peringatan "Adonan kurang ±X g"

3. Actions (pemilik & kasir):
   - buatDraftProduksi → ambilNomor 'PR', status draft, insert produksi_hasil (pcs_rencana)
   - ubahDraftProduksi (hanya status draft)
   - hapusDraftProduksi (hanya draft; boleh dihapus karena belum ada efek)
   - selesaikanProduksi dalam SATU transaksi:
     a. kunci produksi (FOR UPDATE), harus draft
     b. ambil konteks HPP untuk produk terkait (harga bahan saat ini)
     c. pemakaian = pemakaianBahanProduksi(resep utama × skala, adonan lain proporsional, bahan langsung × pcsAktual)
     d. untuk tiap bahan: catatMutasi 'produksi_pakai' qty −pemakaian, nilaiSatuan harga, izinkanMinus true (kumpulkan bahan yang jadi minus untuk peringatan)
     e. biaya_adonan = Σ takaran resep utama × skala × harga → simpan di produksi
     f. hppRencana per produk = hitungHppProduk (2 desimal)
     g. hppAktual = alokasiProduksi(...)
     h. update produksi_hasil (pcs_aktual, pcs_afkir, hpp_rencana, hpp_aktual)
     i. untuk produk dengan pcsAktual > 0: catatMutasi 'produksi_hasil' qty +pcsAktual, nilaiSatuan hppAktual
     j. status selesai
     Return:
     - pemilik: ringkasan HPP rencana vs aktual
     - kasir: tanpa HPP
     - peringatan bahan minus
   - batalkanProduksi({ produksiId, alasan }) — pemilik, hanya status selesai, satu transaksi:
     - cari semua stok_mutasi sumber produksi ini → buat mutasi pembalik 'batal_produksi' (produk boleh minus? JANGAN: tolak jika stok produk tidak cukup karena sudah terjual; pesan jelas)
     - status batal, audit

4. queries.ts:
   - daftarProduksi(filter)
   - detailProduksi(id) — kasir mendapat DTO tanpa biaya/HPP
   - produkUntukResep(resepId) (produk aktif yang memakai resep + gramPerPcs)
   - kebutuhanBahanDraft(produksiId | input): daftar bahan, butuh, stok, kurang (untuk UI 2.5b)

5. Test integrasi (fixture Brownies: Cup 12 pcs + Bites 24 pcs, skala 1):
   - stok bahan berkurang tepat (resep × skala + kemasan cup × 12)
   - stok produk bertambah sesuai pcs aktual (mis. 11 dan 24 dengan afkir 1)
   - hpp_aktual Cup > hpp_rencana karena afkir
   - produk dengan adonan kedua → bahan resep kedua terpotong proporsional
   - bahan jadi minus → tetap sukses + peringatan
   - error di tengah → rollback total
   - batalkan → semua stok kembali; batal ditolak jika produk sudah terjual
   - kasir: respons tanpa HPP

SELESAI JIKA
Semua test lulus. Invarian Σ mutasi = stok cache terjaga di semua skenario.
~~~

---

## 2.5b — Produksi: tampilan

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md dan docs/PRD.md F-PRO-01 s.d. F-PRO-04.
Logika server produksi sudah ada di src/features/produksi (langkah 2.5a). Ini langkah 2.5b: UI. Pemilik & kasir (kasir tanpa angka HPP/biaya).

TUGAS
1. /produksi — daftar:
   - tab Draft | Selesai | Batal
   - kartu: no, tanggal, resep × skala, produk ringkas ("Cup 12 · Bites 24"), status
   - tombol "Produksi baru"

2. /produksi/baru — wizard 3 langkah (stepper, nyaman di HP):
   a. Pilih resep + skala
      - tombol cepat 1× 1,5× 2× + input
      - tautan "Hitung dari ukuran loyang" membuka KalkulatorSkala (1.6) yang mengembalikan faktor
   b. Pilih produk yang dicetak (hanya produk yang memakai resep ini) + pcs rencana
      - bar "Adonan terpakai 1.050 / 1.200 g"; merah jika lebih
      - tombol "Isi sisa adonan" untuk produk terpilih
   c. Ringkasan:
      - tabel kebutuhan bahan vs stok (yang kurang disorot)
      - catatan
      - Simpan draft

3. /produksi/[id]:
   - Draft: tombol Ubah, Hapus, dan "Selesaikan"
     → form pcs aktual & afkir per produk (default = rencana), konfirmasi, lalu tampilkan hasil
   - Selesai:
     - tabel produk: rencana, aktual, afkir
     - pemilik juga melihat HPP rencana, HPP aktual, selisih % (merah jika > 5%)
     - daftar bahan terpakai
     - peringatan bahan minus
   - Pemilik: tombol "Batalkan produksi" dengan alasan

4. Di detail resep dan detail produk: tab "Riwayat produksi" (5 terakhir + tautan).

5. Kasir tidak pernah melihat angka biaya/HPP (data memang tidak dikirim dari server).

SELESAI JIKA
Alur produksi Brownies dari draft sampai selesai bisa dilakukan di HP dalam < 2 menit.
~~~

---

## 2.6a — Kasir: logika server 🧭🧪

Est. 1,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-POS-02 s.d. F-POS-04, §7.9, §7.10, docs/ERD.md (penjualan, penjualan_item, termasuk kunci_idempoten).
Pakai: hppUntukSnapshot, lib/stok, lib/kas, lib/nomor, ambilPengaturan.
Ini langkah 2.6a: HANYA logika server, query, dan test. UI di 2.6b.

TUGAS
1. src/features/penjualan/inti.ts — fungsi buatPenjualan(tx, input, opsi) yang DIPAKAI ULANG oleh kasir dan oleh PO (langkah 3.3):
   - input:
     {
       items: [{ produkId, qty, hargaSatuan?, diskon: { jenis: 'rp'|'persen', nilai } }],
       diskonNota: { jenis, nilai },
       metodeBayar,
       dibayar?,
       catatan?,
       preOrderId?,
       kunciIdempoten?,
       dibuatOleh
     }
   - opsi: { catatKas: boolean, hargaDariInput: boolean }
   Alur:
   a. Jika kunciIdempoten sudah ada di tabel → kembalikan penjualan yang sudah ada (jangan buat baru)
   b. Ambil produk dari DB (nama, harga_jual, dijual, aktif). Harga dari client DIABAIKAN kecuali opsi.hargaDariInput (khusus PO)
   c. Hitung per item:
      - diskon persen → rupiah dibulatkan KE BAWAH
      - subtotal = qty × harga − diskon
   d. subtotal nota, diskonNota (persen dari subtotal, bulat ke bawah), total
   e. Tunai: dibayar wajib ≥ total, kembalian = dibayar − total. Non-tunai: dibayar = total, kembalian 0
   f. hpp_satuan = hppUntukSnapshot(tx, produkIds)
   g. no = ambilNomor('NT'); insert penjualan + items (nama_produk & harga snapshot)
   h. catatMutasi 'penjualan' −qty per item, izinkanMinus = pengaturan.izinkan_stok_produk_minus
      → StokTidakCukupError dengan nama produk & stok tersedia
   i. jika opsi.catatKas dan total > 0: catatKas masuk KATEGORI_KAS.PENJUALAN, akun = akunDariMetode(metode)
   j. return { id, noNota, total, kembalian }

2. Action simpanPenjualanKasir (pemilik & kasir) = aksi() yang memanggil buatPenjualan dengan catatKas true, hargaDariInput false, di dalam db.transaction.
   Validasi:
   - qty bulat 1–999
   - diskon tidak melebihi subtotal
   - produk harus aktif & dijual
   - maksimal 100 baris item

3. queries.ts:
   - produkKasir(): DTO { id, nama, kategori, hargaJual, stok, fotoUrl } — TANPA HPP; hanya produk aktif & dijual
   - detailPenjualan(id, peran): DTO kasir tanpa hpp_satuan/laba; DTO pemilik dengan laba per item

4. Test integrasi:
   - total & kembalian benar, termasuk diskon persen item + nota
   - harga yang dikirim client diabaikan
   - stok tidak cukup (pengaturan melarang minus) → gagal, tidak ada data tersisa
   - stok minus diizinkan → sukses
   - kunci idempoten sama dikirim 2× → satu nota saja, return identik
   - 2 penjualan paralel produk stok 1 dengan minus dilarang → tepat satu sukses
   - kas masuk akun tunai vs rekening sesuai metode
   - hpp_satuan terisi 2 desimal
   - produkKasir & detailPenjualan kasir tidak memuat field hpp
   - nomor nota berurutan

SELESAI JIKA
Semua test lulus. Coverage src/features/penjualan ≥ 90%.
~~~

---

## 2.6b — Kasir: tampilan 🧭

Est. 1,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-POS-01 s.d. F-POS-04 dan §9 (performa < 2 detik, mobile-first).
Logika server kasir sudah ada (langkah 2.6a). Ini langkah 2.6b: UI kasir. Ini layar yang paling sering dipakai — utamakan kecepatan dan tombol besar.

TUGAS
1. Pasang @tanstack/react-query; QueryClientProvider hanya di layout kasir (bukan global).
2. /kasir — layout khusus (tanpa bottom nav agar layar luas; ada tombol kembali ke menu):
   - HP (< md):
     - pencarian di atas, chip kategori (scroll horizontal)
     - grid produk 2 kolom
     - tombol melayang "Keranjang · 3 item · Rp45.000" → Sheet/Drawer keranjang
   - Tablet/desktop (≥ md): grid produk kiri, panel keranjang kanan permanen
3. Kartu produk:
   - foto (rasio 1:1, lazy), nama 2 baris, harga
   - badge stok kecil ("sisa 3"); stok ≤ 0 tampil redup + label "Habis" (masih bisa ditambah jika pengaturan mengizinkan minus, setelah konfirmasi)
   - Ketuk = tambah 1; tekan lama/ikon = atur qty
4. Data produk via React Query (staleTime 30 detik), refetch setelah transaksi sukses. Filter & cari dilakukan di client (instan).
5. State keranjang: useReducer + persist ke sessionStorage (selamat dari reload tidak sengaja).
   Kunci idempoten (crypto.randomUUID) dibuat sekali per percobaan bayar; diganti setelah sukses atau setelah keranjang berubah.
6. Keranjang:
   - per item: nama, stepper qty, harga, subtotal, tombol diskon item (dialog rp/%), hapus
   - diskon nota, catatan
   - ringkasan subtotal/diskon/total
   - tombol "Kosongkan" (konfirmasi)
7. Dialog Bayar:
   - tab Tunai | Transfer | QRIS
   - Tunai:
     - input nominal (InputRupiah, keyboard numerik)
     - tombol cepat: Uang pas, lalu pembulatan ke atas 5rb/10rb/20rb/50rb/100rb yang relevan
     - kembalian besar dan jelas
     - tombol Simpan disabled jika kurang
   - Transfer/QRIS: teks "Pastikan dana sudah masuk" + Simpan
   - Saat menyimpan: tombol loading, cegah klik ganda
   - Error stok tidak cukup → tampilkan nama produk & sisa stok, keranjang tetap utuh
8. Layar sukses:
   - centang besar, no nota, total, kembalian (jika tunai)
   - tombol: Cetak Struk (2.7), Kirim WhatsApp (2.7), Transaksi Baru (fokus kembali ke pencarian)
9. Aksesibilitas:
   - semua tombol punya label
   - target ≥ 44 px
   - Enter di pencarian menambah produk jika hasilnya tepat satu
10. Test e2e Playwright (project mobile):
    login kasir → tambah 2 produk → diskon nota 10% → bayar tunai 50.000 → kembalian benar → layar sukses → stok produk berkurang di daftar.
    Gunakan seed contoh + user kasir test (buat helper e2e untuk login).

SELESAI JIKA
Transaksi 3 item tunai bisa diselesaikan < 30 detik di HP. E2E lulus.
~~~

---

## 2.7 — Struk thermal & kirim WhatsApp 🧪👤

Est. 1 hari · Siapkan printer thermal Khansa untuk uji coba jika sudah ada.

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-POS-05, F-POS-06, keputusan K5, docs/PLAN.md §2 (struk via dialog cetak browser).
Ini langkah 2.7.

TUGAS
1. src/features/struk/data.ts — dataStruk(penjualanId): data murni untuk struk:
   toko (nama, alamat, telp, logo, footer, ukuran kertas), no nota, waktu WIB, kasir, item, subtotal, diskon, total, metode, dibayar, kembalian, status batal.
   TANPA HPP.

2. Route /cetak/struk/[id] (di luar grup (app), tanpa navigasi, requirePengguna):
   - CSS khusus cetak:
     - @page { size: 58mm auto; margin: 0 } atau 80mm sesuai pengaturan
     - lebar konten 48 mm / 72 mm
     - font monospace 11–12 px, hitam pekat, tanpa warna/bayangan
   - Tata letak: logo (grayscale, maks lebar 40 mm, opsional) · nama toko tebal · alamat/telp · garis putus · no nota & tanggal & kasir · item (nama di baris sendiri, "2 x 15.000" kiri, subtotal kanan, diskon di bawahnya) · garis · subtotal/diskon/TOTAL tebal · bayar/kembalian · metode · garis · footer · "*** BATAL ***" besar jika batal
   - Jika ?cetak=1: komponen client memanggil window.print() setelah gambar logo dimuat, lalu menampilkan tombol "Kembali ke kasir"
   - Tombol "Cetak" dan "Tutup" disembunyikan saat print (@media print)

3. src/features/struk/teks.ts — teksStruk(data, lebarKolom = 32): string untuk WhatsApp/ESC-POS nanti
   - rata kiri-kanan dengan padding spasi
   - nama panjang dipotong ke baris berikutnya
   - Unit test dengan snapshot untuk 58 mm (32 kolom) dan 80 mm (48 kolom)

4. Kirim WhatsApp:
   - dialog opsional untuk nomor HP pembeli (normalisasi 08 → 628, validasi)
   - buka https://wa.me/<nomor>?text=<teks> (tanpa nomor: https://wa.me/?text=)
   - teks berisi ringkasan struk + footer
   - JANGAN simpan nomor pembeli ke database (privasi)

5. Integrasikan tombol di layar sukses kasir (2.6b) dan di detail penjualan (2.8).

6. Panduan singkat docs/panduan/cetak-struk.md:
   - Android: pasang printer sebagai printer sistem lewat aplikasi pabrik/RawBT, lalu pilih saat dialog cetak muncul
   - iPhone: AirPrint atau aplikasi printer
   - Desktop: driver printer
   - Pengaturan dialog: ukuran kertas, margin none, skala 100%

SELESAI JIKA
- Struk tampil rapi di pratinjau cetak Chrome dengan kertas 58 mm dan 80 mm
- Teks WhatsApp rapi
- Unit test lulus

LAPORAN AKHIR
Hal yang harus saya uji langsung dengan printer Khansa.
~~~

---

## 2.8 — Riwayat & pembatalan penjualan 🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-POS-07, F-POS-08, §7.9, §8, docs/ERD.md §4.5 (pembatalan menandai kas asal).
Ini langkah 2.8.

TUGAS
1. queries.ts — daftarPenjualan({ dari, sampai, metode, status, q (no nota) }, pengguna):
   - kasir: dipaksa di server hanya hari ini (WIB), apa pun filternya
   - ringkasan di atas: jumlah transaksi, total omzet, per metode bayar
   - pemilik juga: laba kotor periode

2. /penjualan:
   - filter tanggal (default hari ini; kasir tidak bisa mengubah), metode, status
   - daftar kartu: no, jam, item ringkas, total, metode, badge BATAL

3. /penjualan/[id]:
   - detail item
   - pemilik: kolom HPP & laba per item + total laba
   - tombol Cetak ulang struk, Kirim WhatsApp
   - pemilik: tombol "Batalkan transaksi"

4. Action batalkanPenjualan({ penjualanId, alasan min 5 }) — pemilik, satu transaksi:
   - kunci baris; tolak jika sudah batal
   - tolak jika pre_order_id terisi (pesan: "Transaksi dari pre-order tidak bisa dibatalkan di sini")
   - per item: catatMutasi 'batal_penjualan' +qty
   - batalkanKasDariSumber('penjualan', id)
   - set status batal, alasan, dibatalkan_oleh/pada
   - catatAudit

5. Test integrasi:
   - kasir tidak bisa melihat transaksi kemarin walau mengirim filter tanggal
   - batal → stok & kas kembali, laporan omzet tidak menghitungnya
   - batal ganda ditolak
   - batal penjualan dari PO ditolak
   - kasir tidak bisa membatalkan

SELESAI JIKA
Pemilik bisa membatalkan nota salah input, dan semua angka kembali konsisten.
~~~

---

## 2.9 — Dashboard dasar

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-DSH-01, F-DSH-02, F-DSH-04, §8 (dashboard kasir terbatas), §7.11.
Ini langkah 2.9.

TUGAS
1. src/features/laporan/queries.ts (akan dipakai lagi di 2.10 dan 3.8):
   - ringkasanPenjualan({ mulai, selesai }):
     { omzet, jumlahTransaksi, rataRata, hppTerjual, labaKotor, perMetode: { tunai, transfer, qris } }
     - hanya status selesai
     - SATU query agregasi SQL
   - bahanPerluPerhatian(): bahan stok ≤ minimal atau < 0, urut minus dulu
   - produkMarginRendah(): dari hppSemuaProduk, diBawahTarget = true

2. /dashboard (server component):
   - Pemilik:
     - kartu: Omzet hari ini, Transaksi, Laba kotor, Rata-rata per nota (bandingkan dengan kemarin: ▲/▼ %)
     - daftar "Bahan perlu dibeli" (maks 5 + tautan ke /stok?status=menipis)
     - "Produk margin rendah" (maks 5)
     - placeholder kartu "Pre-order hari ini & besok" (diisi di 3.4)
     - tombol aksi cepat: Kasir, Catat Pembelian, Produksi Baru
   - Kasir: kartu Omzet hari ini & Jumlah transaksi + tombol cepat Kasir. Tidak ada laba/HPP.
   - Skeleton saat memuat (Suspense per kartu)
   - Angka besar mudah dibaca di HP

3. Test integrasi ringkasanPenjualan:
   - transaksi batal tidak dihitung
   - batas hari WIB benar (transaksi 23.30 WIB masuk hari itu; 00.30 WIB masuk hari berikutnya)
   - laba kotor = Σ subtotal − Σ hpp×qty

SELESAI JIKA
Dashboard pemilik dan kasir tampil sesuai peran dengan angka yang benar.
~~~

---

## 2.10 — Laporan harian

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-LAP-01, §7.11.
Pakai ringkasanPenjualan dari src/features/laporan/queries.ts. Ini langkah 2.10. Hanya pemilik.

TUGAS
1. Query tambahan:
   - penjualanPerProduk({ mulai, selesai }): produk, qty, omzet, hpp, laba, margin % (urut omzet)
   - transaksiBatal({ mulai, selesai })
2. /laporan/harian?tanggal=YYYY-MM-DD (default hari ini, tombol ◀ ▶ hari):
   - ringkasan: omzet, diskon total, transaksi, HPP terjual, laba kotor, margin %
   - per metode bayar (untuk mencocokkan uang di laci & rekening)
   - tabel per produk
   - daftar transaksi batal + alasan
   - tombol Cetak (CSS print A4 rapi)
3. /laporan: halaman indeks berisi tautan Harian (dan placeholder laporan periode untuk 3.8).
4. Test integrasi untuk penjualanPerProduk.

SELESAI JIKA
Laporan harian bisa dicetak dan cocok dengan dashboard.
~~~

---

## 2.12 — PWA (bisa di-install)

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PLAN.md §2 (PWA: manifest + cache app shell saja; offline penuh ditunda ke R3).
Ini langkah 2.12.

TUGAS
1. src/app/manifest.ts:
   - name "Toko Kue Khansa" (ambil dari pengaturan jika memungkinkan; jika tidak, statis)
   - short_name "Toko Kue"
   - start_url "/dashboard", display standalone
   - theme_color & background_color sesuai tema
   - lang "id"
   - ikon 192, 512, dan maskable 512
   - shortcuts: Kasir, Produksi Baru
2. Ikon: script scripts/buat-ikon.ts (pakai sharp, dependency dev) dari satu file sumber public/ikon-sumber.svg (buat ikon kue sederhana). Hasilkan juga apple-touch-icon dan favicon.
3. Service worker dengan Serwist (@serwist/next, versi yang kompatibel dengan versi Next.js proyek; jika ada masalah dengan Turbopack, ikuti dokumentasi resmi Serwist):
   - precache aset statis build
   - JANGAN cache halaman HTML ber-autentikasi atau respons data/server action
   - navigasi gagal saat offline → halaman /offline ("Tidak ada koneksi internet. Transaksi belum bisa disimpan.") dengan tombol Coba lagi
   - nonaktif saat development
4. Tombol "Pasang aplikasi" di menu pengguna:
   - Android/desktop: beforeinstallprompt
   - iOS: dialog petunjuk "Bagikan → Tambah ke Layar Utama"
   - sembunyikan jika sudah standalone
5. Banner kecil "Koneksi terputus" saat navigator.onLine false (global), hilang saat online.
6. Test e2e: /manifest.webmanifest bisa diakses dan valid; /offline tampil.

SELESAI JIKA
Lighthouse (Chrome DevTools) menyatakan aplikasi installable. Aplikasi bisa dipasang di HP Android dan iPhone.
~~~

---

## 🚦 Gerbang 2 — Uji coba di toko (MVP go-live)

### G2a — Cek integritas & persiapan uji coba

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/ERD.md §7 (invarian), docs/PLAN.md §4 (Gerbang 2).
Kita akan melakukan uji coba 3 hari di toko. Siapkan alat bantu verifikasi.

TUGAS
1. src/features/integritas/cek.ts — cekIntegritas(db) untuk semua invarian ERD §7.
   - setiap pelanggaran: { invarian, entitas, id, nama/no, nilaiSeharusnya, nilaiSebenarnya }
   - invarian 4 & 5 (PO) dilewati jika tabel PO belum dipakai
2. Halaman /pengaturan/integritas (pemilik):
   - tombol "Jalankan pemeriksaan" → hasil hijau "Semua data konsisten" atau daftar masalah
   - TIDAK ada perbaikan otomatis
3. Script pnpm cek-integritas (CLI) untuk dijalankan di CI terhadap DB test setelah test integrasi.
4. Test integrasi:
   - data sehat → 0 pelanggaran
   - sengaja rusak bahan.stok via SQL → terdeteksi
5. Buat docs/gerbang/checklist-gerbang-2.md berisi lembar uji harian untuk diisi bersama Khansa:
   - kas tunai di aplikasi vs uang di laci
   - transfer+QRIS di aplikasi vs mutasi rekening
   - stok produk per produk: aplikasi vs fisik
   - struk tercetak OK/tidak
   - masalah yang ditemui (deskripsi, jam, siapa)

SELESAI JIKA
Pemeriksaan integritas bisa dijalankan dari aplikasi dan CLI.
~~~

### G2b — Evaluasi hasil uji coba

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md dan docs/gerbang/checklist-gerbang-2.md yang sudah saya isi dengan hasil uji coba 3 hari.

TUGAS
1. Ringkas semua masalah yang tercatat. Klasifikasikan:
   - bug P0 (salah hitung, data hilang, tidak bisa transaksi)
   - bug P1
   - permintaan perubahan / fitur baru (masuk backlog, tidak dikerjakan sekarang)
2. Untuk setiap selisih kas/stok, telusuri penyebabnya dari kartu stok, kas, dan audit:
   - salah input pengguna
   - transaksi tidak tercatat
   - bug
3. Jalankan cekIntegritas di database dev/produksi (read-only) dan laporkan hasilnya.
4. Tulis docs/gerbang/hasil-gerbang-2.md: tabel masalah, akar masalah, usulan perbaikan, status LULUS/BELUM.
5. Jangan memperbaiki apa pun dulu. Untuk bug P0, sertakan rencana test yang mereproduksi.

LAPORAN AKHIR
Status Gerbang 2 dan daftar bug P0 yang harus diperbaiki sebelum go-live.
~~~

Setelah lulus: jalankan **U1** dan **U5** dari [README](README.md), lalu MVP siap dipakai penuh.
