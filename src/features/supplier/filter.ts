export type StatusFilter = 'aktif' | 'nonaktif' | 'semua';

/** Baca `?status=` dari URL; nilai tidak dikenal kembali ke default `aktif`. */
export function bacaStatus(nilai: string | string[] | undefined): StatusFilter {
  return nilai === 'nonaktif' || nilai === 'semua' ? nilai : 'aktif';
}

export function aktifDariStatus(status: StatusFilter): boolean | undefined {
  if (status === 'semua') return undefined;
  return status === 'aktif';
}
