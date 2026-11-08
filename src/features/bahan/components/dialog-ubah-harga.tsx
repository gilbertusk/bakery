'use client';

import { LoaderCircle, Pencil } from 'lucide-react';
import { type FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

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
import type { SatuanDasar } from '@/db/schema/enums';
import { formatHargaSatuan } from '@/lib/format';
import '@/lib/zod-id';

import { ubahHargaManual } from '../actions';
import { kemasanSchema } from '../schemas';
import {
  type ErrorKemasan,
  InputHargaKemasan,
  type NilaiKemasan,
  kemasanAwal,
} from './input-harga-kemasan';

type Props = {
  bahan: { id: string; nama: string; satuanDasar: SatuanDasar };
};

function errorDari(fieldErrors: Record<string, string[]> | undefined): ErrorKemasan {
  return {
    jumlahKemasan: fieldErrors?.jumlahKemasan?.[0],
    satuanKemasan: fieldErrors?.satuanKemasan?.[0],
    totalHarga: fieldErrors?.totalHarga?.[0],
  };
}

/** F-BHN-02: koreksi harga manual dari harga kemasan; tercatat di riwayat harga. */
export function DialogUbahHarga({ bahan }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nilai, setNilai] = useState<NilaiKemasan>(() => kemasanAwal(bahan.satuanDasar));
  const [errorField, setErrorField] = useState<ErrorKemasan>({});
  const [error, setError] = useState<string | null>(null);

  function ubahOpen(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setNilai(kemasanAwal(bahan.satuanDasar));
      setErrorField({});
      setError(null);
    }
  }

  function simpan(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cek = kemasanSchema.safeParse(nilai);
    if (!cek.success) {
      setErrorField(errorDari(z.flattenError(cek.error).fieldErrors));
      return;
    }
    setErrorField({});
    startTransition(async () => {
      const hasil = await ubahHargaManual({ id: bahan.id, ...cek.data });
      if (!hasil.ok) {
        setError(hasil.error);
        setErrorField(errorDari(hasil.fieldErrors));
        return;
      }
      const harga = formatHargaSatuan(hasil.data.hargaPerSatuan, bahan.satuanDasar);
      if (hasil.data.berubah) toast.success(`Harga diperbarui menjadi ${harga}`);
      else toast.info(`Harga tetap ${harga}, tidak ada perubahan`);
      setOpen(false);
      setNilai(kemasanAwal(bahan.satuanDasar));
    });
  }

  return (
    <Dialog open={open} onOpenChange={ubahOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-11">
            <Pencil />
            Ubah harga
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah harga {bahan.nama}</DialogTitle>
          <DialogDescription>
            Masukkan harga kemasan terakhir. Harga per {bahan.satuanDasar} dihitung otomatis dan
            tercatat di riwayat harga.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={simpan} className="flex flex-col gap-4" noValidate>
          <InputHargaKemasan
            satuanDasar={bahan.satuanDasar}
            value={nilai}
            onChange={setNilai}
            error={errorField}
            disabled={pending}
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
              Simpan harga
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
