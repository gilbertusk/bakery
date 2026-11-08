# Bukti TDD — Step 1.2 Master Bahan

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.2, `docs/PRD.md` F-BHN-01, F-BHN-02,
F-BHN-04, F-STK-06, dan `docs/ERD.md` tabel `bahan`, `riwayat_harga`, `stok_mutasi`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project unit src/lib src/features` dan `vitest run --project integration tests/integration/bahan.test.ts` | Modul bahan belum ada sehingga suite gagal; commit `1b81016` |
| GREEN | `vitest run --project unit src/lib src/features` | 34 file / 341 test lulus saat backend menjadi hijau |
| GREEN | `vitest run --project integration tests/integration/bahan.test.ts` | 28 test lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 38 file / 360 unit, 14 file / 112 integrasi lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage --coverage.include=src/lib/hpp/**/*.ts` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| Schema nama, kategori bebas, satuan, stok minimal, supplier, harga/stok awal | tervalidasi dan dinormalisasi |
| Harga kemasan kg/g/l/ml/pcs/lusin | dikonversi ke harga per satuan dasar dengan Decimal, maksimal 4 desimal |
| Kemasan tidak cocok dengan satuan dasar | ditolak di field `satuanKemasan` |
| Buat dengan harga dan stok awal | menulis bahan, `riwayat_harga`, serta `stok_mutasi` jenis `stok_awal` |
| Supplier baru nonaktif/tidak ada | ditolak; supplier lama yang kemudian nonaktif tetap boleh dipertahankan |
| Nama duplikat tanpa membedakan kapital | pesan ramah di field `nama` |
| Satuan bahan yang sudah dipakai | terkunci; field lain masih bisa diubah |
| Ganti satuan bahan belum terkunci | harga lama direset ke 0 dan dicatat di riwayat bila sebelumnya tidak nol |
| Ubah harga manual | memperbarui bahan serta menulis riwayat dan audit; harga sama tidak menulis apa pun |
| Nonaktifkan/aktifkan dan ID tidak ada | tersimpan atau mengembalikan pesan bisnis yang sesuai |
| Kasir pada seluruh action bahan | ditolak dan data tidak berubah |
| Daftar/detail/filter/badge perhatian | urut nama, status aman/menipis/minus, supplier, kategori, aktif, dan hitungan sesuai |
| Riwayat harga | terbaru dulu dan menyertakan nama pengguna |

## Catatan

- Test integrasi action memakai DB test nyata; autentikasi dan `revalidatePath` di-mock.
- Semua query dan action modul bahan hanya dipanggil setelah pemeriksaan peran pemilik pada halaman.
- Tampilan daftar memakai kartu pada layar kecil dan tabel mulai breakpoint `md`; form dibuat sebagai
  halaman penuh agar tetap nyaman pada lebar 360 px.
