'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
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
import { setelPasswordBaru } from '@/lib/auth/aksi';
import { type PasswordBaruInput, passwordBaruSchema } from '@/lib/auth/skema';

export function FormReset() {
  const [lihatPassword, setLihatPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<PasswordBaruInput>({
    resolver: zodResolver(passwordBaruSchema),
    defaultValues: { password: '', konfirmasi: '' },
  });

  function onSubmit(values: PasswordBaruInput) {
    setError(null);
    startTransition(async () => {
      const hasil = await setelPasswordBaru(values);
      if (hasil && !hasil.ok) setError(hasil.error);
    });
  }

  const tipe = lihatPassword ? 'text' : 'password';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password baru</FormLabel>
              <FormControl>
                <Input type={tipe} autoComplete="new-password" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="konfirmasi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ulangi password baru</FormLabel>
              <FormControl>
                <Input type={tipe} autoComplete="new-password" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => setLihatPassword((v) => !v)}
        >
          {lihatPassword ? <EyeOff /> : <Eye />}
          {lihatPassword ? 'Sembunyikan password' : 'Tampilkan password'}
        </Button>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          Simpan password
        </Button>
      </form>
    </Form>
  );
}
