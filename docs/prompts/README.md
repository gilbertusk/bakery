# Prompt Pengerjaan per Langkah

Kumpulan prompt untuk membangun aplikasi langkah demi langkah dengan Claude Code (atau AI coding agent lain). Setiap prompt mengerjakan **satu langkah** dari [PLAN.md](../PLAN.md).

| File | Isi |
| --- | --- |
| [00-fase-0-fondasi.md](00-fase-0-fondasi.md) | 0.1 – 0.8 |
| [01-fase-1-master-hpp.md](01-fase-1-master-hpp.md) | 1.1a – 1.11 + Gerbang 1 |
| [02-fase-2-operasional.md](02-fase-2-operasional.md) | 2.1 – 2.12 + Gerbang 2 |
| [03-fase-3-pesanan-pembukuan.md](03-fase-3-pesanan-pembukuan.md) | 3.1 – 3.12 + Gerbang 3 |
| [04-fase-4-dan-r3.md](04-fase-4-dan-r3.md) | 4.1 – 4.6 + R3 opsional |

---

## Cara pakai

1. **Satu prompt = satu sesi.** Mulai sesi baru (atau `/clear`) sebelum menempel prompt berikutnya, supaya konteks tetap bersih. Semua prompt dirancang agar bisa berdiri sendiri, karena masing-masing menyuruh agent membaca `CLAUDE.md` dan dokumen di `docs/`.
2. **Ikuti urutan.** Nomor prompt mengikuti ketergantungan. Langkah yang besar sudah dipecah jadi `a` dan `b` (misal 0.3a dan 0.3b). Kerjakan `a` dulu.
3. **Salin isi blok prompt saja** (yang berada di antara `~~~text` dan `~~~`).
4. **Isi bagian `[ISI: …]`** sebelum mengirim, jika ada.
5. **Untuk langkah bertanda 🧭**, aktifkan Plan Mode dulu (Shift+Tab di Claude Code), periksa rencananya, baru setujui.
6. **Setelah agent selesai:**
   - Baca laporan akhirnya.
   - Jalankan aplikasi dan coba sendiri.
   - Pastikan `pnpm lint && pnpm typecheck && pnpm test` hijau.
   - Commit. Satu langkah = satu commit (atau beberapa commit kecil).
7. **Jangan menggabungkan dua prompt jadi satu.** Kualitas turun drastis kalau satu sesi mengerjakan terlalu banyak.
8. **Jangan pernah menempel password, API key, atau connection string ke chat.** Isi langsung di file `.env.local`. Prompt yang butuh secret akan meminta agent membaca dari env.

### Simbol

| Simbol | Arti |
| --- | --- |
| 🧭 | Disarankan pakai Plan Mode dulu |
| 👤 | Ada langkah manual yang harus kamu lakukan sendiri (buat akun, isi env, dsb.) |
| 🧪 | Langkah ini wajib TDD: test ditulis lebih dulu |
| 🚦 | Prompt gerbang: verifikasi bersama Khansa |

---

## Prompt umum (bisa dipakai kapan saja)

### U1 — Review setelah setiap langkah

~~~text
Review perubahan yang belum di-commit (git diff dan file baru) untuk langkah [ISI: nomor langkah, mis. 1.5].

Baca CLAUDE.md dan bagian dokumen yang relevan di docs/PRD.md, docs/ERD.md, docs/PLAN.md.

Periksa dan laporkan dengan tingkat CRITICAL / HIGH / MEDIUM / LOW:
1. Kesesuaian dengan kriteria penerimaan PRD untuk ID yang terkait langkah ini.
2. Kesesuaian skema dan nama kolom dengan ERD.
3. Aturan arsitektur di CLAUDE.md:
   - stok hanya lewat catatMutasi
   - kas hanya lewat catatKas
   - requirePeran di setiap server action
   - Drizzle tidak diimpor di client component
4. Kebocoran data ke kasir: HPP, harga per satuan bahan, laba. Cek respons server, bukan hanya tampilan.
5. Operasi multi-tabel yang tidak dibungkus db.transaction.
6. Perhitungan uang/takaran yang memakai number JavaScript biasa alih-alih Decimal.
7. Error yang ditelan diam-diam, pesan error yang tidak berbahasa Indonesia.
8. Test yang hilang untuk logika hitung dan mutasi.
9. Fungsi > 50 baris, file > 400 baris, nesting > 4.

Jangan ubah kode dulu. Tampilkan daftar temuan beserta file:baris dan usulan perbaikan, lalu tunggu persetujuan saya.
~~~

### U2 — Perbaiki bug

~~~text
Ada bug di aplikasi Toko Kue. Baca CLAUDE.md dulu.

Gejala: [ISI: apa yang terjadi, di halaman mana, langkah untuk mengulang]
Seharusnya: [ISI: perilaku yang benar]
Pesan error / log (jika ada): [ISI]

Langkah kerja:
1. Cari akar masalah. Jangan sekadar menambal gejala dengan try/catch.
2. Tulis test yang gagal karena bug ini (unit atau integrasi, mana yang paling dekat dengan akar masalah).
3. Perbaiki dengan perubahan sekecil mungkin sampai test hijau.
4. Jalankan pnpm lint, pnpm typecheck, pnpm test.
5. Laporkan: akar masalah, file yang diubah, test yang ditambahkan, dan apakah ada data produksi yang perlu dikoreksi.
~~~

### U3 — Lanjutkan pekerjaan yang terputus

~~~text
Sesi sebelumnya untuk langkah [ISI: nomor langkah] terhenti sebelum selesai.

1. Baca CLAUDE.md dan prompt langkah tersebut di docs/prompts/.
2. Lihat git status dan git diff untuk mengetahui apa yang sudah dikerjakan.
3. Bandingkan dengan bagian "Selesai jika" di prompt langkah itu. Buat daftar yang sudah dan yang belum.
4. Lanjutkan yang belum. Jangan menulis ulang bagian yang sudah benar.
5. Akhiri dengan laporan seperti yang diminta prompt langkah tersebut.
~~~

### U4 — Ubah skema database di tengah jalan

~~~text
Saya perlu mengubah skema database: [ISI: perubahan, mis. tambah kolom X di tabel Y untuk keperluan Z].

1. Baca CLAUDE.md dan docs/ERD.md.
2. Nilai dampaknya: tabel, query, server action, test, dan laporan mana yang terpengaruh. Tampilkan dulu sebelum mengubah apa pun.
3. Setelah saya setujui:
   - ubah schema Drizzle
   - generate migrasi baru (jangan mengedit migrasi lama yang sudah diterapkan)
   - jika ada data lama, tambahkan langkah pengisian data di migrasi
4. Perbarui docs/ERD.md: diagram Mermaid, kamus data, dan enum jika berubah.
5. Perbarui kode dan test yang terdampak. Jalankan semua test.
~~~

### U5 — Review keamanan (wajib sebelum setiap gerbang)

~~~text
Lakukan review keamanan seluruh kode di src/ untuk aplikasi Toko Kue. Baca CLAUDE.md dan docs/ERD.md §8.

Periksa:
1. Setiap server action dan route handler memanggil requirePengguna/requirePeran sebelum menyentuh data.
2. Kasir tidak pernah menerima field HPP, harga_per_satuan, biaya, atau laba dalam respons apa pun, termasuk props yang dikirim ke client component.
3. Semua input divalidasi Zod di server, termasuk id dari URL.
4. Tidak ada query SQL yang dirangkai dari string input (sql.raw dengan input).
5. Semua tabel public memiliki RLS aktif (lihat test RLS).
6. SUPABASE_SERVICE_ROLE_KEY dan DATABASE_URL hanya dipakai di modul 'server-only'.
7. Upload file: validasi tipe dan ukuran di server.
8. Tidak ada secret di repo (cek juga riwayat git).
9. Header keamanan dan pengaturan cookie sesi.

Laporkan temuan dengan tingkat CRITICAL / HIGH / MEDIUM / LOW beserta file:baris dan perbaikan yang diusulkan. Perbaiki CRITICAL dan HIGH setelah saya setujui.
~~~
