export const PESAN_LOGIN_GAGAL = 'Email atau password salah';
export const PESAN_TERLALU_BANYAK = 'Terlalu banyak percobaan, coba lagi beberapa menit';

type AuthErrorLike = { status?: number; code?: string } | null | undefined;

export function pesanErrorLogin(error: AuthErrorLike): string {
  if (error?.status === 429 || error?.code === 'over_request_rate_limit') {
    return PESAN_TERLALU_BANYAK;
  }
  return PESAN_LOGIN_GAGAL;
}
