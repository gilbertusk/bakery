# Bukti TDD — Step 1.3 Konversi Satuan Bahan

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.3, `docs/PRD.md` F-BHN-03, dan
`docs/ERD.md` tabel `konversi_satuan`, `resep_adonan_item`, serta `produk_komponen`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project unit src/features/bahan/saran-konversi.test.ts` | gagal memuat `saran-konversi`; commit `e3858c6` |
| RED | `vitest run --project integration tests/integration/konversi-bahan.test.ts` | gagal memuat `konversi-actions`; commit `e3858c6` |
| GREEN | dua perintah target yang sama | 3 unit dan 11 integrasi lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 39 file / 363 unit, 15 file / 123 integrasi lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage --coverage.include=src/lib/hpp/**/*.ts` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| Tambah konversi | nama dirapikan, angka Indonesia dinormalisasi, dan tampil terurut di daftar |
| Nama satuan duplikat beda kapital | ditolak di field `namaSatuan` |
| Nama sama dengan satuan dasar | ditolak dengan pesan ramah |
| Nilai nol/negatif | ditolak di field `nilaiDasar` |
| Ubah nilai konversi | `takaran_dasar` seluruh item resep dan komponen produk ikut dihitung ulang |
| Resep mode otomatis terdampak | `hasil_gram` dihitung ulang dari seluruh item resep |
| Resep mode timbang terdampak | `takaran_dasar` item berubah, tetapi `hasil_gram` tetap |
| Hapus konversi yang dipakai resep/produk | ditolak dan pesan menyebut nama resep atau produk |
| Hapus konversi tidak terpakai | baris terhapus |
| Kasir pada seluruh action | ditolak dan data tidak berubah |
| Saran umum | cocok menurut nama/kategori dan satuan dasar bahan |

## Catatan

- Perubahan nilai, hitung ulang item, dan hitung ulang hasil resep berlangsung dalam satu transaksi.
- UI tab Konversi menampilkan daftar, form tambah inline, edit, hapus terkonfirmasi, serta chip
  saran dengan peringatan bahwa nilainya perlu dicek menggunakan timbangan.
