# Bukti TDD — Step 1.1b Mesin hitung bagian 2

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.1b, `docs/PRD.md` §7.4, §7.5, §7.7, F-PRD-02 s.d.
F-PRD-07, F-PRO-02. Fixture `src/lib/hpp/__fixtures__/brownies.ts` memakai data seed 0.4.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project unit src/lib/hpp` | 4 file test gagal dimuat (modul belum ada); commit `fd8ef55` |
| GREEN | `vitest run --project unit src/lib/hpp` | 11 file, 90 test lulus |
| Coverage | `vitest run --coverage --coverage.include=src/lib/hpp/**` | 100% statements, branches, functions, lines |
| Regresi | `pnpm test` | 31 file, 232 unit test lulus |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check` | Lulus |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| Brownies Cup 50 g + kemasan | adonan Rp2.106,25 + kemasan Rp500 = HPP Rp2.606,25; 24 pcs per resep |
| Overhead Rp200/pcs + 10% + Rp6.000/batch (24 pcs) | 200 + 260,625 + 250 = Rp710,625 |
| Produk dua adonan | adonan utama = gram per pcs terbesar |
| Alokasi Rp48.000: Cup 50 g × 12 dan Bites 25 g × 24 | Rp24.000 : Rp24.000 |
| pcs aktual 0 | `hppAktual` null |
| Pemakaian bahan skala 1,5 + topping | resep × 1,5 sekali; keju 45 + 100 = 145 g |
| Coklat naik 10% | hanya Loyang, Cup, Bites; Bolu tidak muncul |

## Catatan

- Fixture menambah resep Bolu Vanila (tanpa coklat) agar simulasi bisa membuktikan produk yang
  tidak terdampak tidak muncul.
- Kasus tepi lain: komponen kosong, gram per pcs melebihi hasil resep, harga turun (persen
  negatif), harga jual 0, bahan/resep tidak ada di konteks.
