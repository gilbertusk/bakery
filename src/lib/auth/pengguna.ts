import 'server-only';

import { eq } from 'drizzle-orm';
import { cache } from 'react';

import { db } from '@/db/client';
import { type Peran, pengguna } from '@/db/schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type PenggunaAktif = {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
};

export const getPengguna = cache(async (): Promise<PenggunaAktif | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const [row] = await db
    .select({
      id: pengguna.id,
      nama: pengguna.nama,
      email: pengguna.email,
      peran: pengguna.peran,
      aktif: pengguna.aktif,
    })
    .from(pengguna)
    .where(eq(pengguna.id, user.id))
    .limit(1);

  if (!row || !row.aktif) return null;

  return { id: row.id, nama: row.nama, email: row.email, peran: row.peran };
});
