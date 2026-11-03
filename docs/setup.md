# Setup Lokal

## Prasyarat

- Node.js LTS dan pnpm sesuai `package.json`
- Docker Desktop
- Akun Supabase

## 1. Pasang dependency

```bash
pnpm install
```

## 2. Buat proyek Supabase

Buat dua proyek di region Singapore:

- `tokokue-dev` untuk pengembangan
- `tokokue-prod` untuk produksi

Di masing-masing proyek, buka **Authentication → Sign In / Providers** lalu nonaktifkan
**Allow new users to sign up**. Pengguna nantinya dibuat atau diundang oleh pemilik.

## 3. Isi environment lokal

Salin `.env.example` menjadi `.env.local`. Ambil nilainya dari dashboard Supabase:

| Variabel | Lokasi |
| --- | --- |
| `DATABASE_URL` | Project Settings → Database → Transaction pooler, port 6543 |
| `DATABASE_URL_DIRECT` | Project Settings → Database → Direct/Session, port 5432 |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role / secret key |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon / publishable key |

Jangan commit `.env.local` dan jangan membagikan nilainya melalui chat atau issue tracker.

Periksa koneksi runtime:

```bash
pnpm db:check
```

## 4. Database test lokal

Salin `.env.test.example` menjadi `.env.test` bila belum ada, lalu jalankan:

```bash
pnpm db:test:up
pnpm test:int
pnpm db:test:down
```

PostgreSQL test berjalan pada `localhost:54329` dengan database `tokokue_test`. Global setup
mereset schema, membuat stub minimum Supabase Auth, lalu menjalankan seluruh migrasi Drizzle.

## 5. Migrasi database

Setelah schema berubah:

```bash
pnpm db:generate
pnpm db:migrate
```

Gunakan `DATABASE_URL_DIRECT` untuk migrasi. Jangan mengedit file migrasi yang sudah pernah
diterapkan; buat migrasi baru.
