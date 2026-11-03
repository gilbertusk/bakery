/** Error bisnis yang pesannya aman dan ramah untuk ditampilkan ke pengguna. */
export class PesanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PesanError';
  }
}
