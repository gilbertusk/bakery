import { describe, expect, it } from 'vitest';

import { validateClientEnv, validateServerEnv } from './env-schema';

const serverEnv = {
  DATABASE_URL: 'postgresql://postgres:rahasia@localhost:6543/postgres',
  DATABASE_URL_DIRECT: 'postgresql://postgres:rahasia@localhost:5432/postgres',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://contoh.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
};

describe('validateServerEnv', () => {
  it('menggunakan zona waktu Jakarta sebagai nilai awal', () => {
    expect(validateServerEnv(serverEnv).APP_TIMEZONE).toBe('Asia/Jakarta');
  });

  it('menyebut nama variabel yang salah tanpa membocorkan nilainya', () => {
    const invalidValue = 'nilai-rahasia-yang-tidak-valid';

    expect(() => validateServerEnv({ ...serverEnv, DATABASE_URL: invalidValue })).toThrow(
      'DATABASE_URL',
    );
    expect(() => validateServerEnv({ ...serverEnv, DATABASE_URL: invalidValue })).not.toThrow(
      invalidValue,
    );
  });

  it('menolak port runtime selain 6543', () => {
    expect(() =>
      validateServerEnv({
        ...serverEnv,
        DATABASE_URL: 'postgresql://postgres:rahasia@localhost:5432/postgres',
      }),
    ).toThrow('DATABASE_URL');
  });
});

describe('validateClientEnv', () => {
  it('menerima URL dan anon key Supabase yang valid', () => {
    expect(validateClientEnv(clientEnv)).toEqual(clientEnv);
  });

  it('menolak URL Supabase yang tidak valid', () => {
    expect(() =>
      validateClientEnv({ ...clientEnv, NEXT_PUBLIC_SUPABASE_URL: 'bukan-url' }),
    ).toThrow('NEXT_PUBLIC_SUPABASE_URL');
  });
});
