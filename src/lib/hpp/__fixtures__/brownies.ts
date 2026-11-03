import type { KonteksHpp } from '../simulasi';

// Data contoh Brownies dari src/db/seed/contoh.ts. Bolu Vanila dan Lapis hanya untuk test.
export const BAHAN = {
  tepung: { id: 'tepung', nama: 'Tepung Terigu', hargaPerSatuan: '15' },
  gula: { id: 'gula', nama: 'Gula Pasir', hargaPerSatuan: '18' },
  telur: { id: 'telur', nama: 'Telur', hargaPerSatuan: '30' },
  mentega: { id: 'mentega', nama: 'Mentega', hargaPerSatuan: '45' },
  coklatBatang: { id: 'coklat-batang', nama: 'Coklat Batang', hargaPerSatuan: '120' },
  coklatBubuk: { id: 'coklat-bubuk', nama: 'Coklat Bubuk', hargaPerSatuan: '90' },
  keju: { id: 'keju', nama: 'Keju Parut', hargaPerSatuan: '110' },
  kemasanCup: { id: 'kemasan-cup', nama: 'Kemasan Cup Plastik', hargaPerSatuan: '500' },
} as const;

/** Total Rp50.550, hasil 1.200 g → Rp42,125/g. */
export const RESEP_BROWNIES = {
  id: 'brownies',
  nama: 'Brownies Panggang',
  hasilGram: '1200',
  items: [
    { bahanId: BAHAN.tepung.id, takaranDasar: '250' },
    { bahanId: BAHAN.gula.id, takaranDasar: '300' },
    { bahanId: BAHAN.telur.id, takaranDasar: '220' },
    { bahanId: BAHAN.mentega.id, takaranDasar: '200' },
    { bahanId: BAHAN.coklatBatang.id, takaranDasar: '150' },
    { bahanId: BAHAN.coklatBubuk.id, takaranDasar: '50' },
    { bahanId: BAHAN.keju.id, takaranDasar: '30' },
  ],
};

export const BIAYA_PER_GRAM_BROWNIES = '42.125';

/** Total Rp17.250, hasil 1.000 g → Rp17,25/g. Tanpa coklat. */
export const RESEP_BOLU = {
  id: 'bolu',
  nama: 'Bolu Vanila',
  hasilGram: '1000',
  items: [
    { bahanId: BAHAN.tepung.id, takaranDasar: '300' },
    { bahanId: BAHAN.gula.id, takaranDasar: '250' },
    { bahanId: BAHAN.telur.id, takaranDasar: '200' },
    { bahanId: BAHAN.mentega.id, takaranDasar: '50' },
  ],
};

export const KONTEKS_BROWNIES: KonteksHpp = {
  bahan: Object.values(BAHAN),
  resep: [RESEP_BROWNIES, RESEP_BOLU],
  produk: [
    {
      id: 'cup',
      nama: 'Brownies Cup 50 g',
      hargaJual: 5000,
      targetMargin: '0.3',
      komponen: [
        { jenis: 'adonan', resepId: RESEP_BROWNIES.id, gramPerPcs: '50' },
        { jenis: 'bahan', peran: 'kemasan', bahanId: BAHAN.kemasanCup.id, takaranDasar: '1' },
      ],
      biayaTambahan: [],
    },
    {
      id: 'loyang',
      nama: 'Brownies Loyang 20×20',
      hargaJual: 120_000,
      targetMargin: '0.3',
      komponen: [
        { jenis: 'adonan', resepId: RESEP_BROWNIES.id, gramPerPcs: '1000' },
        { jenis: 'bahan', peran: 'topping', bahanId: BAHAN.keju.id, takaranDasar: '100' },
      ],
      biayaTambahan: [],
    },
    {
      id: 'bites',
      nama: 'Brownies Bites 25 g',
      hargaJual: 3000,
      targetMargin: '0.3',
      komponen: [{ jenis: 'adonan', resepId: RESEP_BROWNIES.id, gramPerPcs: '25' }],
      biayaTambahan: [],
    },
    {
      id: 'bolu-potong',
      nama: 'Bolu Potong',
      hargaJual: 3000,
      targetMargin: '0.3',
      komponen: [{ jenis: 'adonan', resepId: RESEP_BOLU.id, gramPerPcs: '80' }],
      biayaTambahan: [],
    },
  ],
};
