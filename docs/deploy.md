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

## Kondisi saat ini

| Bagian | Nilai |
| --- | --- |
| URL produksi | `https://tokokue-teal.vercel.app` (`tokokue.vercel.app` milik akun lain) |
| Proyek Vercel | `tokokue` di tim `gilbertuskristo-gmailcoms-projects`, terhubung ke `gilbertusk/bakery`, branch produksi `main` |
| Supabase | Satu proyek `bakery` (ref `baaqilnsucpnamqoderk`), region **`eu-west-1` (Irlandia)** |
| Kredensial prod lokal | `.env.prod` (di-ignore git). `.env.local` tetap mengarah ke DB test lokal agar seed lokal tidak menyentuh prod |

Catatan:

- Kuota Supabase Free (2 proyek aktif) penuh, jadi **tidak ada proyek dev**. Preview Vercel memakai
  database produksi. Jangan uji coba dengan data sungguhan di URL preview.
- Region Irlandia menambah latensi ±150–200 ms per query dari fungsi Vercel `sin1`. Region proyek
  Supabase tidak bisa dipindah. Sebelum go-live, pertimbangkan proyek baru di `ap-southeast-1`
  lalu pindahkan data.

## 1. Supabase

Idealnya dua proyek: `tokokue-dev` (untuk Preview dan lokal) dan `tokokue-prod` (Production), di
region `ap-southeast-1`. Untuk masing-masing:

1. **Authentication → Sign In / Providers:** matikan _Allow new users to sign up_.
2. **Authentication → URL Configuration:**
   - _Site URL_: URL produksi, mis. `https://tokokue-teal.vercel.app` (prod) atau
     `http://localhost:3000` (dev).
   - _Redirect URLs_:
     - prod: `https://<domain-produksi>/login/konfirmasi`
     - dev: `http://localhost:3000/login/konfirmasi` dan
       `https://*-<akun-vercel>.vercel.app/login/konfirmasi` (semua URL preview)
3. Catat nilai di **Project Settings → Database** dan **Project Settings → API** (tabel env di bawah).

> **Host direct `db.<ref>.supabase.co` hanya IPv6.** GitHub Actions, Vercel, dan banyak jaringan
> rumah tidak mendukung IPv6 (gagal dengan `ENOENT`/`ENOTFOUND`). Untuk `DATABASE_URL_DIRECT`
> pakai **session pooler**: `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
> `DATABASE_URL` memakai host pooler yang sama di port `6543` (transaction pooler).

## 2. GitHub

1. Push repo (branch utama `main`).
2. **Settings → Environments → New environment** → `production`:
   - _Required reviewers_: tambahkan akun Anda.
   - _Deployment branches_: `main` saja.
   - _Environment secrets_: `DATABASE_URL_DIRECT_PROD` = connection string **session pooler (port
     5432)** proyek produksi.
3. CI tidak butuh secret: test memakai service PostgreSQL sekali pakai, build memakai
   `SKIP_ENV_VALIDATION=1`.
4. Jalankan migrasi pertama: **Actions → Migrasi produksi → Run workflow**, lalu setujui.
   Workflow memakai concurrency group `migrasi-produksi`: run lama yang masih menunggu persetujuan
   menahan run baru. Batalkan run lama yang tidak dipakai.
5. Buat akun pemilik pertama. `pnpm buat-pemilik` membaca `.env.local`, jadi muat kredensial prod
   hanya untuk satu jendela PowerShell lalu tutup:

   ```powershell
   Get-Content .env.prod | Where-Object { $_ -match '^([A-Z_]+)="(.*)"$' } | ForEach-Object { Set-Item "Env:$($Matches[1])" $Matches[2] }
   pnpm buat-pemilik
   ```

   Atau lewat Supabase Dashboard → Authentication → Add user. Pengguna pertama otomatis menjadi
   pemilik.

## 3. Vercel

1. **Add New → Project → Import** repo GitHub. Framework terdeteksi Next.js; biarkan build
   command default (`pnpm build`). Install memakai pnpm dari `packageManager`.
2. **Settings → Environment Variables**:

| Variabel | Production | Preview | Keterangan |
| --- | --- | --- | --- |
| `DATABASE_URL` | prod, pooler port 6543 | dev, pooler port 6543 | Transaction pooler. Sensitive |
| `DATABASE_URL_DIRECT` | prod, session pooler 5432 | dev, session pooler 5432 | Divalidasi saat start; tidak dipakai runtime. Sensitive |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | dev | **Rahasia.** Sensitive. Jangan beri prefix `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SUPABASE_URL` | prod | dev | Ikut ter-bundle ke browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | dev | Ikut ter-bundle ke browser. Publik by design (dilindungi RLS) |
| `APP_TIMEZONE` | `Asia/Jakarta` | `Asia/Jakarta` | |

   Saat ini kolom Preview diisi nilai prod (tidak ada proyek dev).

   Jangan isi `SKIP_ENV_VALIDATION` di Vercel: build harus gagal bila env kurang.

   Lewat CLI (nilai dari stdin, tidak tampil di layar):

   ```powershell
   $nilai | vercel env add DATABASE_URL --environment production --sensitive --force --yes
   # Anon key terdeteksi mirip credential; Vercel CLI menolak tanpa tipe eksplisit:
   $anon | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY --environment production --type config --force --yes
   ```

   Jika `vercel link` menambahkan `.env*` ke `.gitignore`, hapus baris itu karena membatalkan
   pengecualian `!.env.example`.
3. **Settings → Functions**: pastikan region `Singapore (sin1)`. Cek dari header respons:
   `x-vercel-id` diawali `sin1::`. Pastikan juga **Settings → General**: Framework `Next.js`,
   Node.js `24.x` (proyek yang dibuat lewat `vercel project add` awalnya bernilai `Other`).
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
