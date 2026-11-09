# Bukti TDD — Step 1.8 Rincian HPP, Margin & Saran Harga

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.8, `docs/PRD.md` F-PRD-03 sampai
F-PRD-05 dan §7.4–7.5, serta `docs/ERD.md` tabel `produk`, `produk_komponen`,
dan `biaya_tambahan`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project integration tests/integration/hpp.test.ts` | file test gagal dimuat karena modul belum ada; commit `42541e8` |
| GREEN | `vitest run --project integration tests/integration/hpp.test.ts` | 11 test lulus |
| RED pelengkap | integrasi default toko/global overhead/label/benchmark dan helper form/foto | 3 integrasi gagal dan 2 helper belum ada; commit `bc5a13e` |
| RED tepi | target margin 0 pada pratinjau | terbaca sebagai default 30%; commit `136a4f2` |
| GREEN pelengkap | target HPP + produk | 103 unit target dan 29 integrasi target lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 44 file / 389 unit, 19 file / 169 integrasi lulus |
| E2E publik | `pnpm test:e2e` | 8 test mobile/desktop lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage --coverage.include=src/lib/hpp/**/*.ts` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| ambilKonteksHpp | ≤ 5 query, tanpa N+1; muat produk, komponen, resep, item, harga bahan, biaya tambahan, dan default pengaturan toko |
| hitungHppProdukDariKonteks | mengembalikan RincianHpp untuk satu produk dari konteks |
| hppSemuaProduk | Brownies Cup: HPP Rp2.606,25, margin Rp2.393,75, margin 47,875%, saran harga Rp4.000 |
| ubah harga bahan | HPP berubah tanpa simpan ulang produk |
| hppUntukSnapshot | mengembalikan HPP dengan 2 desimal; array kosong → Map kosong |
| ubahHargaJual | ubah harga jual dengan audit; id tidak ada ditolak; kasir ditolak; harga negatif ditolak |
| query count | maksimal 5 query untuk konteks HPP semua produk |
| benchmark | 100 produk sintetis dihitung < 300 ms |
| overhead global | biaya `produk_id IS NULL` digabungkan dengan biaya khusus tiap produk |
| label rincian | komponen bahan langsung mempertahankan nama bahan, bukan label kosong |
| Halaman /produk | menampilkan kartu produk dengan HPP, margin %, dan badge status; filter kategori, dijual, dan margin di bawah target |
| Halaman /produk/[id] | menampilkan rincian HPP per peran, tabel komponen, kartu margin, saran harga dengan tombol "Pakai harga ini", dan tab Ringkasan/Stok/Riwayat produksi |

## Catatan

- `hitungHppSemua` dari `@/lib/hpp/simulasi` dipakai untuk menghitung RincianHpp semua produk dari konteks.
- `hitungMargin` dan `saranHarga` dari `@/lib/hpp/margin` dipakai untuk margin dan saran harga jual.
- `ubahHargaJual` mengunci produk dengan `FOR UPDATE`, mencatat audit bila harga berubah, dan hanya bisa dipanggil pemilik.
- Target margin default dari `pengaturan_toko.target_margin_default` bila produk tidak punya target sendiri.
- Filter daftar produk memakai URL search params (`q`, `kategori`, `dijual`, `margin`) agar dapat dibagikan sebagai link.
- `HppRingkasanProduk.rincian` dipakai halaman detail untuk menampilkan proporsi adonan,
  topping, filling, kemasan, lainnya, overhead, perkiraan pcs per resep, dan peringatan.
