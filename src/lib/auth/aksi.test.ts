import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseServerClient } from '@/lib/supabase/server';

import { keluar, kirimLinkReset, masuk, setelPasswordBaru } from './aksi';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

const auth = {
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth } as never);
});

function setHeaders(nilai: Record<string, string>) {
  vi.mocked(headers).mockResolvedValue(new Headers(nilai) as never);
}

describe('masuk', () => {
  it('input tidak valid memberi pesan umum tanpa memanggil Supabase', async () => {
    await expect(masuk({ email: 'x', password: '' })).resolves.toEqual({
      ok: false,
      error: 'Email atau password salah',
    });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('login gagal memakai pesan ramah', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { status: 429 } });
    await expect(masuk({ email: 'a@b.co', password: 'rahasia' })).resolves.toEqual({
      ok: false,
      error: 'Terlalu banyak percobaan, coba lagi beberapa menit',
    });
  });

  it('login berhasil diarahkan ke tujuan aman', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      masuk({ email: 'a@b.co', password: 'rahasia', next: '//jahat.com' }),
    ).rejects.toThrow('REDIRECT:/dashboard');
    await expect(masuk({ email: 'a@b.co', password: 'rahasia', next: '/kasir' })).rejects.toThrow(
      'REDIRECT:/kasir',
    );
  });
});

describe('keluar', () => {
  it('sign out lalu ke halaman login', async () => {
    await expect(keluar()).rejects.toThrow('REDIRECT:/login');
    expect(auth.signOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});

describe('kirimLinkReset', () => {
  it('email tidak valid ditolak', async () => {
    await expect(kirimLinkReset({ email: 'bukan' })).resolves.toEqual({
      ok: false,
      error: 'Format email tidak valid',
    });
  });

  it('memakai header origin untuk redirect dan pesan yang sama untuk semua email', async () => {
    setHeaders({ origin: 'https://toko.test' });
    auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 400 } });

    const hasil = await kirimLinkReset({ email: 'a@b.co' });

    expect(hasil).toMatchObject({ ok: true });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.co', {
      redirectTo: 'https://toko.test/login/konfirmasi?next=/login/reset',
    });
  });

  it('tanpa origin memakai host dan proto forwarded', async () => {
    setHeaders({ 'x-forwarded-host': 'app.test', 'x-forwarded-proto': 'http' });
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await kirimLinkReset({ email: 'a@b.co' });
    expect(auth.resetPasswordForEmail.mock.calls[0]?.[1]).toEqual({
      redirectTo: 'http://app.test/login/konfirmasi?next=/login/reset',
    });

    setHeaders({ host: 'lokal.test' });
    await kirimLinkReset({ email: 'a@b.co' });
    expect(auth.resetPasswordForEmail.mock.calls[1]?.[1]).toEqual({
      redirectTo: 'https://lokal.test/login/konfirmasi?next=/login/reset',
    });
  });

  it('rate limit diberi tahu', async () => {
    setHeaders({ origin: 'https://toko.test' });
    auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 429 } });
    await expect(kirimLinkReset({ email: 'a@b.co' })).resolves.toMatchObject({ ok: false });
  });
});

describe('setelPasswordBaru', () => {
  const valid = { password: 'rahasia123', konfirmasi: 'rahasia123' };

  it('validasi memakai pesan pertama', async () => {
    await expect(setelPasswordBaru({ password: 'pendek', konfirmasi: 'pendek' })).resolves.toEqual({
      ok: false,
      error: 'Password minimal 8 karakter',
    });
    await expect(
      setelPasswordBaru({ password: 'rahasia123', konfirmasi: 'beda12345' }),
    ).resolves.toEqual({ ok: false, error: 'Konfirmasi password tidak sama' });
  });

  it('sesi reset kedaluwarsa', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null } });
    await expect(setelPasswordBaru(valid)).resolves.toEqual({
      ok: false,
      error: 'Link reset sudah kedaluwarsa, minta link baru',
    });
  });

  it('gagal update password', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
    auth.updateUser.mockResolvedValue({ error: { message: 'x' } });
    await expect(setelPasswordBaru(valid)).resolves.toEqual({
      ok: false,
      error: 'Gagal menyimpan password baru, coba lagi',
    });
  });

  it('berhasil diarahkan ke dashboard', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
    auth.updateUser.mockResolvedValue({ error: null });
    await expect(setelPasswordBaru(valid)).rejects.toThrow('REDIRECT:/dashboard');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'rahasia123' });
  });
});
