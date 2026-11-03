import 'server-only';

import { redirect } from 'next/navigation';

import type { Peran } from '@/db/schema';
import { type PenggunaAktif, getPengguna } from '@/lib/auth/pengguna';

export type { PenggunaAktif };
export { getPengguna };

export class BelumLoginError extends Error {
  constructor(message = 'Sesi berakhir, silakan masuk lagi') {
    super(message);
    this.name = 'BelumLoginError';
  }
}

export class TidakBerwenangError extends Error {
  constructor(message = 'Anda tidak berwenang melakukan aksi ini') {
    super(message);
    this.name = 'TidakBerwenangError';
  }
}

export async function requirePengguna(): Promise<PenggunaAktif> {
  const pengguna = await getPengguna();
  if (!pengguna) redirect('/login');
  return pengguna;
}

export async function requirePeran(...peran: Peran[]): Promise<PenggunaAktif> {
  const pengguna = await requirePengguna();
  if (!peran.includes(pengguna.peran)) redirect('/dashboard?pesan=tidak-berwenang');
  return pengguna;
}

export async function requirePenggunaAksi(): Promise<PenggunaAktif> {
  const pengguna = await getPengguna();
  if (!pengguna) throw new BelumLoginError();
  return pengguna;
}

export async function requirePeranAksi(...peran: Peran[]): Promise<PenggunaAktif> {
  const pengguna = await requirePenggunaAksi();
  if (!peran.includes(pengguna.peran)) throw new TidakBerwenangError();
  return pengguna;
}
