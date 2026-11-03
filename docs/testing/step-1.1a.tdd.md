# Bukti TDD — Step 1.1a Mesin hitung bagian 1

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.1a, `docs/PRD.md` §7.1–7.6, §7.8, F-RSP-02 KP1.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project unit src/lib/hpp` | 6 file test gagal dimuat (modul belum ada); commit `84d87f7` |
| GREEN | `vitest run --project unit src/lib/hpp` | 7 file, 57 test lulus |
| Coverage | `vitest run --coverage --coverage.include=src/lib/hpp/**` | 100% statements, branches, functions, lines |
| Regresi | `pnpm test` | 27 file, 199 unit test lulus |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check` | Lulus |

## Yang dibuktikan test

- Konversi: 3 sdm × 12 g = 36 g; kg/l/lusin ke g/ml/pcs; satuan tidak cocok ditolak.
- Harga: Rp13.500/kg = Rp13,5/g; rata-rata tertimbang 500 g @13 + 1.000 g @14 = 13,6666…;
  stok minus dianggap 0; metode `terakhir` = harga beli.
- Adonan: Rp48.000 / 1.200 g = Rp40/g tanpa pembulatan; mode otomatis menghitung g + ml
  (peringatan 1 ml = 1 g) dan melewati pcs (peringatan mode timbang).
- Margin: HPP 3.200 harga 5.000 = Rp1.800 / 36%; harga 0 → persen `null`.
- Saran harga: HPP 3.200 target 30% → Rp5.000 (bulat ke atas kelipatan 500).
- Skala: bulat 20→24 = 1,44; kotak 20×20→22×22 = 1,21; bulat 20 → kotak 20×20 ≈ 1,2732.
- Semua input tidak valid melempar `HitungError` (turunan `PesanError`) dengan pesan Indonesia.

## Catatan

- Tidak ada operator number untuk uang atau takaran; satu-satunya konversi ke `number` ada di
  `saranHarga` (hasil akhir dibulatkan).
