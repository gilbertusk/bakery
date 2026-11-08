const POLA_KARAKTER_TELEPON = /^[\d\s\-.()+]+$/;
const POLA_HP_NORMAL = /^628\d{7,11}$/;

export type HasilKontak = { ok: true; nilai: string | null } | { ok: false; error: string };

/** Hanya digit, atau null bila teks bukan berbentuk nomor telepon. */
function digitTelepon(teks: string): string | null {
  if (!POLA_KARAKTER_TELEPON.test(teks)) return null;
  return teks.replace(/\D/g, '');
}

function isAwalanHp(digit: string): boolean {
  return digit.startsWith('08') || digit.startsWith('628');
}

function keFormat62(digit: string): string {
  return digit.startsWith('0') ? `62${digit.slice(1)}` : digit;
}

/**
 * Rapikan kontak supplier/pelanggan. Nomor HP Indonesia (08…, +62 8…) dinormalisasi ke `628…`;
 * kontak lain (email, telepon rumah, teks) disimpan apa adanya. Kosong → null.
 */
export function normalisasiKontak(input: string): HasilKontak {
  const teks = input.trim();
  if (teks === '') return { ok: true, nilai: null };

  const digit = digitTelepon(teks);
  if (digit === null || !isAwalanHp(digit)) return { ok: true, nilai: teks };

  const nomor = keFormat62(digit);
  if (!POLA_HP_NORMAL.test(nomor)) return { ok: false, error: 'Nomor HP tidak valid' };
  return { ok: true, nilai: nomor };
}

/** Nomor `628…` untuk WhatsApp bila kontak berupa nomor HP yang valid, selain itu null. */
export function nomorWhatsApp(kontak: string | null): string | null {
  if (!kontak) return null;
  const hasil = normalisasiKontak(kontak);
  return hasil.ok && hasil.nilai !== null && POLA_HP_NORMAL.test(hasil.nilai) ? hasil.nilai : null;
}

export function linkWhatsApp(kontak: string | null): string | null {
  const nomor = nomorWhatsApp(kontak);
  return nomor ? `https://wa.me/${nomor}` : null;
}
