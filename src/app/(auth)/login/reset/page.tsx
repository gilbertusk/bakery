import type { Metadata } from 'next';

import { FormReset } from './form-reset';

export const metadata: Metadata = { title: 'Atur password baru' };

export default function HalamanResetPassword() {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-muted-foreground text-center text-sm">Buat password baru Anda.</p>
      <FormReset />
    </section>
  );
}
