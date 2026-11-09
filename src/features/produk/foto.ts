export function ukuranFotoTerkompresi(
  lebar: number,
  tinggi: number,
  sisiMaksimal = 1024,
): { lebar: number; tinggi: number } {
  const rasio = Math.min(1, sisiMaksimal / Math.max(lebar, tinggi));
  return {
    lebar: Math.round(lebar * rasio),
    tinggi: Math.round(tinggi * rasio),
  };
}

/** Kompres foto di browser menjadi WebP dengan sisi terpanjang maksimal 1024 px. */
export async function kompresFotoProduk(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const ukuran = ukuranFotoTerkompresi(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = ukuran.lebar;
    canvas.height = ukuran.tinggi;
    const konteks = canvas.getContext('2d');
    if (!konteks) throw new Error('Browser tidak mendukung kompresi gambar');
    konteks.drawImage(bitmap, 0, 0, ukuran.lebar, ukuran.tinggi);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (hasil) => (hasil ? resolve(hasil) : reject(new Error('Gagal mengompres gambar'))),
        'image/webp',
        0.82,
      );
    });
    const namaDasar = file.name.replace(/\.[^.]+$/, '') || 'foto-produk';
    return new File([blob], `${namaDasar}.webp`, { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}
