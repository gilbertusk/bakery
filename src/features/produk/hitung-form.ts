import { D, type Decimal } from '@/lib/angka';
import { keSatuanDasar } from '@/lib/hpp/konversi';
import { hitungMargin } from '@/lib/hpp/margin';
import { hitungHppProduk, type InputHppProduk, type RincianHpp } from '@/lib/hpp/produk';

type KomponenForm =
  | { jenis: 'adonan'; resepAdonanId: string; gramPerPcs: string }
  | {
      jenis: 'bahan';
      peran: 'topping' | 'filling' | 'kemasan' | 'lainnya';
      bahanId: string;
      takaran: string;
      konversiSatuanId: string | null;
    };

export type ResepPratinjauProduk = {
  id: string;
  nama: string;
  hasilGram: string;
  biayaPerGram: string;
};

export type BahanPratinjauProduk = {
  id: string;
  nama: string;
  satuanDasar: string;
  hargaPerSatuan: string;
  konversi: Array<{ id: string; namaSatuan: string; nilaiDasar: string }>;
};

type HasilPratinjau = {
  rincian: RincianHpp;
  marginRp: Decimal;
  marginPersen: Decimal | null;
  diBawahTarget: boolean;
};

function bacaDesimal(nilai: string): Decimal | null {
  try {
    return nilai.trim() === '' ? null : D(nilai.replace(',', '.'));
  } catch {
    return null;
  }
}

function positif(nilai: string): boolean {
  return bacaDesimal(nilai)?.gt(0) ?? false;
}

export function hitungPratinjauProduk(input: {
  hargaJual: string;
  targetMargin: string;
  resep: readonly ResepPratinjauProduk[];
  bahan: readonly BahanPratinjauProduk[];
  komponen: readonly KomponenForm[];
}): HasilPratinjau {
  const resepById = new Map(input.resep.map((item) => [item.id, item]));
  const bahanById = new Map(input.bahan.map((item) => [item.id, item]));
  const komponen: InputHppProduk['komponen'][number][] = [];
  for (const item of input.komponen) {
    if (item.jenis === 'adonan') {
      const resep = resepById.get(item.resepAdonanId);
      if (resep && positif(item.gramPerPcs)) {
        komponen.push({
          jenis: 'adonan' as const,
          resepId: resep.id,
          namaResep: resep.nama,
          gramPerPcs: item.gramPerPcs,
          biayaPerGram: resep.biayaPerGram,
          hasilGram: resep.hasilGram,
        });
      }
      continue;
    }

    const bahan = bahanById.get(item.bahanId);
    if (!bahan || !positif(item.takaran)) continue;
    const konversi = item.konversiSatuanId
      ? bahan.konversi.find((pilihan) => pilihan.id === item.konversiSatuanId)
      : null;
    if (item.konversiSatuanId && !konversi) continue;
    komponen.push({
      jenis: 'bahan' as const,
      peran: item.peran,
      bahanId: bahan.id,
      namaBahan: bahan.nama,
      takaranDasar: keSatuanDasar(item.takaran, konversi?.nilaiDasar ?? null),
      hargaPerSatuan: bahan.hargaPerSatuan,
    });
  }

  const rincian = hitungHppProduk({ komponen, biayaTambahan: [] });
  const hargaJual = positif(input.hargaJual) ? D(input.hargaJual) : D(0);
  const targetInput = bacaDesimal(input.targetMargin);
  const target = targetInput?.gte(0) ? targetInput : D('0.3');
  const { marginRp, marginPersen } = hitungMargin(rincian.hpp, hargaJual);
  return {
    rincian,
    marginRp,
    marginPersen,
    diBawahTarget: marginPersen === null || marginPersen.lt(target),
  };
}
