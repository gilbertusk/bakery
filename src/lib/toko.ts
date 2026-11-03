import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { pengaturanToko } from '@/db/schema';

export const NAMA_TOKO_DEFAULT = 'Toko Kue Khansa';

export async function getIdentitasToko(): Promise<{ namaToko: string; logoUrl: string | null }> {
  try {
    const [row] = await db
      .select({ namaToko: pengaturanToko.namaToko, logoUrl: pengaturanToko.logoUrl })
      .from(pengaturanToko)
      .where(eq(pengaturanToko.id, 1))
      .limit(1);
    return row ?? { namaToko: NAMA_TOKO_DEFAULT, logoUrl: null };
  } catch {
    return { namaToko: NAMA_TOKO_DEFAULT, logoUrl: null };
  }
}
