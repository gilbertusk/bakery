# Bukti TDD — Step 1.4 Supplier

## Sumber

`docs/prompts/01-fase-1-master-hpp.md` bagian 1.4, `docs/PRD.md` F-SUP-01, `docs/ERD.md` tabel
`supplier`.

## Siklus RED → GREEN

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| RED | `vitest run --project unit src/lib/telepon.test.ts src/features/supplier` | 2 file test gagal dimuat (modul belum ada); commit `b573ad1` |
| GREEN | `vitest run --project unit src/lib/telepon.test.ts src/features/supplier` | 31 test lulus |
| GREEN | `vitest run --project integration tests/integration/supplier.test.ts` | 10 test lulus |
| Regresi | `pnpm test`, `pnpm test:int` | 34 file / 270 unit, 13 file / 84 integrasi lulus |
| Cek | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` | Lulus |

## Kasus wajib

| Kasus | Hasil |
| --- | --- |
| `0812-3456-7890`, `+62 812 …` | disimpan `6281234567890` |
| Email / telepon rumah / teks | disimpan apa adanya |
| Nomor HP terlalu pendek/panjang | "Nomor HP tidak valid" |
| Nama < 2 atau > 100 karakter | fieldErrors `nama` |
| buat, ubah, nonaktifkan/aktifkan | tersimpan di DB |
| ID tidak ada | "Supplier tidak ditemukan" |
| Kasir di ketiga action | "Anda tidak berwenang melakukan aksi ini", data tidak berubah |
| Belum login | "Sesi berakhir, silakan masuk lagi" |
| `daftarSupplier` | cari nama/kontak (case-insensitive, `%`/`_` di-escape), filter aktif, jumlah bahan utama |
| `pilihanSupplier` | hanya aktif, urut nama |

## Catatan

- Test integrasi action memakai DB test nyata: `@/db/client` diarahkan ke `testDb`,
  `getPengguna` dan `revalidatePath` di-mock.
- Supplier tidak bisa dihapus, hanya dinonaktifkan (bahan memakai FK `supplier_utama_id`).
