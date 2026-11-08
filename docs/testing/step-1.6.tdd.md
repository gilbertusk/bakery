# Bukti TDD — Step 1.6 Duplikat & Skala Resep

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.6, `docs/PRD.md` F-RSP-04, F-RSP-05,
dan §7.6, serta `docs/ERD.md` kolom `resep_adonan.induk_resep_id`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project unit src/lib/format.test.ts src/features/resep/schemas.test.ts` | 5 kontrak gagal karena formatter dan schema belum ada; commit `fbd7aa7` |
| RED | `vitest run --project integration tests/integration/resep-skala.test.ts` | 5 kontrak gagal karena action belum ada; commit `fbd7aa7` |
| GREEN | unit target termasuk `src/lib/hpp/skala.test.ts` | 73 test lulus |
| GREEN | integrasi resep dan skala | 17 test lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 41 file / 377 unit, 17 file / 140 integrasi lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage --coverage.include=src/lib/hpp/**/*.ts` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| Duplikat resep | seluruh info resep dan item tersalin; ID item baru dan `induk_resep_id` menunjuk resep asal |
| Independensi salinan | perubahan takaran pada salinan tidak mengubah item induk |
| Nama salinan | saran awal `"<nama> (salinan)"`; duplikat beda kapital ditolak di field `namaBaru` |
| Resep tidak ada | duplikat dan simpan loyang mengembalikan `Resep tidak ditemukan` |
| Garis keturunan | detail induk memuat daftar varian; detail salinan memuat resep induk |
| Loyang acuan | bulat atau kotak divalidasi dan penggantian bentuk mengosongkan kolom bentuk lama |
| Otorisasi | kasir ditolak menduplikat maupun menyimpan loyang; data tidak berubah |
| Faktor manual | tombol cepat 0,5×, 1,5×, 2×, 3× dan input bebas memakai `faktorSkala` |
| Faktor loyang | bulat 20 cm ke 24 cm menghasilkan 1,44×; bentuk campuran memakai rasio luas |
| Pembulatan tampilan | gram 1 desimal, butir ke 0,5 terdekat dengan catatan, satuan lain maks 2 desimal |
| Hasil kalkulator | menampilkan takaran asli → baru, satuan dasar, hasil gram, dan biaya baru tanpa menyimpan |
| Ekspor | daftar belanja dapat disalin sebagai teks dan hasil dapat dicetak dengan CSS print |

## Catatan

- Duplikasi mengunci resep induk, membaca seluruh item, dan membuat resep beserta item baru dalam satu
  transaksi. Salinan menyimpan nilai saat itu dan tidak berbagi baris item dengan induk.
- Kalkulator skala hanya memakai fungsi murni `faktorSkala` dan `skalakanItems`. Satu-satunya mutasi
  dari dialog adalah penyimpanan loyang acuan bila resep belum memilikinya.
- Uji visual lokal viewport 360×800 untuk Brownies bulat 20→24 cm menunjukkan faktor 1,44×, tanpa
  overflow atau error console, serta pembulatan butir dengan catatan.
