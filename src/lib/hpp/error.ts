import { PesanError } from '@/lib/error';

/** Input hitung tidak valid. Pesannya aman ditampilkan ke pengguna. */
export class HitungError extends PesanError {
  constructor(message: string) {
    super(message);
    this.name = 'HitungError';
  }
}
