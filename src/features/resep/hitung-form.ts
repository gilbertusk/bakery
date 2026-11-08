import type { ModeHasil, SatuanDasar } from '@/db/schema';
import { D, type Decimal } from '@/lib/angka';
import { biayaAdonan, hasilOtomatis, keSatuanDasar } from '@/lib/hpp';

export type ItemFormHitung = {
  namaBahan: string;
  satuanDasar: SatuanDasar;
  takaran: string;
  nilaiKonversi: string | null;
  hargaPerSatuan: string;
};

export type HasilItemForm = { takaranDasar: Decimal; biaya: Decimal };

/** Kalkulasi toleran untuk pratinjau form; baris belum lengkap menghasilkan `null`, bukan error. */
export function hitungRingkasanForm(input: {
  modeHasil: ModeHasil;
  hasilGram: string | null;
  items: ItemFormHitung[];
}): {
  items: (HasilItemForm | null)[];
  hasilGram: Decimal | null;
  biayaTotal: Decimal;
  biayaPerGram: Decimal | null;
  peringatan: string[];
} {
  const items = input.items.map((item): HasilItemForm | null => {
    try {
      if (!item.takaran.trim() || !D(item.takaran.replace(',', '.')).gt(0)) return null;
      const takaranDasar = keSatuanDasar(item.takaran.replace(',', '.'), item.nilaiKonversi);
      const harga = D(item.hargaPerSatuan);
      if (harga.lt(0)) return null;
      return { takaranDasar, biaya: takaranDasar.times(harga) };
    } catch {
      return null;
    }
  });

  const itemValid = items.flatMap((item, index) => {
    if (!item) return [];
    return [{ ...item, ...input.items[index]! }];
  });
  const otomatis = hasilOtomatis(itemValid);

  let hasilGram: Decimal | null = null;
  if (input.modeHasil === 'otomatis') {
    if (itemValid.length > 0 && otomatis.hasilGram.gt(0)) hasilGram = otomatis.hasilGram;
  } else {
    try {
      const hasil = input.hasilGram?.trim() ? D(input.hasilGram.replace(',', '.')) : null;
      if (hasil?.gt(0)) hasilGram = hasil;
    } catch {
      hasilGram = null;
    }
  }

  const biayaTotal = itemValid.reduce((total, item) => total.plus(item.biaya), D(0));
  const biayaPerGram = hasilGram
    ? biayaAdonan({
        items: itemValid.map((item) => ({
          takaranDasar: item.takaranDasar,
          hargaPerSatuan: item.hargaPerSatuan,
        })),
        hasilGram,
      }).biayaPerGram
    : null;

  return {
    items,
    hasilGram,
    biayaTotal,
    biayaPerGram,
    peringatan: otomatis.peringatan,
  };
}
