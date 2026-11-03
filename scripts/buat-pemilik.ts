import { createInterface } from 'node:readline/promises';

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { pengguna } from '../src/db/schema';
import { createSeedClient } from './seed-client';

config({ path: '.env.local' });

const inputSchema = z.object({
  email: z.email('Format email tidak valid'),
  nama: z.string().trim().min(1, 'Nama wajib diisi'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

function tanyaTersembunyi(pertanyaan: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error('Password harus diisi dari terminal interaktif'));
      return;
    }

    process.stdout.write(pertanyaan);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let nilai = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(nilai);
          return;
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          nilai = nilai.slice(0, -1);
        } else {
          nilai += ch;
        }
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.local',
    );
  }

  const { database, sql } = createSeedClient();
  try {
    const [pemilik] = await database
      .select({ id: pengguna.id })
      .from(pengguna)
      .where(eq(pengguna.peran, 'pemilik'))
      .limit(1);
    if (pemilik) throw new Error('Pemilik sudah ada. Tambah pengguna lain lewat menu Pengaturan.');

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const email = (await rl.question('Email pemilik: ')).trim();
    const nama = (await rl.question('Nama pemilik: ')).trim();
    rl.close();
    const password = await tanyaTersembunyi('Password (min. 8 karakter): ');
    const ulang = await tanyaTersembunyi('Ulangi password: ');
    if (password !== ulang) throw new Error('Password tidak sama');

    const data = inputSchema.parse({ email, nama, password });

    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: hasil, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nama: data.nama },
    });
    if (error) throw new Error(`Gagal membuat user: ${error.message}`);

    const [baris] = await database
      .select({ peran: pengguna.peran })
      .from(pengguna)
      .where(eq(pengguna.id, hasil.user.id))
      .limit(1);
    if (baris?.peran !== 'pemilik') {
      throw new Error('User dibuat, tetapi trigger tidak menjadikannya pemilik. Cek migrasi 0004.');
    }

    process.stdout.write(`Pemilik ${data.nama} <${data.email}> berhasil dibuat.\n`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  const pesan =
    error instanceof z.ZodError
      ? error.issues.map((i) => i.message).join(', ')
      : error instanceof Error
        ? error.message
        : String(error);
  process.stderr.write(`${pesan}\n`);
  process.exit(1);
});
