'use client';

import { Copy, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';
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
import { Input } from '@/components/ui/input';

import { duplikatResep } from '../actions';
import { duplikatResepSchema } from '../schemas';

export function DialogDuplikatResep({ resep }: { resep: { id: string; nama: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [namaBaru, setNamaBaru] = useState(`${resep.nama} (salinan)`);
  const [errorNama, setErrorNama] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ubahOpen(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setNamaBaru(`${resep.nama} (salinan)`);
      setErrorNama(null);
      setError(null);
    }
  }

  function simpan(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorNama(null);
    const input = duplikatResepSchema.safeParse({ resepId: resep.id, namaBaru });
    if (!input.success) {
      setErrorNama(
        input.error.issues.find((issue) => issue.path[0] === 'namaBaru')?.message ?? null,
      );
      return;
    }

    startTransition(async () => {
      const hasil = await duplikatResep(input.data);
      if (!hasil.ok) {
        setErrorNama(hasil.fieldErrors?.namaBaru?.[0] ?? null);
        if (!hasil.fieldErrors?.namaBaru) setError(hasil.error);
        return;
      }
      toast.success('Resep berhasil diduplikat');
      setOpen(false);
      router.push(`/resep/${hasil.data.id}/ubah`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={ubahOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-11">
            <Copy /> Duplikat
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplikat resep</DialogTitle>
          <DialogDescription>
            Semua bahan dan pengaturan {resep.nama} akan disalin. Perubahan pada salinan tidak
            memengaruhi resep asal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={simpan} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nama-salinan" className="text-sm font-medium">
              Nama resep baru
            </label>
            <Input
              id="nama-salinan"
              className="h-11"
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              aria-invalid={Boolean(errorNama)}
              autoFocus
              disabled={pending}
            />
            {errorNama ? <p className="text-destructive text-sm">{errorNama}</p> : null}
          </div>
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
              {pending ? <LoaderCircle className="animate-spin" /> : <Copy />}
              Duplikat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
