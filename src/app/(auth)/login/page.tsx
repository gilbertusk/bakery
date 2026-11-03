import type { Metadata } from 'next';
import { Suspense } from 'react';

import { FormMasuk } from './form-masuk';

export const metadata: Metadata = { title: 'Masuk' };

export default function HalamanLogin() {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-muted-foreground text-center text-sm">Masuk untuk melanjutkan</p>
      <Suspense>
        <FormMasuk />
      </Suspense>
    </section>
  );
}
