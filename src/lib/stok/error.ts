import { PesanError } from '@/lib/error';
import { formatAngka } from '@/lib/format';

export class StokTidakCukupError extends PesanError {
  readonly nama: string;
  readonly stok: string;
  readonly diminta: string;

  constructor({ nama, stok, diminta }: { nama: string; stok: string; diminta: string }) {
    super(
      `Stok ${nama} tidak cukup (tersisa ${formatAngka(stok)}, diminta ${formatAngka(diminta)})`,
    );
    this.name = 'StokTidakCukupError';
    this.nama = nama;
    this.stok = stok;
    this.diminta = diminta;
  }
}
