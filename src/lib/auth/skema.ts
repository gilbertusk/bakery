import { z } from 'zod';

export const masukSchema = z.object({
  email: z.email('Format email tidak valid').trim(),
  password: z.string().min(1, 'Password wajib diisi'),
  next: z.string().optional(),
});

export const lupaPasswordSchema = z.object({
  email: z.email('Format email tidak valid').trim(),
});

export const passwordBaruSchema = z
  .object({
    password: z.string().min(8, 'Password minimal 8 karakter'),
    konfirmasi: z.string(),
  })
  .refine((data) => data.password === data.konfirmasi, {
    message: 'Konfirmasi password tidak sama',
    path: ['konfirmasi'],
  });

export type MasukInput = z.infer<typeof masukSchema>;
export type LupaPasswordInput = z.infer<typeof lupaPasswordSchema>;
export type PasswordBaruInput = z.infer<typeof passwordBaruSchema>;
