# Deploy

Hosting: **Vercel Hobby (gratis) + Supabase**, region `sin1` (Singapura, lihat `vercel.json`).

> **Perhatian lisensi.** Ketentuan Vercel Hobby hanya untuk pemakaian non-komersial
> (lihat [PLAN §7](PLAN.md#7-hosting--biaya)). Hobby cukup untuk demo dan uji coba. Sebelum
> toko memakai aplikasi untuk transaksi sungguhan, upgrade ke Vercel Pro atau pindah ke
> Cloudflare Workers (opsi B). Kode tidak perlu diubah untuk upgrade ke Pro.

## Gambaran

| Bagian | Tempat | Pemicu |
| --- | --- | --- |
| CI (lint, typecheck, format, test unit + coverage, test integrasi, build) | GitHub Actions `ci.yml` | Push ke semua branch dan pull request |
| Migrasi + seed sistem produksi | GitHub Actions `migrate.yml`, environment `production` | Manual, atau otomatis setelah CI lulus di `main` (perlu persetujuan reviewer) |
| Aplikasi | Vercel | Push ke `main` → Production, branch lain → Preview |

Urutan aman saat ada migrasi baru: setujui `migrate.yml` dulu, baru biarkan deploy Vercel dipakai.
Migrasi harus selalu kompatibel ke belakang (tambah kolom/tabel; hapus kolom di rilis berikutnya),
karena Vercel bisa selesai deploy sebelum migrasi disetujui.

## 1. Supabase

Buat dua proyek: `tokokue-dev` (untuk Preview dan lokal) dan `tokokue-prod` (Production).
Untuk masing-masing:

1. **Authentication → Sign In / Providers:** matikan _Allow new users to sign up_.
2. **Authentication → URL Configuration:**
   - _Site URL_: URL produksi, mis. `https://tokokue.vercel.app` (prod) atau `http://localhost:3000` (dev).
   - _Redirect URLs_:
     - prod: `https://<domain-produksi>/login/konfirmasi`
     - dev: `http://localhost:3000/login/konfirmasi` dan
       `https://*-<akun-vercel>.vercel.app/login/konfirmasi` (semua URL preview)
3. Catat nilai di **Project Settings → Database** dan **Project Settings → API** (tabel env di bawah).

## 2. GitHub

1. Push repo (branch utama `main`).
2. **Settings → Environments → New environment** → `production`:
   - _Required reviewers_: tambahkan akun Anda.
   - _Deployment branches_: `main` saja.
   - _Environment secrets_: `DATABASE_URL_DIRECT_PROD` = connection string **Direct/Session (port
     5432)** proyek `tokokue-prod`.
3. CI tidak butuh secret: test memakai service PostgreSQL sekali pakai, build memakai
   `SKIP_ENV_VALIDATION=1`.
4. Jalankan migrasi pertama: **Actions → Migrasi produksi → Run workflow**, lalu setujui.
5. Buat akun pemilik pertama dari lokal dengan `.env.local` mengarah ke prod sementara
   (`pnpm buat-pemilik`), atau lewat Supabase Dashboard → Authentication → Add user. Pengguna
   pertama otomatis menjadi pemilik.

## 3. Vercel

1. **Add New → Project → Import** repo GitHub. Framework terdeteksi Next.js; biarkan build
   command default (`pnpm build`). Install memakai pnpm dari `packageManager`.
2. **Settings → Environment Variables**:

| Variabel | Production | Preview | Keterangan |
| --- | --- | --- | --- |
| `DATABASE_URL` | prod, pooler port 6543 | dev, pooler port 6543 | Transaction pooler |
| `DATABASE_URL_DIRECT` | prod, port 5432 | dev, port 5432 | Divalidasi saat start; tidak dipakai runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | dev | **Rahasia.** Jangan beri prefix `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SUPABASE_URL` | prod | dev | Ikut ter-bundle ke browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | dev | Ikut ter-bundle ke browser |
| `APP_TIMEZONE` | `Asia/Jakarta` | `Asia/Jakarta` | |

   Jangan isi `SKIP_ENV_VALIDATION` di Vercel: build harus gagal bila env kurang.
3. **Settings → Functions**: pastikan region `Singapore (sin1)`.
4. Deploy ulang setelah env diisi (**Deployments → … → Redeploy**).

## 4. Cek setelah deploy

- Buka URL produksi → diarahkan ke `/login`.
- Login dengan akun pemilik → masuk dashboard.
- Header keamanan: `curl -I https://<domain>/login` menampilkan `x-frame-options: DENY`,
  `x-content-type-options: nosniff`, `referrer-policy`, `permissions-policy`.
- Lupa password → email berisi link ke `/login/konfirmasi` di domain yang benar.

## 5. Rollback

- **Aplikasi:** Vercel → Deployments → pilih deploy terakhir yang sehat → **Instant Rollback**
  (Hobby: hanya ke deploy production sebelumnya). Atau `git revert` lalu push ke `main`.
- **Database:** migrasi Drizzle tidak punya _down_. Perbaiki dengan migrasi baru yang membalik
  perubahan, lalu jalankan `migrate.yml`. Karena migrasi kompatibel ke belakang, rollback aplikasi
  tidak memerlukan rollback database.
- **Data rusak:** pulihkan dari backup harian (workflow `backup.yml`, dibuat di fase berikutnya).
  Supabase Free tidak punya Point-in-Time Recovery.
