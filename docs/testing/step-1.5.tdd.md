# Bukti TDD — Step 1.5 Resep Adonan

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.5, `docs/PRD.md` F-RSP-01 sampai
F-RSP-03 dan §7.3, serta `docs/ERD.md` tabel `resep_adonan` dan `resep_adonan_item`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project unit src/features/resep/schemas.test.ts src/features/resep/hitung-form.test.ts` | 2 file test gagal dimuat karena modul belum ada; commit `97827bf` |
| RED | `vitest run --project integration tests/integration/resep.test.ts` | file test gagal dimuat karena action/query belum ada; commit `97827bf` |
| GREEN | dua perintah target yang sama | 9 unit dan 12 integrasi lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 41 file / 372 unit, 16 file / 135 integrasi lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage --coverage.include=src/lib/hpp/**/*.ts` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| Schema resep | nama dirapikan, cara buat maksimal 5.000 karakter, minimal satu item, dan bahan duplikat ditolak |
| Hasil timbang | wajib diisi dan harus lebih dari nol |
| Loyang acuan | bulat wajib diameter; kotak wajib panjang dan lebar |
| Konversi satuan | `takaran_dasar` dihitung di server; konversi milik bahan lain ditolak dan transaksi dibatalkan |
| Hasil otomatis | menjumlahkan bahan g dan ml, memperingatkan asumsi ml, dan mengabaikan pcs dengan peringatan |
| Biaya adonan | fixture Brownies menghasilkan Rp50.550 dan Rp42,125 per gram |
| Daftar resep | biaya seluruh resep dihitung dari satu query item + harga, beserta jumlah produk pemakai |
| Detail resep | memuat item, biaya per item, konversi milik bahan, dan produk pemakai |
| Bahan nonaktif | tidak muncul sebagai pilihan baru, tetapi tetap tersedia saat mengubah resep lama |
| Buat dan ubah | penyimpanan atomik; ubah mengganti seluruh item tanpa mengganti ID resep |
| Nama duplikat | beda kapital ditolak di field `nama` |
| Status aktif | penonaktifan ditolak bila resep dipakai produk aktif dan menyebut nama produk |
| Otorisasi | kasir ditolak untuk menyimpan resep maupun mengubah status; data tidak berubah |

## Catatan

- `simpanResep` mengunci resep saat ubah serta bahan dan konversi dengan `FOR KEY SHARE` sebelum
  menghitung dan menyimpan salinan `takaran_dasar`.
- `setAktifResep` mengunci resep dan memeriksa produk aktif dalam transaksi yang sama.
- Form memakai `useFieldArray`, combobox bahan, pratinjau berbasis `@/lib/hpp`, dan ringkasan fixed
  pada layar ponsel. Halaman ubah menggabungkan kembali bahan lama yang sudah nonaktif.
