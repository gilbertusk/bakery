import { type ZodError, z } from 'zod';

const bawaan = z.locales.id().localeError;

/** Pesan error Zod berbahasa Indonesia, singkat untuk ditampilkan di bawah field form. */
const errorIndonesia: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.input === undefined || issue.input === null) return 'Wajib diisi';
      if (issue.expected === 'number') return 'Harus berupa angka';
      if (issue.expected === 'int') return 'Harus bilangan bulat';
      break;
    case 'too_small': {
      const min = Number(issue.minimum);
      if (issue.origin === 'string') {
        return min <= 1 ? 'Wajib diisi' : `Minimal ${min} karakter`;
      }
      if (issue.origin === 'array' || issue.origin === 'set') return `Pilih minimal ${min}`;
      if (issue.origin === 'number' || issue.origin === 'bigint') {
        if (!issue.inclusive) return `Harus lebih dari ${min}`;
        return `Minimal ${min}`;
      }
      break;
    }
    case 'too_big': {
      const max = Number(issue.maximum);
      if (issue.origin === 'string') return `Maksimal ${max} karakter`;
      if (issue.origin === 'array' || issue.origin === 'set') return `Maksimal ${max} item`;
      if (issue.origin === 'number' || issue.origin === 'bigint') {
        if (!issue.inclusive) return `Harus kurang dari ${max}`;
        return `Maksimal ${max}`;
      }
      break;
    }
    case 'invalid_format':
      if (issue.format === 'email') return 'Format email tidak valid';
      return 'Format tidak valid';
    case 'invalid_value':
      return 'Pilihan tidak valid';
  }
  return bawaan(issue);
};

z.config({ localeError: errorIndonesia });

export function pesanPertama(error: ZodError): string {
  return error.issues[0]?.message ?? 'Input tidak valid';
}

export { z };
