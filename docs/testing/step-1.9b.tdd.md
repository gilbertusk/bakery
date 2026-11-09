# Bukti TDD — Step 1.9b Master Add-on

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.9b, `docs/PRD.md` F-ADD-01/F-ADD-02 dan
§7.12, serta `docs/ERD.md` tabel `add_on`, `penjualan_item_add_on`, dan
`pre_order_item_add_on`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `pnpm test -- src/lib/hpp/add-on.test.ts src/lib/hpp/index.test.ts` | 2 file gagal karena modul dan ekspor add-on belum ada; commit `ba1407f` |
| RED | `pnpm test:int -- tests/integration/add-on.test.ts tests/integration/schema-add-on.test.ts tests/integration/rls.test.ts tests/integration/seed-contoh.test.ts` | 23 test gagal dan 1 test lama lulus karena tabel/fitur add-on belum ada; commit `ba1407f` |
| GREEN target | perintah target di atas, ditambah `tests/integration/schema-transaksi.test.ts` | 5 file / 64 test integrasi lulus; 12 file / 125 test HPP lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 47 file / 444 unit dan 22 file / 226 integrasi lulus |
| Coverage HPP | `vitest run --project unit src/lib/hpp --coverage.enabled --coverage.include="src/lib/hpp/**" --coverage.reporter=json-summary` | statement, branch, function, dan line 100% |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `SKIP_ENV_VALIDATION=1 pnpm build` | Lulus; route `/produk/add-on` terbangun |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| HPP add-on | takaran dasar × harga bahan tanpa overhead dan tanpa pembulatan; input salah memakai `HitungError` berbahasa Indonesia |
| Hitung item | harga per pcs/subtotal termasuk semua add-on; diskon persen dibulatkan ke bawah; add-on duplikat ditolak; selisih harga kasir dihitung per seluruh qty |
| Kebutuhan bahan | `takaran_dasar × qty` dijumlahkan per bahan lintas item untuk stok kasir dan rekap PO |
| Schema | nama add-on unik case-insensitive; takaran/takaran dasar > 0; harga ≥ 0; satu add-on maksimal sekali per item penjualan/PO |
| Penjualan item | `harga_add_on` default 0 dan ≥ 0; CHECK subtotal/diskon menghitung harga produk + add-on; kasus transaksi lama tetap lulus |
| RLS | aktif tanpa policy untuk `add_on`, `penjualan_item_add_on`, dan `pre_order_item_add_on` |
| CRUD pemilik | buat, ubah, aktif/nonaktif, hapus; kasir ditolak; nama duplikat, bahan/konversi salah, dan id tidak ada mendapat pesan bisnis |
| Takaran dasar | nilai dari klien diabaikan dan dihitung server dari takaran + konversi |
| Audit harga | perubahan harga menulis audit `add_on/update` berisi harga lama/baru; perubahan lain tanpa harga tidak menulis audit |
| Hapus terpakai | add-on yang sudah dipakai penjualan atau PO ditolak dengan saran untuk menonaktifkan |
| Query pemilik | urut nama; menampilkan bahan, takaran, harga, HPP, margin, status target default toko, dan aktif |
| Query kasir | hanya add-on aktif; DTO terbatas pada `{ id, nama, harga }` tanpa data biaya |
| Seed contoh | idempoten: Extra keju 20 g Rp3.000 dan Extra coklat 15 g Rp2.000 |

## Catatan implementasi

- Migrasi `drizzle/0005_add_on.sql` menambah tiga tabel, mengaktifkan RLS, dan menambah
  `penjualan_item.harga_add_on`. Migrasi lama tidak diubah.
- Server transaksi pada fase berikutnya wajib memastikan `harga_add_on` sama dengan jumlah harga
  baris anak. Rumus subtotal PO tetap divalidasi server pada Fase 3 sesuai keputusan U4.
- Halaman `/produk/add-on` memakai kartu pada ponsel dan tabel pada layar `md` ke atas. Form berisi
  combobox bahan, takaran/satuan, harga, serta pratinjau HPP dan margin secara langsung di klien.
- Teks bantuan membedakan add-on pilihan pembeli dari komponen produk yang selalu dipakai.
