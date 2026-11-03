export type KonversiUmum = {
  kataKunci: string[];
  satuan: string;
  nilaiDasar: string;
  satuanDasar: 'g' | 'ml';
};

// Perkiraan. Wajib dicek dengan timbangan di dapur Khansa (keputusan K3).
export const KONVERSI_UMUM: KonversiUmum[] = [
  { kataKunci: ['tepung terigu', 'terigu'], satuan: 'sdm', nilaiDasar: '8', satuanDasar: 'g' },
  {
    kataKunci: ['tepung terigu', 'terigu'],
    satuan: 'cup',
    nilaiDasar: '125',
    satuanDasar: 'g',
  },
  { kataKunci: ['gula pasir'], satuan: 'sdm', nilaiDasar: '12.5', satuanDasar: 'g' },
  { kataKunci: ['gula pasir'], satuan: 'cup', nilaiDasar: '200', satuanDasar: 'g' },
  { kataKunci: ['gula halus'], satuan: 'sdm', nilaiDasar: '8', satuanDasar: 'g' },
  { kataKunci: ['gula halus'], satuan: 'cup', nilaiDasar: '120', satuanDasar: 'g' },
  {
    kataKunci: ['mentega', 'margarin'],
    satuan: 'sdm',
    nilaiDasar: '14',
    satuanDasar: 'g',
  },
  { kataKunci: ['minyak'], satuan: 'sdm', nilaiDasar: '13', satuanDasar: 'g' },
  { kataKunci: ['susu cair'], satuan: 'sdm', nilaiDasar: '15', satuanDasar: 'ml' },
  { kataKunci: ['susu cair'], satuan: 'cup', nilaiDasar: '240', satuanDasar: 'ml' },
  { kataKunci: ['coklat bubuk', 'kakao bubuk'], satuan: 'sdm', nilaiDasar: '7', satuanDasar: 'g' },
  { kataKunci: ['maizena'], satuan: 'sdm', nilaiDasar: '8', satuanDasar: 'g' },
  {
    kataKunci: ['baking powder', 'soda kue'],
    satuan: 'sdt',
    nilaiDasar: '4',
    satuanDasar: 'g',
  },
  { kataKunci: ['garam'], satuan: 'sdt', nilaiDasar: '6', satuanDasar: 'g' },
  { kataKunci: ['vanili bubuk', 'vanila bubuk'], satuan: 'sdt', nilaiDasar: '3', satuanDasar: 'g' },
  { kataKunci: ['telur'], satuan: 'butir', nilaiDasar: '55', satuanDasar: 'g' },
  { kataKunci: ['telur', 'kuning telur'], satuan: 'kuning', nilaiDasar: '18', satuanDasar: 'g' },
  { kataKunci: ['telur', 'putih telur'], satuan: 'putih', nilaiDasar: '33', satuanDasar: 'g' },
];
