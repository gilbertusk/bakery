import type { SatuanDasar } from '@/db/schema';
import { KONVERSI_UMUM } from '@/lib/hpp/konversi-umum';

export type SaranKonversi = { namaSatuan: string; nilaiDasar: string };

/** Saran awal berdasarkan nama/kategori bahan. Nilainya tetap perlu dicek dengan timbangan. */
export function saranKonversiUntuk(input: {
  nama: string;
  kategori: string;
  satuanDasar: SatuanDasar;
}): SaranKonversi[] {
  const nama = input.nama.toLowerCase();
  const kategori = input.kategori.toLowerCase();

  return KONVERSI_UMUM.filter(
    (saran) =>
      saran.satuanDasar === input.satuanDasar &&
      saran.kataKunci.some((kataKunci) => nama.includes(kataKunci) || kategori.includes(kataKunci)),
  ).map((saran) => ({ namaSatuan: saran.satuan, nilaiDasar: saran.nilaiDasar }));
}
