# Bukti TDD — Step 1.9 Biaya Tambahan (Overhead)

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.9, `docs/PRD.md` F-PRD-06, §7.4, dan
keputusan K2 di §10, serta `docs/ERD.md` tabel `biaya_tambahan`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project unit src/features/biaya-tambahan src/lib/hpp/simulasi.test.ts` | 3 file gagal: modul `schemas`/`format` belum ada, `simulasiBiayaTambahan` belum ada; commit `d715bd8` |
| RED | `vitest run --project integration tests/integration/biaya-tambahan.test.ts` | file gagal dimuat karena `@/features/biaya-tambahan/actions` belum ada; commit `d715bd8` |
| GREEN | dua perintah di atas | 37 unit target dan 17 integrasi lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 46 file / 416 unit, 20 file / 186 integrasi lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage --coverage.include=src/lib/hpp/**/*.ts` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

Satu ekspektasi GREEN dikoreksi: dua produk dengan selisih sama (+Rp150) tetap mengikuti urutan nama
produk (Bites sebelum Cup), bukan urutan pembuatan.

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| Schema persen | diketik 0–100 (maks. 2 desimal), disimpan 0–1; `10` → `0.1`, `12,5` → `0.125`; > 100 ditolak "Persen maksimal 100" |
| Schema rupiah | per_pcs/per_batch apa adanya, format Indonesia (`1.500` → `1500`), negatif/bukan angka/kosong/terlalu besar ditolak |
| Produk opsional | `''`/null → berlaku untuk semua produk; produk tidak ada ditolak di field `produkId` |
| per_batch produk tertentu | Rp2.400 untuk Cup → overhead Rp100/pcs (24 pcs/resep); Bites tetap Rp250 |
| Biaya nonaktif | tidak dihitung; diaktifkan → masuk HPP; dinonaktifkan lagi → keluar |
| Ubah biaya | metode, nilai, dan produk berubah; HPP produk lama kembali normal |
| Hapus | baris dihapus; id tidak ada ditolak "Biaya tambahan tidak ditemukan" |
| Otorisasi | kasir ditolak untuk buat, ubah, setAktif, hapus, dan pratinjau; data tidak berubah |
| `pratinjauDampakBiaya` | tidak menyimpan; hanya produk aktif; rata-rata 2 desimal; biaya lama diganti (bukan ditambah) saat diubah; nilai sama → tidak ada dampak |
| `simulasiBiayaTambahan` | biaya baru, khusus produk, nonaktif, dipindah ke semua produk, dan penurunan; urut besar selisih |
| Format | label metode, `Rp150/pcs`, `12,5%`, `Rp5.000/resep`, kalimat "Mengubah HPP 12 produk, rata-rata +Rp150/pcs" |

## Catatan

- `ambilKonteksHpp` kini membawa `id` biaya tambahan dan opsi `hanyaAktif` untuk produk; tetap ≤ 5 query.
- Form memakai dua langkah: "Lihat dampak" memanggil `pratinjauDampakBiaya`, lalu "Simpan". Mengubah
  isian apa pun mereset pratinjau.
- Halaman `/produk/biaya-tambahan` memakai kartu di ponsel dan tabel di layar `md` ke atas, dengan
  teks bantuan K2. Tautan ada di header `/produk` dan di kartu Rincian HPP `/produk/[id]`.
- Kartu Rincian HPP menampilkan overhead per metode (per pcs, % biaya bahan, per resep/batch) bila ada.
