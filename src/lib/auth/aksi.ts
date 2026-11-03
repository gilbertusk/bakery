'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { tujuanSetelahLogin } from '@/lib/auth/next-path';
import { pesanErrorLogin } from '@/lib/auth/pesan-error';
import { lupaPasswordSchema, masukSchema, passwordBaruSchema } from '@/lib/auth/skema';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type HasilAksiAuth = { ok: true; pesan?: string } | { ok: false; error: string };

export async function masuk(input: unknown): Promise<HasilAksiAuth> {
  const parsed = masukSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Email atau password salah' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: pesanErrorLogin(error) };

  redirect(tujuanSetelahLogin(parsed.data.next));
}

export async function keluar(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

async function originPermintaan() {
  const h = await headers();
  const origin = h.get('origin');
  if (origin) return origin;
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function kirimLinkReset(input: unknown): Promise<HasilAksiAuth> {
  const parsed = lupaPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Format email tidak valid' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await originPermintaan()}/login/konfirmasi?next=/login/reset`,
  });
  if (error?.status === 429) return { ok: false, error: pesanErrorLogin(error) };

  // Pesan sama untuk email terdaftar maupun tidak.
  return {
    ok: true,
    pesan: 'Jika email terdaftar, link untuk mengatur ulang password sudah dikirim.',
  };
}

export async function setelPasswordBaru(input: unknown): Promise<HasilAksiAuth> {
  const parsed = passwordBaruSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Link reset sudah kedaluwarsa, minta link baru' };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: 'Gagal menyimpan password baru, coba lagi' };

  redirect('/dashboard');
}
