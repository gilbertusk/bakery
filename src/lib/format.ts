import { TZDate } from '@date-fns/tz';
import { addDays, format } from 'date-fns';

import { D, type NilaiAngka, bulatRupiah } from './angka';

export const ZONA_WIB = 'Asia/Jakarta';

const POLA_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "1234567.5" → "1.234.567,5"; input sudah berupa string desimal biasa. */
function kelompokkan(teks: string): string {
  const negatif = teks.startsWith('-');
  const [bulat = '0', pecahan] = (negatif ? teks.slice(1) : teks).split('.');
  const bulatId = bulat.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negatif ? '-' : ''}${bulatId}${pecahan ? `,${pecahan}` : ''}`;
}

/** 15000 → "Rp15.000"; -15000 → "-Rp15.000". Dibulatkan ke rupiah penuh. */
export function formatRupiah(nilai: NilaiAngka): string {
  const rupiah = bulatRupiah(nilai);
  return `${rupiah < 0 ? '-' : ''}Rp${kelompokkan(String(Math.abs(rupiah)))}`;
}

/** "13.5" → "Rp13,50". Untuk harga per gram dan HPP. */
export function formatRupiahDesimal(nilai: NilaiAngka, desimal = 2): string {
  const d = D(nilai).toDecimalPlaces(desimal);
  return `${d.lt(0) ? '-' : ''}Rp${kelompokkan(d.abs().toFixed(desimal))}`;
}

/** "1200.500" → "1.200,5". Nol di belakang koma dibuang. */
export function formatAngka(nilai: NilaiAngka, maksDesimal = 4): string {
  const d = D(nilai).toDecimalPlaces(maksDesimal);
  return kelompokkan(d.isZero() ? '0' : d.toFixed());
}

/** ("36", "g") → "36 g". */
export function formatTakaran(nilai: NilaiAngka, satuan: string): string {
  return `${formatAngka(nilai)} ${satuan}`;
}

/** ("13.5000", "g") → "Rp13,5/g". Harga bahan per satuan dasar, maks 4 desimal. */
export function formatHargaSatuan(nilai: NilaiAngka, satuan: string): string {
  return `Rp${formatAngka(nilai, 4)}/${satuan}`;
}

/** 15000 → "15.000"; null → "". Untuk nilai di dalam input rupiah. */
export function formatRibuan(nilai: number | null): string {
  return nilai === null ? '' : kelompokkan(String(nilai));
}

/** Ketikan di input rupiah: ambil digit saja (maks 15 digit agar tetap aman). Tanpa digit = null. */
export function parseKetikanRupiah(teks: string): number | null {
  const digit = teks.replace(/\D/g, '').slice(0, 15);
  return digit ? Number(digit) : null;
}

/**
 * Parse input rupiah dari pengguna. Menerima "15000", "15.000", "Rp 15.000", "15.000,00".
 * Mengembalikan null bila tidak valid (termasuk negatif dan sen bukan nol).
 */
export function parseRupiah(input: string): number | null {
  const teks = input.trim().replace(/^rp\.?\s*/i, '');
  const valid = /^(\d{1,3}(\.\d{3})+|\d+)(,0{1,2})?$/.test(teks);
  if (!valid) return null;
  const angka = Number(teks.replace(/,0+$/, '').replaceAll('.', ''));
  return Number.isSafeInteger(angka) ? angka : null;
}

function keDate(waktu: Date | string): Date {
  if (waktu instanceof Date) return waktu;
  // Nilai kolom `date` ("YYYY-MM-DD") dianggap tanggal WIB.
  return POLA_TANGGAL.test(waktu) ? new Date(`${waktu}T00:00:00+07:00`) : new Date(waktu);
}

const formatterTanggal = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: ZONA_WIB,
});

const formatterJam = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONA_WIB,
});

/** "3 Nov 2026" (WIB). */
export function formatTanggal(waktu: Date | string): string {
  return formatterTanggal.format(keDate(waktu));
}

/** "3 Nov 2026 14.05" (WIB). */
export function formatWaktu(waktu: Date | string): string {
  const date = keDate(waktu);
  return `${formatterTanggal.format(date)} ${formatterJam.format(date)}`;
}

/** Tanggal WIB "YYYY-MM-DD" dari sebuah waktu. */
export function tanggalWib(waktu: Date): string {
  return format(new TZDate(waktu, ZONA_WIB), 'yyyy-MM-dd');
}

/** Tanggal hari ini di WIB, "YYYY-MM-DD". */
export function hariIniWib(sekarang: Date = new Date()): string {
  return tanggalWib(sekarang);
}

/** Batas satu hari WIB dalam UTC: `mulai` inklusif, `selesai` eksklusif. */
export function rentangHariWib(tanggal: string): { mulai: Date; selesai: Date } {
  const cocok = POLA_TANGGAL.exec(tanggal);
  if (!cocok) throw new Error(`Format tanggal harus YYYY-MM-DD: ${tanggal}`);
  const [tahun, bulan, hari] = cocok.slice(1).map(Number) as [number, number, number];

  const cek = new Date(Date.UTC(tahun, bulan - 1, hari));
  if (
    cek.getUTCFullYear() !== tahun ||
    cek.getUTCMonth() !== bulan - 1 ||
    cek.getUTCDate() !== hari
  ) {
    throw new Error(`Tanggal tidak valid: ${tanggal}`);
  }

  const mulai = new TZDate(tahun, bulan - 1, hari, ZONA_WIB);
  return { mulai: new Date(mulai.getTime()), selesai: new Date(addDays(mulai, 1).getTime()) };
}
