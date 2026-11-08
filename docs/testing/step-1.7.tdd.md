# Bukti TDD — Step 1.7 Produk & Komponen

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.7, `docs/PRD.md` F-PRD-01 sampai F-PRD-05,
dan `docs/ERD.md` tabel `produk`, `produk_komponen`, serta `biaya_tambahan`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project unit src/features/produk/schemas.test.ts` | file test gagal dimuat karena modul belum ada; commit `4d7ba51` |
| RED | `vitest run --project integration tests/integration/produk.test.ts` | file test gagal dimuat karena action/query belum ada; commit `4d7ba51` |
| GREEN | unit target termasuk `src/lib/hpp/produk.test.ts` | 384 test lulus |
| GREEN | integrasi produk | 154 test lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 42 file / 384 unit, 18 file / 154 integrasi lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage --coverage.include=src/lib/hpp/**/*.ts` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| Schema produk | nama minimal 2 karakter, kategori wajib, harga jual ≥ 0, target margin 0–0,95 |
| Komponen | minimal satu, resep tidak boleh duplikat, bahan dengan peran sama tidak boleh duplikat |
| Komponen adonan vs bahan | adonan pakai `resepAdonanId`, bahan pakai `bahanId` + `konversiSatuanId` opsional |
| Takaran dasar | dihitung di server dari `gramPerPcs` (adonan) atau `takaran × konversi` (bahan) |
| Simpan produk | transaksi atomik; ubah mengganti seluruh komponen tanpa mengganti ID produk |
| Nama duplikat | beda kapital ditolak di field `nama` |
| Status aktif / dijual | dapat diubah secara independen; id tidak ada ditolak |
| Daftar produk | filter pencarian (case-insensitive), kategori, dijual, dan aktif |
| Detail produk | memuat komponen dengan nama resep/bahan, satuan, takaran, dan biaya per pcs |
| Pilihan resep | hanya resep aktif dengan biaya per gram dan hasil gram |
| Upload foto | terima jpeg/png/webp ≤ 2 MB, simpan `foto_url`, hapus foto lama |
| Upload foto | tolak file > 2 MB dan tipe non-gambar |
| Otorisasi | kasir ditolak menyimpan serta mengubah status produk; data tidak berubah |

## Catatan

- `simpanProduk` mengunci produk saat ubah, menghitung `takaran_dasar` semua komponen di server,
  dan mengganti seluruh komponen dalam satu transaksi.
- Audit mencatat perubahan `harga_jual` ke tabel `audit_log`.
- `unggahFotoProduk` memakai Supabase service role untuk upload ke bucket `produk`; validasi
  tipe dan ukuran dilakukan di server sebelum upload.
- Detail produk menghitung biaya per pcs dari biaya per gram resep (adonan) atau
  takaran dasar × harga per satuan (bahan langsung).
