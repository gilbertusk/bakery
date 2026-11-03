# Toko Kue

[![CI](https://github.com/gilbertusk/bakery/actions/workflows/ci.yml/badge.svg)](https://github.com/gilbertusk/bakery/actions/workflows/ci.yml)

Aplikasi kasir, stok bahan, resep & HPP, produksi, pre-order, dan kas untuk toko kue rumahan.
Dibangun dengan Next.js 16, Supabase (Postgres + Auth), Drizzle ORM, dan shadcn/ui.

## Dokumentasi

- [Setup lokal](docs/setup.md): prasyarat, env, database test, migrasi, seed.
- [Deploy](docs/deploy.md): CI, migrasi produksi, Vercel, rollback.
- [PRD](docs/PRD.md), [ERD](docs/ERD.md), [Rencana](docs/PLAN.md).
- [CLAUDE.md](CLAUDE.md): aturan arsitektur dan utilitas inti.

## Perintah utama

```bash
pnpm dev            # server pengembangan
pnpm test           # unit test
pnpm db:test:up     # PostgreSQL test (Docker), lalu:
pnpm test:int       # test integrasi
pnpm test:e2e       # Playwright
pnpm lint && pnpm typecheck && pnpm format:check
```
