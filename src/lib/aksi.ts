import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import type { z } from 'zod';

import type { Peran } from '@/db/schema';
import {
  BelumLoginError,
  type PenggunaAktif,
  TidakBerwenangError,
  requirePenggunaAksi,
} from '@/lib/auth';
import { PesanError } from '@/lib/error';
import { log } from '@/lib/log';
import '@/lib/zod-id';

export { PesanError };

export type HasilAksi<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const PESAN_ERROR_UMUM = 'Terjadi kesalahan, coba lagi';

const PESAN_POSTGRES: Record<string, string> = {
  '23505': 'Data dengan nama ini sudah ada',
  '23503': 'Data masih dipakai di tempat lain',
};

/** Cari kode error Postgres, termasuk yang dibungkus drizzle di `cause`. */
function kodePostgres(error: unknown): string | undefined {
  for (let saat = error, i = 0; saat && i < 5; i++) {
    if (typeof saat !== 'object') return undefined;
    const { code } = saat as { code?: unknown };
    if (typeof code === 'string' && code in PESAN_POSTGRES) return code;
    saat = (saat as { cause?: unknown }).cause;
  }
  return undefined;
}

function pesanUntuk(error: unknown): string | null {
  if (
    error instanceof PesanError ||
    error instanceof BelumLoginError ||
    error instanceof TidakBerwenangError
  ) {
    return error.message;
  }
  const kode = kodePostgres(error);
  return kode ? (PESAN_POSTGRES[kode] ?? null) : null;
}

function fieldErrorsDari(error: z.ZodError): Record<string, string[]> {
  const hasil: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const kunci = issue.path.length > 0 ? issue.path.join('.') : '_form';
    (hasil[kunci] ??= []).push(issue.message);
  }
  return hasil;
}

type OpsiAksi<S extends z.ZodType, T> = {
  schema: S;
  /** Kosong = semua pengguna yang login. */
  peran?: Peran[];
  jalankan: (input: z.output<S>, pengguna: PenggunaAktif) => Promise<T>;
};

/**
 * Pembungkus server action: cek login & peran, parse Zod, jalankan, lalu ubah error menjadi
 * `HasilAksi`. `redirect()`/`notFound()` dari Next tetap diteruskan.
 */
export function aksi<S extends z.ZodType, T>({
  schema,
  peran,
  jalankan,
}: OpsiAksi<S, T>): (input: unknown) => Promise<HasilAksi<T>> {
  return async (input) => {
    let pengguna: PenggunaAktif | undefined;
    try {
      pengguna = await requirePenggunaAksi();
      if (peran && peran.length > 0 && !peran.includes(pengguna.peran)) {
        throw new TidakBerwenangError();
      }

      const hasilParse = schema.safeParse(input);
      if (!hasilParse.success) {
        return {
          ok: false,
          error: 'Periksa kembali isian yang ditandai',
          fieldErrors: fieldErrorsDari(hasilParse.error),
        };
      }

      return { ok: true, data: await jalankan(hasilParse.data, pengguna) };
    } catch (error) {
      unstable_rethrow(error);
      const pesan = pesanUntuk(error);
      if (pesan && error instanceof PesanError && error.field) {
        return { ok: false, error: pesan, fieldErrors: { [error.field]: [pesan] } };
      }
      if (pesan) return { ok: false, error: pesan };

      log.error('Server action gagal', { error, penggunaId: pengguna?.id });
      return { ok: false, error: PESAN_ERROR_UMUM };
    }
  };
}
