import type { Metadata } from 'next';
import { Suspense } from 'react';

import { FormLupa } from './form-lupa';

export const metadata: Metadata = { title: 'Lupa password' };

export default function HalamanLupaPassword() {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-muted-foreground text-center text-sm">
        Masukkan email Anda. Kami kirimkan link untuk mengatur ulang password.
      </p>
      <Suspense>
        <FormLupa />
      </Suspense>
    </section>
  );
}
