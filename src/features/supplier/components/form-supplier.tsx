'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { type ReactElement, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { buatSupplier, ubahSupplier } from '@/features/supplier/actions';
import { type SupplierData, type SupplierInput, supplierSchema } from '@/features/supplier/schemas';
import '@/lib/zod-id';

type DataAwal = { id: string; nama: string; kontak: string | null; catatan: string | null };

type Props = {
  pemicu: ReactElement;
  /** Kosong = tambah supplier baru. */
  supplier?: DataAwal;
};

export function FormSupplier({ pemicu, supplier }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SupplierInput, unknown, SupplierData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      nama: supplier?.nama ?? '',
      kontak: supplier?.kontak ?? '',
      catatan: supplier?.catatan ?? '',
    },
  });

  function ubahOpen(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      form.reset();
      setError(null);
    }
  }

  function onSubmit(values: SupplierData) {
    setError(null);
    startTransition(async () => {
      const hasil = supplier
        ? await ubahSupplier({ id: supplier.id, ...values })
        : await buatSupplier(values);

      if (!hasil.ok) {
        setError(hasil.error);
        for (const [field, pesan] of Object.entries(hasil.fieldErrors ?? {})) {
          if (field === 'nama' || field === 'kontak' || field === 'catatan') {
            form.setError(field, { message: pesan[0] });
          }
        }
        return;
      }

      toast.success(supplier ? 'Supplier diperbarui' : 'Supplier ditambahkan');
      setOpen(false);
      if (!supplier) form.reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={ubahOpen}>
      <DialogTrigger render={pemicu} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Ubah supplier' : 'Tambah supplier'}</DialogTitle>
          <DialogDescription>Tempat Anda biasa membeli bahan.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="nama"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input className="h-11" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kontak"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kontak (opsional)</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      autoComplete="off"
                      placeholder="0812xxxx atau email"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Nomor HP otomatis disimpan dalam format 628…</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="catatan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan (opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Bahan yang biasa dibeli, jadwal antar, dll."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={pending}
                onClick={() => ubahOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" className="h-11" disabled={pending}>
                {pending ? <LoaderCircle className="animate-spin" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
