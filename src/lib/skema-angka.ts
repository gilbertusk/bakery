import { z } from 'zod';

import { D, type Decimal } from './angka';

type OpsiAngka = {
  /** Jumlah angka di belakang koma yang diizinkan (= skala kolom numeric). */
  maksDesimal: number;
  /** Harus > 0, bukan sekadar ≥ 0. */
  positif?: boolean;
  /** Presisi kolom numeric; default 14. */
  maksDigit?: number;
};

const POLA_KOMA = /^-?(?:[1-9]\d{0,2}(?:\.\d{3})+|\d+),\d+$/;
const POLA_RIBUAN = /^-?[1-9]\d{0,2}(?:\.\d{3})+$/;
const POLA_TITIK_DESIMAL = /^-?\d+\.\d+$/;
const POLA_BULAT = /^-?\d+$/;

/**
 * Baca ketikan angka gaya Indonesia. Koma = desimal; titik + kelompok 3 digit = ribuan
 * ("1.250" → 1250); titik lain = desimal ("2.5"). Null bila bukan angka.
 */
function bacaTeks(teks: string): Decimal | null {
  if (POLA_KOMA.test(teks)) return D(teks.replaceAll('.', '').replace(',', '.'));
  if (POLA_RIBUAN.test(teks)) return D(teks.replaceAll('.', ''));
  if (POLA_TITIK_DESIMAL.test(teks) || POLA_BULAT.test(teks)) return D(teks);
  return null;
}

function bacaNilai(nilai: unknown): Decimal | null {
  if (typeof nilai === 'number') return Number.isFinite(nilai) ? D(nilai) : null;
  return typeof nilai === 'string' ? bacaTeks(nilai.trim()) : null;
}

function kosong(nilai: unknown): boolean {
  return nilai === null || nilai === undefined || (typeof nilai === 'string' && !nilai.trim());
}

function validasi(
  nilai: unknown,
  { maksDesimal, positif = false, maksDigit = 14 }: OpsiAngka,
): { ok: true; nilai: string } | { ok: false; pesan: string } {
  const d = bacaNilai(nilai);
  if (!d) return { ok: false, pesan: 'Harus berupa angka' };
  if (positif && !d.gt(0)) return { ok: false, pesan: 'Harus lebih dari 0' };
  if (d.lt(0)) return { ok: false, pesan: 'Tidak boleh negatif' };
  if (d.decimalPlaces() > maksDesimal) {
    return { ok: false, pesan: `Maksimal ${maksDesimal} angka di belakang koma` };
  }
  if (d.abs().gte(D(10).pow(maksDigit - maksDesimal))) {
    return { ok: false, pesan: 'Angka terlalu besar' };
  }
  return { ok: true, nilai: d.isZero() ? '0' : d.toFixed() };
}

// `.optional()` agar key yang tidak dikirim tetap masuk transform (pesan "Wajib diisi" sendiri).
const masukan = z.custom<string | number>(() => true).optional();
const masukanOpsional = z.custom<string | number | null>(() => true).optional();

/** Angka desimal dari input form (string/number) → string desimal ternormalisasi untuk numeric. */
export function angkaDesimal(opsi: OpsiAngka) {
  return masukan.transform((nilai, ctx) => {
    if (kosong(nilai)) {
      ctx.addIssue({ code: 'custom', message: 'Wajib diisi' });
      return z.NEVER;
    }
    const hasil = validasi(nilai, opsi);
    if (!hasil.ok) {
      ctx.addIssue({ code: 'custom', message: hasil.pesan });
      return z.NEVER;
    }
    return hasil.nilai;
  });
}

/** Seperti `angkaDesimal`, tetapi kosong/null/undefined → null. */
export function angkaDesimalOpsional(opsi: OpsiAngka) {
  return masukanOpsional.transform((nilai, ctx): string | null => {
    if (kosong(nilai)) return null;
    const hasil = validasi(nilai, opsi);
    if (!hasil.ok) {
      ctx.addIssue({ code: 'custom', message: hasil.pesan });
      return z.NEVER;
    }
    return hasil.nilai;
  });
}
