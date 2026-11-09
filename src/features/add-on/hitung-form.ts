import { D, type Decimal } from '@/lib/angka';
import { keSatuanDasar } from '@/lib/hpp/konversi';
import { hitungMargin } from '@/lib/hpp/margin';

export type BahanPratinjauAddOn = {
  id: string;
  hargaPerSatuan: string;
  konversi: Array<{ id: string; nilaiDasar: string }>;
};

export type PratinjauAddOn = {
  hpp: Decimal;
  marginRp: Decimal;
  marginPersen: Decimal | null;
  diBawahTarget: boolean;
};

function bacaDesimal(nilai: string): Decimal | null {
  try {
    return nilai.trim() === '' ? null : D(nilai.trim().replace(',', '.'));
  } catch {
    return null;
  }
}

/** Pratinjau form: null selama bahan/takaran belum lengkap. Harga kosong dianggap 0. */
export function hitungPratinjauAddOn(input: {
  bahan: BahanPratinjauAddOn | undefined;
  takaran: string;
  konversiSatuanId: string | null;
  harga: number | null;
  targetMargin: string;
}): PratinjauAddOn | null {
  const takaran = bacaDesimal(input.takaran);
  if (!input.bahan || !takaran?.gt(0)) return null;
  const konversi = input.konversiSatuanId
    ? input.bahan.konversi.find((k) => k.id === input.konversiSatuanId)
    : null;
  if (input.konversiSatuanId && !konversi) return null;

  const hpp = keSatuanDasar(takaran, konversi?.nilaiDasar ?? null).times(
    input.bahan.hargaPerSatuan,
  );
  const { marginRp, marginPersen } = hitungMargin(hpp, input.harga ?? 0);
  return {
    hpp,
    marginRp,
    marginPersen,
    diBawahTarget: marginPersen === null || marginPersen.lt(D(input.targetMargin)),
  };
}
