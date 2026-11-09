# Bukti TDD — Step 1.10 Simulasi Kenaikan Harga Bahan

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.10 dan `docs/PRD.md` F-PRD-07. Perjalanan
pengguna: pemilik memilih satu atau beberapa bahan, mengisi persentase perubahan, lalu melihat dampak
HPP/margin tanpa mengubah data.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `pnpm test -- src/features/simulasi/schemas.test.ts src/features/simulasi/format.test.ts` | 2 suite gagal karena modul schema/format belum ada; commit `3365851` |
| RED | `pnpm test:int -- tests/integration/simulasi-harga.test.ts` | suite gagal karena action/query simulasi belum ada; commit `3365851` |
| GREEN target | dua perintah target di atas | 12 unit dan 7 integrasi lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 49 file / 456 unit dan 23 file / 233 integrasi lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage.enabled --coverage.include="src/lib/hpp/**" --coverage.reporter=json-summary` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `SKIP_ENV_VALIDATION=1 pnpm build` | Lulus |

## Jaminan test

| # | Jaminan | Bukti |
| --- | --- | --- |
| 1 | Persentase menerima −50 sampai +200 (inklusif), format koma/desimal, dan maksimal 2 desimal | `src/features/simulasi/schemas.test.ts` |
| 2 | Minimal satu dan maksimal 20 bahan; bahan duplikat ditolak pada baris yang tepat | `src/features/simulasi/schemas.test.ts` |
| 3 | Ringkasan berbentuk “8 produk terdampak, 3 jadi di bawah target margin” | `src/features/simulasi/format.test.ts` |
| 4 | Coklat naik 10% menghasilkan produk terurut berdasarkan selisih HPP terbesar dengan HPP/margin lama-baru dan saran harga | `tests/integration/simulasi-harga.test.ts` |
| 5 | Beberapa perubahan digabung dan hanya produk aktif yang ditampilkan | `tests/integration/simulasi-harga.test.ts` |
| 6 | Bahan tidak ada ditolak dengan field error; kasir tidak berwenang | `tests/integration/simulasi-harga.test.ts` |
| 7 | Semua tabel public memiliki snapshot identik sebelum dan sesudah action simulasi | `tests/integration/simulasi-harga.test.ts` |
| 8 | Pilihan memuat semua bahan, termasuk nonaktif, dan terurut berdasarkan nama | `tests/integration/simulasi-harga.test.ts` |

## Catatan implementasi

- Tidak ada perubahan schema atau migrasi database pada Step 1.10.
- Halaman `/produk/simulasi` mendukung beberapa baris bahan, tombol cepat +5%/+10%/+20%, kartu
  ponsel, dan tabel desktop.
- Hasil menyediakan tautan ke detail produk untuk mengubah harga jual.
- Detail bahan membuka `/produk/simulasi?bahanId=…`, sehingga bahan langsung terpilih.
- Action hanya membaca database. Bukti read-only membandingkan isi seluruh tabel public, bukan hanya
  jumlah baris.
