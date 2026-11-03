import Decimal from 'decimal.js';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export type NilaiAngka = string | number | Decimal;

/** Buat Decimal. Melempar error bila input bukan angka. */
export function D(nilai: NilaiAngka): Decimal {
  return nilai instanceof Decimal ? nilai : new Decimal(nilai);
}

/** String untuk kolom `numeric(p, skala)`, dibulatkan half up. */
export function keNumeric(nilai: NilaiAngka, skala: number): string {
  return D(nilai).toFixed(skala);
}

/** Rupiah integer, dibulatkan half up (menjauhi nol saat tepat ,5). */
export function bulatRupiah(nilai: NilaiAngka): number {
  return D(nilai).toDecimalPlaces(0).toNumber() + 0;
}

/** Bulatkan ke atas ke kelipatan tertentu, mis. saran harga ke kelipatan 500. */
export function bulatKeAtas(nilai: NilaiAngka, kelipatan: number): number {
  if (!(kelipatan > 0)) throw new Error('Kelipatan pembulatan harus lebih dari 0');
  return D(nilai).div(kelipatan).ceil().times(kelipatan).toNumber() + 0;
}

export function isNol(nilai: NilaiAngka): boolean {
  return D(nilai).isZero();
}

/** True hanya untuk nilai < 0 (bukan -0). */
export function isNegatif(nilai: NilaiAngka): boolean {
  return D(nilai).lt(0);
}

export function isPositif(nilai: NilaiAngka): boolean {
  return D(nilai).gt(0);
}

export function isBulat(nilai: NilaiAngka): boolean {
  return D(nilai).isInteger();
}

export function jumlah(daftar: readonly NilaiAngka[]): Decimal {
  return daftar.reduce<Decimal>((total, nilai) => total.plus(D(nilai)), new Decimal(0));
}
