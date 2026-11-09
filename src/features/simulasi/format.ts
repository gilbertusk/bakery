/** Kalimat ringkasan sesuai PRD F-PRD-07. */
export function ringkasanSimulasi(jumlahProduk: number, jumlahDiBawahTarget: number): string {
  return `${jumlahProduk} produk terdampak, ${jumlahDiBawahTarget} jadi di bawah target margin`;
}
