import { describe, expect, it } from 'vitest';

import { PESAN_LOGIN_GAGAL, PESAN_TERLALU_BANYAK, pesanErrorLogin } from './pesan-error';

describe('pesanErrorLogin', () => {
  it('tidak membedakan email tidak terdaftar dan password salah', () => {
    expect(pesanErrorLogin({ status: 400, code: 'invalid_credentials' })).toBe(PESAN_LOGIN_GAGAL);
    expect(pesanErrorLogin({ status: 400, code: 'user_not_found' })).toBe(PESAN_LOGIN_GAGAL);
    expect(pesanErrorLogin(null)).toBe(PESAN_LOGIN_GAGAL);
  });

  it('memberi pesan khusus untuk rate limit', () => {
    expect(pesanErrorLogin({ status: 429 })).toBe(PESAN_TERLALU_BANYAK);
    expect(pesanErrorLogin({ code: 'over_request_rate_limit' })).toBe(PESAN_TERLALU_BANYAK);
  });
});
