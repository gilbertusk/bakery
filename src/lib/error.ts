/** Error bisnis yang pesannya aman dan ramah untuk ditampilkan ke pengguna. */
export class PesanError extends Error {
  /** Field form yang ditandai; `aksi()` mengisinya ke `fieldErrors`. */
  readonly field?: string;

  constructor(message: string, opsi?: { field?: string }) {
    super(message);
    this.name = 'PesanError';
    this.field = opsi?.field;
  }
}
