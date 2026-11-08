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
| Regresi | `pnpm test`, `pnpm test:int` | 42 file / 384 unit, 19 file / 165 integrasi lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage --coverage.include=src/lib/hpp/**/*.ts` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| ambilKonteksHpp | ≤ 5 query, tanpa N+1; muat produk, komponen, resep, item, harga bahan, biaya tambahan |
| hitungHppProdukDariKonteks | mengembalikan RincianHpp untuk satu produk dari konteks |
| hppSemuaProduk | Brownies Cup: HPP Rp2.606,25, margin Rp2.393,75, margin 47,875%, saran harga Rp4.000 |
| ubah harga bahan | HPP berubah tanpa simpan ulang produk |
| hppUntukSnapshot | mengembalikan HPP dengan 2 desimal; array kosong → Map kosong |
| ubahHargaJual | ubah harga jual dengan audit; id tidak ada ditolak; kasir ditolak; harga negatif ditolak |
| query count | maksimal 5 query untuk konteks HPP semua produk |
| Halaman /produk | menampilkan kartu produk dengan HPP, margin %, dan badge status; filter kategori, dijual, dan margin di bawah target |
| Halaman /produk/[id] | menampilkan rincian HPP per peran, tabel komponen, kartu margin, saran harga dengan tombol "Pakai harga ini", dan tab Ringkasan/Stok/Riwayat produksi |

## Catatan

- `hitungHppSemua` dari `@/lib/hpp/simulasi` dipakai untuk menghitung RincianHpp semua produk dari konteks.
- `hitungMargin` dan `saranHarga` dari `@/lib/hpp/margin` dipakai untuk margin dan saran harga jual.
- `ubahHargaJual` mengunci produk dengan `FOR UPDATE`, mencatat audit bila harga berubah, dan hanya bisa dipanggil pemilik.
- Target margin default dari `pengaturan_toko.target_margin_default` bila produk tidak punya target sendiri.
- Filter daftar produk memakai URL search params (`q`, `kategori`, `dijual`, `margin`) agar dapat dibagikan sebagai link.
