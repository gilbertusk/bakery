'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { kirimLinkReset } from '@/lib/auth/aksi';
import { type LupaPasswordInput, lupaPasswordSchema } from '@/lib/auth/skema';

export function FormLupa() {
  const kedaluwarsa = useSearchParams().get('status') === 'kedaluwarsa';
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(
    kedaluwarsa ? { ok: false, teks: 'Link reset sudah kedaluwarsa, minta link baru' } : null,
  );
  const [pending, startTransition] = useTransition();

  const form = useForm<LupaPasswordInput>({
    resolver: zodResolver(lupaPasswordSchema),
    defaultValues: { email: '' },
  });

  function onSubmit(values: LupaPasswordInput) {
    setPesan(null);
    startTransition(async () => {
      const hasil = await kirimLinkReset(values);
      setPesan(hasil.ok ? { ok: true, teks: hasil.pesan ?? '' } : { ok: false, teks: hasil.error });
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {pesan ? (
          <p
            role={pesan.ok ? 'status' : 'alert'}
            className={pesan.ok ? 'text-sm' : 'text-destructive text-sm'}
          >
            {pesan.teks}
          </p>
        ) : null}

        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          Kirim link reset
        </Button>

        <Link
          href="/login"
          className="text-muted-foreground text-center text-sm underline-offset-4 hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </form>
    </Form>
  );
}
