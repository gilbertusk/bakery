import type { SatuanDasar } from '@/db/schema/enums';
import { D, type Decimal } from '@/lib/angka';
import { formatHargaSatuan } from '@/lib/format';
import { HitungError, type SatuanKemasan, hargaPerSatuanDasar, kemasanKeDasar } from '@/lib/hpp';
import { angkaDesimal } from '@/lib/skema-angka';

export type InputKemasan = {
  jumlahKemasan: string;
  satuanKemasan: SatuanKemasan;
  totalHarga: number;
};

/** Batas kolom `harga_per_satuan numeric(14,4)`. */
const BATAS_HARGA = D(10).pow(10);

/** F-BHN-02: total harga kemasan → harga per satuan dasar, dibulatkan 4 desimal. */
export function hargaDariKemasan(input: InputKemasan, satuanDasar: SatuanDasar): Decimal {
  const qtyDasar = kemasanKeDasar(input.jumlahKemasan, input.satuanKemasan, satuanDasar);
  const harga = hargaPerSatuanDasar(input.totalHarga, qtyDasar).toDecimalPlaces(4);
  if (harga.gte(BATAS_HARGA)) throw new HitungError('Harga per satuan terlalu besar');
  return harga;
}

const jumlahSchema = angkaDesimal({ maksDesimal: 3, positif: true });

/** Teks pratinjau "Rp15/g" untuk form; null bila isian belum lengkap atau tidak valid. */
export function pratinjauHarga(
  input: { jumlahKemasan: string; satuanKemasan: SatuanKemasan; totalHarga: number | null },
  satuanDasar: SatuanDasar,
): string | null {
  if (input.totalHarga === null) return null;
  const jumlah = jumlahSchema.safeParse(input.jumlahKemasan);
  if (!jumlah.success) return null;
  try {
    const harga = hargaDariKemasan(
      { ...input, jumlahKemasan: jumlah.data, totalHarga: input.totalHarga },
      satuanDasar,
    );
    return formatHargaSatuan(harga, satuanDasar);
  } catch {
    return null;
  }
}
