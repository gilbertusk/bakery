/** Filter status aktif data master (supplier, bahan, …) dari `?status=` di URL. */
export type StatusFilter = 'aktif' | 'nonaktif' | 'semua';

/** Nilai tidak dikenal kembali ke default `aktif`. */
export function bacaStatus(nilai: string | string[] | undefined): StatusFilter {
  return nilai === 'nonaktif' || nilai === 'semua' ? nilai : 'aktif';
}

export function aktifDariStatus(status: StatusFilter): boolean | undefined {
  if (status === 'semua') return undefined;
  return status === 'aktif';
}
