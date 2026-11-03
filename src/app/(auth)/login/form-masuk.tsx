'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
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
import { masuk } from '@/lib/auth/aksi';
import { type MasukInput, masukSchema } from '@/lib/auth/skema';

export function FormMasuk() {
  const searchParams = useSearchParams();
  const [lihatPassword, setLihatPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<MasukInput>({
    resolver: zodResolver(masukSchema),
    defaultValues: { email: '', password: '', next: searchParams.get('next') ?? undefined },
  });

  function onSubmit(values: MasukInput) {
    setError(null);
    startTransition(async () => {
      const hasil = await masuk(values);
      if (hasil && !hasil.ok) setError(hasil.error);
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
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={lihatPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="h-11 pr-11"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1.5 right-1.5"
                  aria-label={lihatPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  onClick={() => setLihatPassword((v) => !v)}
                >
                  {lihatPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          Masuk
        </Button>

        <Link
          href="/login/lupa"
          className="text-muted-foreground text-center text-sm underline-offset-4 hover:underline"
        >
          Lupa password?
        </Link>
      </form>
    </Form>
  );
}
