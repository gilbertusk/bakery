import { Suspense, type ReactNode } from 'react';

import { NAMA_TOKO_DEFAULT, getIdentitasToko } from '@/lib/toko';

async function IdentitasToko() {
  const { namaToko, logoUrl } = await getIdentitasToko();
  return (
    <>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-16 rounded-full object-cover" />
      ) : null}
      <h1 className="text-2xl font-semibold">{namaToko}</h1>
    </>
  );
}

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Suspense fallback={<h1 className="text-2xl font-semibold">{NAMA_TOKO_DEFAULT}</h1>}>
            <IdentitasToko />
          </Suspense>
        </div>
        {children}
      </div>
    </main>
  );
}
