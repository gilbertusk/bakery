# Fase 1 — Master Bahan, Resep, Produk & HPP

Tujuan fase: Khansa bisa memasukkan bahan, resep, dan produk, lalu melihat HPP, margin, dan saran harga yang akurat.

Urutan: 1.1a → 1.1b → 1.4 → 1.2 → 1.3 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9 → 1.10 → 1.11 → 🚦 Gerbang 1

(1.4 Supplier dikerjakan sebelum 1.2 karena form bahan memakai pilihan supplier.)

---

## 1.1a — Mesin hitung bagian 1: konversi, harga, adonan, margin, skala 🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, lalu docs/PRD.md §7.1–7.6 dan §7.8 dengan teliti, serta F-RSP-02 KP1.
Ini langkah 1.1a: fungsi hitung murni di src/lib/hpp/. TDD WAJIB: tulis test dulu, jalankan (merah), baru implementasi (hijau).

ATURAN UMUM
- Semua fungsi MURNI: tanpa akses DB, tanpa Date.now, tanpa efek samping.
- Input/output angka bertipe Decimal (pakai D() dari src/lib/angka). Jangan pernah memakai operator number untuk hitungan.
- Pembulatan TIDAK dilakukan di dalam fungsi ini, kecuali yang memang fungsinya membulatkan (saranHarga, pcsPerResep).
- Kesalahan input → lempar HitungError dengan pesan Indonesia (mis. "Hasil adonan harus lebih dari 0").
- Setiap file punya file test berdampingan (*.test.ts).

FILE & FUNGSI
1. konversi.ts
   - keSatuanDasar(takaran, nilaiKonversi | null): Decimal (null = sudah satuan dasar)
   - kemasanKeDasar(jumlah, satuanKemasan: 'kg'|'g'|'l'|'ml'|'pcs'|'lusin', satuanDasar: 'g'|'ml'|'pcs'): Decimal
     Pasangan valid: g↔kg, ml↔l, pcs↔lusin (1 lusin = 12). Pasangan tidak cocok → HitungError "Satuan kemasan tidak cocok dengan satuan dasar".

2. harga.ts
   - hargaPerSatuanDasar(totalHarga, qtyDasar): Decimal
   - hargaBaruBahan({ metode: 'rata_rata'|'terakhir', stokLama, hargaLama, qtyBeli, hargaBeli }): Decimal
     Rata-rata memakai max(stokLama, 0) (PRD 7.8).

3. adonan.ts
   - biayaAdonan({ items: { takaranDasar, hargaPerSatuan }[], hasilGram }) → { biayaTotal, biayaPerGram }
   - hasilOtomatis(items: { takaranDasar, satuanDasar, namaBahan }[]) → { hasilGram, peringatan: string[] }
     g dihitung; ml dihitung 1:1 + peringatan "… diasumsikan 1 ml = 1 g"; pcs tidak dihitung + peringatan menyarankan mode timbang.

4. margin.ts
   - hitungMargin(hpp, hargaJual) → { marginRp, marginPersen | null } (null jika hargaJual = 0)
   - saranHarga(hpp, targetMargin, kelipatan = 500): number integer, dibulatkan KE ATAS ke kelipatan
     targetMargin harus 0 ≤ t < 1.

5. skala.ts
   - faktorSkala(
       { jenis: 'manual', faktor }
     | { jenis: 'bulat', diameterAcuan, diameterBaru }
     | { jenis: 'kotak', pAcuan, lAcuan, pBaru, lBaru }
     | { jenis: 'campuran', acuan: Loyang, baru: Loyang }
     ): Decimal
     Campuran: bandingkan luas (π·r² vs p·l), π dari Decimal.acos(-1).
   - skalakanItems(items, faktor): items dengan takaran & takaranDasar dikali faktor

6. index.ts mengekspor semuanya.

KASUS TEST WAJIB (angka persis)
- Tepung 1 kg Rp13.500 → Rp13,5/g
- 3 sdm × 12 g → 36 g
- Telur: 1 lusin dengan satuan dasar pcs → 12
- kg → ml ditolak
- Rata-rata:
  - stok 500 g @13 + beli 1.000 g @14 → 13,6666…
  - stok −200 g @13 + beli 1.000 @14 → 14
  - stok 0 → 14
- Metode terakhir → 14
- biayaAdonan 1.200 g dengan total Rp48.000 → Rp40/g
- hasilOtomatis campuran g/ml/pcs → angka + 2 peringatan
- hitungMargin(3200, 5000) → 1800 dan 0,36; hargaJual 0 → persen null
- saranHarga(3200, 0.30) → 4571,43 → 5000; saranHarga(3500, 0.30) → 5000; saranHarga(3501, 0.30) → 5500
- Skala:
  - bulat 20 → 24 = 1,44
  - kotak 20×20 → 22×22 = 1,21
  - bulat 20 → kotak 20×20 ≈ 1,2732
  - faktor 0 atau negatif → error

SELESAI JIKA
- pnpm test lulus, coverage src/lib/hpp = 100% (lines & branches)
- Tidak ada operator +, -, *, / pada number untuk nilai uang/takaran di src/lib/hpp

LAPORAN AKHIR
Tabel fungsi + contoh input/output.
~~~

---

## 1.1b — Mesin hitung bagian 2: HPP produk, overhead, alokasi produksi, simulasi 🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md §7.4, §7.5, §7.7, F-PRD-02 s.d. F-PRD-07, F-PRO-02.
src/lib/hpp/ sudah berisi konversi, harga, adonan, margin, skala (langkah 1.1a). Ini langkah 1.1b. TDD WAJIB.

ATURAN sama dengan 1.1a: fungsi murni, Decimal, HitungError berbahasa Indonesia, test berdampingan.

FILE & FUNGSI
1. produk.ts — hitungHppProduk(input) → RincianHpp
   Input:
   {
     komponen: (
       | { jenis: 'adonan', resepId, namaResep, gramPerPcs, biayaPerGram, hasilGram }
       | { jenis: 'bahan', peran: 'topping'|'filling'|'kemasan'|'lainnya', bahanId, namaBahan, takaranDasar, hargaPerSatuan }
     )[],
     biayaTambahan: { nama, metode: 'per_pcs'|'persen'|'per_batch', nilai }[]
   }
   Output RincianHpp:
   {
     perPeran: { adonan, topping, filling, kemasan, lainnya },
     perKomponen: { label, biaya }[],
     biayaBahan,
     overhead: { perPcs, persen, perBatch, total },
     hpp,
     adonanUtama: { resepId, pcsPerResep } | null,
     peringatan: string[]
   }
   Aturan:
   - biaya adonan = gramPerPcs × biayaPerGram
   - biaya bahan = takaranDasar × hargaPerSatuan
   - persen dihitung dari biayaBahan
   - adonan utama = komponen adonan dengan gramPerPcs terbesar
   - pcsPerResep = floor(hasilGram ÷ gramPerPcs) adonan utama
   - per_batch: nilai ÷ pcsPerResep
     - tanpa adonan → diabaikan + peringatan
     - pcsPerResep = 0 → diabaikan + peringatan "gram per pcs melebihi hasil resep"
   - komponen kosong → hpp 0 + peringatan "Produk belum punya komponen"

2. produksi.ts — alokasiProduksi(input) → hasil per produk
   Input:
   {
     biayaAdonan,
     hasil: { produkId, gramPerPcs, pcsRencana, pcsAktual, biayaBahanLangsungPerPcs, overheadPerPcs }[]
   }
   Aturan PRD §7.7:
   - bobot = gramPerPcs × pcsRencana
   - alokasi adonan = biayaAdonan × bobot ÷ Σ bobot
   - hppAktual = (alokasi + biayaBahanLangsungPerPcs × pcsAktual + overheadPerPcs × pcsAktual) ÷ pcsAktual
   - pcsAktual 0 → hppAktual null
   - Σ bobot 0 → error
   Output per produk: { produkId, alokasiAdonan, hppAktual }

3. kebutuhan.ts — pemakaianBahanProduksi(input) → Map bahanId → qtyDasar
   Dipakai di langkah 2.5 dan 3.5.
   Input:
   {
     resepUtama: { resepId, hasilGram, items: { bahanId, takaranDasar }[] },
     faktorSkala,
     produk: {
       pcsAktual,
       komponen: (
         | { jenis: 'adonan', resepId, gramPerPcs, hasilGram, items }
         | { jenis: 'bahan', bahanId, takaranDasar }
       )[]
     }[]
   }
   Aturan:
   - bahan resep utama = takaranDasar × faktorSkala (sekali, bukan per produk)
   - adonan LAIN (bukan resep utama) dipotong proporsional: takaranDasar × (gramPerPcs × pcsAktual ÷ hasilGram)
   - bahan langsung = takaranDasar × pcsAktual
   - jumlahkan per bahanId
   Juga: kebutuhanUntukPesanan(produk: { qty, komponen }[]) → Map bahanId → qtyDasar (semua adonan proporsional, untuk rekap PO).

4. simulasi.ts — simulasiKenaikan(konteks, perubahan: { bahanId, persen }[]) → daftar produk terdampak
   Output per produk: { produkId, hppLama, hppBaru, selisih, marginLama, marginBaru, diBawahTarget }
   - hanya produk yang HPP-nya berubah, urut selisih menurun
   - konteks = data mentah yang dibutuhkan untuk menghitung ulang biaya adonan dan HPP (definisikan tipe KonteksHpp yang juga dipakai query di 1.8)
   - persen bisa negatif (turun harga)

KASUS TEST WAJIB (pakai data contoh Brownies dari seed 0.4, tulis sebagai fixture di src/lib/hpp/__fixtures__/brownies.ts)
- Brownies Cup 50 g + kemasan: rincian per peran dan HPP total
- Overhead per pcs Rp200 + persen 10% + per batch Rp6.000 dengan pcsPerResep 24 → overhead benar
- Produk dua adonan → adonan utama adalah gram terbesar
- Alokasi: biaya adonan Rp48.000, Cup 50 g × 12 pcs dan Bites 25 g × 24 pcs → alokasi 50:50
- pcsAktual 0 → hppAktual null
- pemakaianBahanProduksi dengan skala 1,5 dan topping
- simulasi coklat naik 10% → hanya produk yang memakai coklat muncul

SELESAI JIKA
Test lulus dan coverage src/lib/hpp tetap 100%.

LAPORAN AKHIR
Contoh output hitungHppProduk untuk Brownies Cup dalam bentuk tabel rupiah.
~~~

---

## 1.4 — Supplier

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-SUP-01, docs/ERD.md (tabel supplier).
Ini langkah 1.4 (dikerjakan sebelum 1.2): CRUD supplier. Hanya pemilik.

TUGAS
1. src/features/supplier/:
   - schemas.ts: Zod
     - nama wajib 2–100 karakter
     - kontak opsional; jika berupa nomor HP, normalisasi 08xx → 628xx
     - catatan opsional
   - queries.ts:
     - daftarSupplier({ q, aktif })
     - jumlah bahan yang memakai supplier sebagai supplier utama
     - pilihanSupplier() untuk dropdown
   - actions.ts (memakai helper aksi() dari src/lib/aksi):
     - buatSupplier, ubahSupplier, setAktifSupplier
     - revalidatePath
2. Halaman /supplier:
   - daftar (kartu di HP, tabel di desktop), pencarian, filter aktif/nonaktif
   - tombol "Tambah supplier" → Dialog/Sheet berisi form
   - kartu supplier punya tombol WhatsApp (wa.me) jika kontak berupa nomor HP
3. Empty state "Belum ada supplier".
4. Test integrasi untuk ketiga action, termasuk kasir ditolak.

SELESAI JIKA
Pemilik bisa menambah, mengubah, dan menonaktifkan supplier di HP dan desktop. Test lulus.
~~~

---

## 1.2 — Master bahan 🧭

Est. 1,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-BHN-01, F-BHN-02, F-BHN-04, F-STK-06, docs/ERD.md (bahan, riwayat_harga, stok_mutasi).
Fungsi hitung ada di src/lib/hpp, catatMutasi di src/lib/stok, catatAudit di src/lib/audit.
Ini langkah 1.2: modul bahan. Hanya pemilik.

TUGAS
1. src/features/bahan/schemas.ts (Zod, dipakai bersama di form & server):
   - nama 2–100
   - kategori wajib (saran: tepung, gula, dairy, lemak, telur, coklat, perisa, topping, kemasan, lainnya; boleh isi bebas)
   - satuanDasar enum
   - stokMinimal ≥ 0
   - supplierUtamaId opsional
   - harga awal (opsional saat buat): { jumlahKemasan > 0, satuanKemasan, totalHarga ≥ 0 }
   - stokAwal ≥ 0 opsional

2. queries.ts:
   - daftarBahan({ q, kategori, status: 'semua'|'menipis'|'minus', aktif })
     return: nama, kategori, satuan, stok, stokMinimal, hargaPerSatuan, status stok (aman/menipis/minus)
   - detailBahan(id)
   - bahanTerkunci(id): true bila dipakai resep_adonan_item / produk_komponen atau punya stok_mutasi

3. actions.ts (pakai aksi(), peran pemilik):
   - buatBahan: satu transaksi
     - insert bahan
     - jika harga awal diisi: hitung hargaPerSatuanDasar via kemasanKeDasar → simpan + riwayat_harga sumber manual
     - jika stokAwal > 0: catatMutasi jenis stok_awal, nilaiSatuan = harga
   - ubahBahan: tolak perubahan satuanDasar jika bahanTerkunci, pesan "Satuan dasar tidak bisa diubah karena bahan sudah dipakai"
   - ubahHargaManual: input kemasan seperti di atas, satu transaksi: update harga, riwayat_harga (harga_lama, harga_baru), catatAudit
   - setAktifBahan

4. Halaman:
   - /bahan: daftar
     - pencarian, chip filter kategori, filter status stok
     - HP: kartu (nama, kategori, stok + satuan, badge Menipis/Minus, harga "Rp13,5/g")
     - desktop: tabel
     - tombol tambah
   - /bahan/baru dan /bahan/[id]:
     - detail dengan Tabs: Info | Konversi (langkah 1.3) | Riwayat Harga (daftar sederhana dulu; grafik di 3.10) | Kartu Stok (placeholder, langkah 2.3)
   - Komponen InputHargaKemasan: "Isi [1] [kg ▾] seharga Rp[15.000]" dengan pratinjau langsung "= Rp15/g" memakai lib/hpp di client
   - Komponen InputRupiah: format ribuan saat mengetik, nilai integer
   - Satuan dasar terkunci: tampil disabled + tooltip alasan
   - Badge stok menipis di menu "Bahan" pada navigasi (jumlah bahan menipis/minus)

5. UX:
   - toast sukses/gagal, tombol submit disabled saat proses
   - error field ditampilkan di bawah input
   - konfirmasi saat menonaktifkan

6. Test integrasi:
   - buat bahan dengan harga + stok awal → bahan, riwayat_harga, stok_mutasi benar
   - ubah satuan saat terkunci → ditolak
   - ubah harga manual → riwayat & audit tercatat
   - nama duplikat (beda huruf besar) → pesan ramah
   - kasir → ditolak

SELESAI JIKA
Pemilik bisa mengelola bahan di HP (360 px) dan desktop. Test lulus. Halaman tidak pernah mengirim data bahan ke kasir.
~~~

---

## 1.3 — Konversi satuan per bahan 🧪

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-BHN-03, docs/ERD.md (konversi_satuan, resep_adonan_item, produk_komponen).
Ini langkah 1.3: tab "Konversi" di halaman detail bahan.

TUGAS
1. src/features/bahan/konversi-actions.ts:
   - tambahKonversi, ubahKonversi, hapusKonversi (pemilik)
   - nilaiDasar > 0
   - nama unik per bahan (case-insensitive)
   - nama satuan tidak boleh sama dengan satuan dasar ("g", "ml", "pcs")
   - hapus ditolak jika dipakai resep_adonan_item atau produk_komponen; pesan menyebut nama resep/produk yang memakai
   - ubahKonversi dalam SATU transaksi:
     a. update nilai
     b. hitung ulang takaran_dasar semua resep_adonan_item dan produk_komponen yang memakai konversi ini
     c. untuk resep mode 'otomatis' yang terdampak, hitung ulang hasil_gram

2. Buat src/features/resep/hitung-ulang.ts (dipakai lagi di 1.5):
   - hitungUlangTakaranDasarKonversi(tx, konversiId)
   - hitungUlangHasilResep(tx, resepId) — pakai hasilOtomatis dari lib/hpp

3. UI tab Konversi:
   - daftar "1 sdm = 12 g"
   - form tambah inline
   - edit/hapus dengan konfirmasi
   - chip SARAN dari src/lib/hpp/konversi-umum.ts yang cocok dengan nama/kategori bahan (klik → form terisi), dengan catatan "perkiraan, cek dengan timbangan"

4. Test integrasi:
   - ubah nilai konversi → takaran_dasar item resep & hasil_gram resep otomatis ikut berubah
   - hapus konversi yang dipakai → ditolak dengan nama resep
   - nama sama dengan satuan dasar → ditolak

SELESAI JIKA
Test lulus, UI bisa dipakai di HP.
~~~

---

## 1.5 — Resep adonan 🧭

Est. 2 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-RSP-01 s.d. F-RSP-03 dan §7.3, docs/ERD.md (resep_adonan, resep_adonan_item).
Gunakan src/lib/hpp (biayaAdonan, hasilOtomatis, keSatuanDasar) dan src/features/resep/hitung-ulang.ts.
Ini langkah 1.5: modul resep adonan. Hanya pemilik.

TUGAS
1. schemas.ts:
   - nama, modeHasil, hasilGram (wajib > 0 jika timbang), caraBuat (≤ 5.000 karakter)
   - loyang acuan opsional { bentuk, diameter | panjang+lebar }
   - items min 1: { bahanId, takaran > 0, konversiSatuanId | null }
   - bahan tidak boleh duplikat dalam satu resep

2. queries.ts:
   - daftarResep(): nama, hasil gram, biaya total, biaya per gram, jumlah produk yang memakai, aktif
     Hitung biaya memakai SATU query untuk semua item + harga bahan (tanpa N+1), lalu biayaAdonan() di server.
   - detailResep(id): resep + items + bahan + konversi milik tiap bahan + biaya per item
   - ambilBiayaResep(tx|db, resepIds[]): Map resepId → { biayaTotal, biayaPerGram, hasilGram } — dipakai ulang di modul produk/HPP
   - pilihanBahan(): bahan aktif + daftar konversinya + harga (untuk form)

3. actions.ts (aksi(), pemilik):
   - simpanResep (buat & ubah), satu transaksi:
     a. validasi konversiSatuanId milik bahanId yang sama
     b. hitung takaran_dasar DI SERVER (jangan percaya nilai dari client)
     c. ganti seluruh item (hapus lama + insert baru, atau diff)
     d. mode otomatis → hasil_gram dari hasilOtomatis()
     e. kembalikan peringatan dari hasilOtomatis ke UI
   - setAktifResep: menonaktifkan ditolak jika dipakai produk aktif (sebutkan nama produknya)

4. Halaman:
   - /resep: daftar kartu (nama, hasil "1.200 g", biaya "Rp48.000", "Rp40/g", "dipakai 3 produk")
   - /resep/baru dan /resep/[id]/ubah: form
     a. Bagian Info: nama, mode hasil (radio dengan penjelasan singkat), hasil gram (tampil jika timbang), cara buat
     b. Bagian Bahan (useFieldArray), per baris:
        - combobox bahan (cari)
        - takaran
        - pilih satuan (satuan dasar + konversi milik bahan itu)
        - teks kecil "= 36 g · Rp1.512"
        - tombol naik/turun & hapus
        Di HP setiap baris berupa kartu ringkas.
     c. Panel ringkasan (sticky di bawah pada HP): total bahan, hasil adonan, biaya total, biaya per gram, peringatan
        Dihitung langsung di client memakai lib/hpp dan harga dari server.
     d. Bagian Loyang acuan (opsional, collapsible)
   - /resep/[id]: tampilan baca
     - tabel bahan dengan takaran asli + dasar + biaya
     - ringkasan biaya
     - cara buat
     - daftar produk yang memakai resep ini
     - tombol Ubah / Duplikat (1.6) / Skala (1.6)
   - Bahan nonaktif tidak muncul di pilihan baru, tetapi item lama tetap tampil dengan badge "nonaktif"

5. Test integrasi:
   - simpan resep dengan sdm & butir → takaran_dasar benar
   - konversi milik bahan lain → ditolak
   - mode otomatis → hasil_gram = Σ g + ml
   - ambilBiayaResep cocok dengan biayaAdonan untuk fixture brownies
   - nonaktifkan resep yang dipakai produk → ditolak
   - kasir ditolak

SELESAI JIKA
Resep Brownies dari seed bisa dibuka, diubah, dan biayanya cocok dengan perhitungan manual. Form nyaman di HP. Test lulus.
~~~

---

## 1.6 — Duplikat & skala resep 🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-RSP-04, F-RSP-05, §7.6.
Ini langkah 1.6.

TUGAS
1. Action duplikatResep({ resepId, namaBaru }) (pemilik):
   - salin resep + semua item, set induk_resep_id
   - nama unik; default saran "<nama> (salinan)"
   - setelah sukses arahkan ke halaman ubah resep baru
2. Di detail resep tampilkan "Varian dari: <induk>" dan daftar varian turunan.
3. Komponen KalkulatorSkala (dialog/sheet dari detail resep). HANYA tampilan, tidak menyimpan apa pun.
   - Tab "Faktor": tombol cepat 0,5× 1,5× 2× 3× + input bebas
   - Tab "Loyang":
     - pilih bentuk & ukuran tujuan (bulat diameter / kotak p×l)
     - jika resep belum punya loyang acuan, tampilkan form singkat untuk mengisinya (simpan ke resep, pemilik saja)
   - Hasil:
     - faktor (mis. "1,44×")
     - tabel bahan: takaran asli → takaran baru dalam satuan input (dibulatkan wajar: g ke 1 desimal, butir ke 0,5 terdekat dengan catatan) dan satuan dasar
     - hasil gram baru, biaya total baru
   - Tombol "Cetak" (CSS print sederhana) dan "Salin teks" (clipboard, format daftar belanja)
4. Fungsi pembulatan takaran tampilan di src/lib/format.ts + unit test.
5. Test integrasi duplikat: item tersalin lengkap, perubahan pada salinan tidak memengaruhi induk.

SELESAI JIKA
Dari Brownies resep 20 cm, saya bisa melihat takaran untuk loyang 24 cm (1,44×) dan menduplikat jadi "Brownies Keju".
~~~

---

## 1.7 — Produk & komponen 🧭

Est. 1,5 hari · 👤 Buat bucket Storage `produk` (public read) di Supabase dev & prod, atau biarkan agent membuat lewat migrasi SQL.

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PRD-01, F-PRD-02, docs/ERD.md (produk, produk_komponen).
Ini langkah 1.7: CRUD produk dengan komponen. Hanya pemilik. Rincian HPP lengkap dikerjakan di 1.8, tapi form ini sudah menampilkan pratinjau HPP sederhana.

TUGAS
1. schemas.ts:
   - nama, kategori (saran: kue kering, kue basah, brownies, cake, roti, minuman, lainnya), cetakan (opsional)
   - hargaJual integer ≥ 0, targetMargin % opsional (0–95), dijual boolean
   - komponen min 1, union:
     - { jenis: 'adonan', resepAdonanId, gramPerPcs > 0 }
     - { jenis: 'bahan', peran: topping|filling|kemasan|lainnya, bahanId, takaran > 0, konversiSatuanId | null }
   - resep yang sama tidak boleh dua kali; bahan yang sama dengan peran sama tidak boleh dua kali

2. actions.ts (pemilik):
   - simpanProduk dalam transaksi:
     - hitung takaran_dasar di server
     - peran 'adonan' untuk komponen adonan
     - ganti komponen
     - catatAudit jika harga_jual berubah
   - setAktifProduk, setDijualProduk
   - unggahFotoProduk:
     - terima File dari FormData; validasi tipe (jpeg/png/webp) & ukuran ≤ 2 MB DI SERVER
     - upload ke bucket 'produk' path produk/<id>/<uuid>.<ext> memakai client admin
     - hapus foto lama
     - simpan foto_url
   - Di client, kompres gambar sebelum upload (canvas → webp, sisi terpanjang 1024 px)

3. Migrasi SQL (jika belum ada): buat bucket storage 'produk' public read; tulis hanya via service role.
   Jika migrasi storage tidak bisa jalan di DB test, pisahkan sebagai docs langkah manual.

4. queries.ts:
   - daftarProduk({ q, kategori, dijual, aktif })
   - detailProduk(id)
   - pilihanResep() (resep aktif + biaya per gram + hasil gram)
   - pilihanBahan()

5. Halaman:
   - /produk: grid kartu
     - foto (placeholder ikon kue jika kosong), nama, cetakan, harga jual
     - kolom HPP & margin dibiarkan "—" dulu, diisi di 1.8
     - filter kategori/dijual
   - /produk/baru dan /produk/[id]/ubah: form
     a. Info: nama, kategori, cetakan, harga jual (InputRupiah), target margin, dijual, foto (pratinjau + ganti)
     b. Komponen (useFieldArray):
        - toggle Adonan/Bahan
        - Adonan: pilih resep + gram per pcs + info "1 resep ≈ 24 pcs"
        - Bahan: pilih peran + bahan + takaran + satuan
     c. Panel pratinjau HPP (sticky di HP): memakai hitungHppProduk di client dengan data harga dari server (halaman pemilik saja)
        Tampilkan HPP, margin Rp & %, peringatan.
   - Stok produk TIDAK bisa diedit di sini (lewat produksi/penyesuaian). Tampilkan read-only.

6. Test integrasi:
   - simpan produk 1 adonan + 2 bahan → komponen tersimpan dengan takaran_dasar benar
   - komponen duplikat → ditolak
   - harga jual berubah → audit tercatat
   - upload file 3 MB atau tipe pdf → ditolak
   - kasir ditolak

SELESAI JIKA
Tiga produk Brownies dari seed bisa diedit, foto bisa diunggah dari HP, pratinjau HPP tampil.
~~~

---

## 1.8 — Rincian HPP, margin & saran harga 🧭🧪

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PRD-03 s.d. F-PRD-05, §7.4–7.5, F-DSH-04, docs/ERD.md §6.
Ini langkah 1.8: query HPP terpusat + halaman detail produk.

TUGAS
1. src/features/hpp/queries.ts (import 'server-only'):
   - ambilKonteksHpp(db, { produkIds?: string[] }): KonteksHpp (tipe dari lib/hpp/simulasi.ts)
     Muat dalam ≤ 5 query total, TANPA N+1:
     produk + komponen, item semua resep terkait, harga bahan, biaya_tambahan (global + per produk), pengaturan_toko
   - hitungHppProdukDariKonteks(konteks, produkId): RincianHpp
   - hppSemuaProduk(db, opsi): Map produkId → { hpp, marginRp, marginPersen, target, diBawahTarget, saranHarga }
   - hppUntukSnapshot(tx, produkIds): Map produkId → string (2 desimal), dipakai kasir & produksi nanti
   - Ukur waktu untuk 100 produk dengan data sintetis di test; target < 300 ms

2. Halaman /produk/[id] (pemilik):
   - Header: foto, nama, cetakan, harga jual, badge status
   - Kartu HPP:
     - rincian per peran (adonan, topping, filling, kemasan, lainnya, overhead) dengan bar proporsi sederhana
     - total HPP
   - Tabel komponen: nama, takaran per pcs, biaya per pcs
   - Kartu Margin:
     - margin Rp & %
     - target (produk atau default toko)
     - status (hijau ≥ target, kuning < target, merah < 0)
   - Saran harga: "Untuk margin 30%: Rp5.000" + tombol "Pakai harga ini"
     → action ubahHargaJual (audit) + konfirmasi
   - Info "1 resep Brownies Panggang ≈ 24 pcs"
   - Peringatan dari RincianHpp
   - Tab: Ringkasan | Kartu Stok (placeholder 2.3) | Riwayat produksi (placeholder 2.5)

3. /produk (daftar): isi kolom HPP & margin % dengan badge warna. Filter "Margin di bawah target".

4. Test:
   - integrasi: hppSemuaProduk untuk fixture brownies = nilai hitung manual di fixture 1.1b
   - integrasi: ubah harga bahan → HPP berubah tanpa simpan ulang produk
   - integrasi: query count ≤ 5 (hitung lewat logger Drizzle di test)
   - kasir tidak bisa memanggil action ubahHargaJual

SELESAI JIKA
Rincian HPP Brownies Cup tampil dan angkanya sama dengan laporan 1.1b. Margin di bawah target ditandai.
~~~

---

## 1.9 — Biaya tambahan (overhead)

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PRD-06, §7.4, keputusan K2 di §10.
Ini langkah 1.9: pengelolaan biaya tambahan. Hanya pemilik.

TUGAS
1. Halaman /produk/biaya-tambahan (tautan dari halaman /produk dan dari kartu HPP).
2. Daftar biaya:
   - nama, metode (label: "Rp per pcs", "% dari biaya bahan", "Rp per resep/batch"), nilai, berlaku untuk (Semua produk / nama produk), aktif
3. Form tambah/ubah:
   - input nilai menyesuaikan metode: rupiah untuk per_pcs & per_batch, persen 0–100 untuk persen (disimpan 0–1)
   - pilih produk opsional
4. Sebelum simpan tampilkan dampak: "Mengubah HPP 12 produk, rata-rata +Rp150/pcs".
   Hitung dengan konteks HPP + simulasi di server (action pratinjauDampakBiaya, tanpa simpan).
5. Teks bantuan singkat yang menjelaskan K2: overhead boleh dikosongkan jika biaya gas/listrik dicatat sebagai biaya operasional bulanan di modul Keuangan. Jangan dicatat dua kali.
6. Test integrasi: biaya per_batch untuk produk tertentu memengaruhi produk itu saja; biaya nonaktif tidak dihitung.

SELESAI JIKA
Overhead tampil di rincian HPP produk (1.8) sesuai metode.
~~~

---

## 1.10 — Simulasi kenaikan harga bahan

Est. 0,5 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md F-PRD-07.
simulasiKenaikan() sudah ada di src/lib/hpp/simulasi.ts dan ambilKonteksHpp di src/features/hpp/queries.ts.
Ini langkah 1.10. Hanya pemilik. TIDAK ADA penulisan ke database sama sekali.

TUGAS
1. Halaman /produk/simulasi:
   - Daftar perubahan (bisa beberapa baris): pilih bahan + persen (−50 s.d. +200), tombol cepat +5% +10% +20%
   - Tombol "Hitung" → server action simulasikan (pemilik, read-only) memakai konteks HPP
2. Hasil:
   - ringkasan: "8 produk terdampak, 3 jadi di bawah target margin"
   - tabel/kartu per produk: HPP lama → baru (+selisih), margin % lama → baru, badge di bawah target, saran harga baru
   - urut berdasarkan selisih terbesar
3. Tautan per produk ke halaman detail untuk mengubah harga jual.
4. Bisa juga dibuka dari detail bahan ("Simulasikan kenaikan bahan ini") dengan bahan terisi otomatis.
5. Test integrasi: action tidak mengubah satu baris pun (bandingkan isi tabel sebelum/sesudah).

SELESAI JIKA
Saya bisa menjawab "kalau coklat naik 10%, produk mana yang terdampak?" dalam 3 klik.
~~~

---

## 1.11 — Impor data awal dari Excel 🧭

Est. 1 hari

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PRD.md §10 bagian "Data awal dari Khansa", docs/ERD.md §4.1–4.2.
Ini langkah 1.11: impor massal bahan, konversi, resep, dan produk dari file Excel supaya Khansa tidak perlu mengetik satu per satu. Hanya pemilik.

TUGAS
1. Pasang exceljs.

2. Route GET /api/impor/template → file "template-data-awal.xlsx". Sheet:
   - Petunjuk: penjelasan tiap sheet & kolom, contoh, aturan satuan
   - Bahan: nama*, kategori*, satuan_dasar* (g/ml/pcs), isi_kemasan, satuan_kemasan, harga_kemasan, stok_awal, stok_minimal, supplier
   - Konversi: nama_bahan*, nama_satuan*, nilai_dasar*
   - Resep: nama_resep*, mode_hasil* (otomatis/timbang), hasil_gram, cara_buat
   - Resep_Item: nama_resep*, nama_bahan*, takaran*, satuan* (satuan dasar atau nama konversi)
   - Produk: nama_produk*, kategori*, cetakan, harga_jual*, dijual (ya/tidak)
   - Produk_Komponen: nama_produk*, jenis* (adonan/bahan), peran, nama_resep_atau_bahan*, takaran_per_pcs*, satuan
   Kolom wajib (*) diberi warna. Isi 2–3 baris contoh (Brownies). Data validation dropdown untuk enum.

3. Halaman /pengaturan/impor dengan 3 langkah:
   a. Unggah file (≤ 5 MB, .xlsx)
   b. Pratinjau & validasi (server action validasiImpor):
      - parse semua sheet
      - validasi tiap baris dengan Zod
      - resolusi referensi berdasarkan nama (case-insensitive), termasuk ke data yang SUDAH ada di DB
      - deteksi duplikat
      - tampilkan ringkasan "35 bahan, 40 konversi, 5 resep, 12 produk"
      - tampilkan daftar error: sheet, baris, kolom, pesan Indonesia
      - opsi untuk nama yang sudah ada di DB: Lewati / Batalkan impor
   c. Konfirmasi → action jalankanImpor:
      - SATU transaksi
      - urutan: bahan → konversi → resep (+ hitung takaran_dasar & hasil) → produk → komponen
      - stok awal via catatMutasi
      - harga via riwayat_harga sumber manual
      - error apa pun → rollback semua
      - hasil: ringkasan + tautan ke daftar

4. Batas: maksimal 2.000 baris total per file.

5. Test integrasi:
   - file contoh dibuat di test memakai exceljs → impor sukses → HPP produk contoh benar
   - file dengan 1 baris rusak → tidak ada data tersimpan, error menunjuk baris yang tepat
   - satuan resep tidak dikenal → error jelas

SELESAI JIKA
Template bisa diunduh, diisi, diimpor. Hasilnya muncul di modul bahan/resep/produk dengan HPP terhitung.

LAPORAN AKHIR
Instruksi singkat (5–8 poin) yang bisa saya kirim ke Khansa untuk mengisi template.
~~~

---

## 🚦 Gerbang 1 — Verifikasi HPP bersama Khansa

Jalankan setelah data awal Khansa diimpor.

~~~text
Lanjutkan proyek Toko Kue. Baca CLAUDE.md, docs/PLAN.md §4 (Gerbang 1), docs/PRD.md §2.
Kita sedang memverifikasi HPP aplikasi terhadap hitungan manual Khansa.

Data acuan Khansa ada di file [ISI: path file, mis. docs/gerbang/hpp-acuan.xlsx], berisi untuk 5 produk:
nama produk, HPP per pcs versi Excel Khansa, dan (jika ada) rincian bahan.

TUGAS
1. Buat script scripts/bandingkan-hpp.ts (pnpm bandingkan-hpp <file>):
   - baca file acuan
   - cocokkan produk berdasarkan nama
   - hitung HPP aplikasi via ambilKonteksHpp + hitungHppProdukDariKonteks
   - keluarkan tabel: produk | HPP Khansa | HPP aplikasi | selisih | status (✔ jika |selisih| ≤ Rp1)
   - simpan juga sebagai docs/gerbang/hasil-gerbang-1.md
2. Untuk setiap produk yang selisihnya > Rp1, lakukan analisis akar masalah:
   - bandingkan rincian per bahan (takaran dasar, harga per satuan, biaya) dengan rincian Excel jika tersedia
   - klasifikasikan penyebab: (a) data salah di aplikasi, (b) data/rumus salah di Excel, (c) bug rumus aplikasi, (d) perbedaan definisi (mis. overhead, susut)
   - JANGAN mengubah data atau kode apa pun dulu
3. Tulis ringkasan di docs/gerbang/hasil-gerbang-1.md:
   - tabel hasil
   - temuan per produk
   - daftar pertanyaan untuk Khansa
   - usulan perbaikan
4. Jika penyebabnya (c) bug rumus: tulis test yang mereproduksi, lalu tunggu persetujuan saya sebelum memperbaiki.

LAPORAN AKHIR
Status Gerbang 1 (LULUS / BELUM), dan hal yang perlu saya tanyakan ke Khansa.
~~~

Setelah lulus, jalankan **U1 (review)** dan **U5 (keamanan)** dari [README](README.md) untuk seluruh Fase 1, lalu lanjut ke Fase 2.
