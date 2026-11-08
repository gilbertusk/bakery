'use client';

import { LoaderCircle, Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import { type FormEvent, useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ConfirmDialog } from '@/components/confirm-dialog';
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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { formatAngka } from '@/lib/format';
import '@/lib/zod-id';

import { hapusKonversi, tambahKonversi, ubahKonversi } from '../konversi-actions';
import { tambahKonversiSchema, ubahKonversiSchema } from '../konversi-schemas';
import type { BarisKonversiBahan } from '../queries';
import type { SaranKonversi } from '../saran-konversi';

type FieldErrors = Partial<Record<'namaSatuan' | 'nilaiDasar', string>>;

function errorDari(fieldErrors: Record<string, string[]> | undefined): FieldErrors {
  return {
    namaSatuan: fieldErrors?.namaSatuan?.[0],
    nilaiDasar: fieldErrors?.nilaiDasar?.[0],
  };
}

function errorZod(error: z.ZodError): FieldErrors {
  return errorDari(z.flattenError(error).fieldErrors);
}

function InputKonversi({
  namaSatuan,
  nilaiDasar,
  satuanDasar,
  errors,
  disabled,
  onNamaChange,
  onNilaiChange,
}: {
  namaSatuan: string;
  nilaiDasar: string;
  satuanDasar: string;
  errors: FieldErrors;
  disabled: boolean;
  onNamaChange: (value: string) => void;
  onNilaiChange: (value: string) => void;
}) {
  const id = useId();
  const namaId = `${id}-nama`;
  const nilaiId = `${id}-nilai`;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={namaId} className="text-sm font-medium">
          Nama satuan
        </label>
        <InputGroup className="h-11">
          <InputGroupAddon>1</InputGroupAddon>
          <InputGroupInput
            id={namaId}
            autoComplete="off"
            placeholder="sdm"
            value={namaSatuan}
            onChange={(e) => onNamaChange(e.target.value)}
            aria-invalid={Boolean(errors.namaSatuan)}
            disabled={disabled}
          />
        </InputGroup>
        {errors.namaSatuan ? <p className="text-destructive text-sm">{errors.namaSatuan}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nilaiId} className="text-sm font-medium">
          Setara dengan
        </label>
        <InputGroup className="h-11">
          <InputGroupInput
            id={nilaiId}
            inputMode="decimal"
            autoComplete="off"
            placeholder="12"
            className="tabular-nums"
            value={nilaiDasar}
            onChange={(e) => onNilaiChange(e.target.value)}
            aria-invalid={Boolean(errors.nilaiDasar)}
            disabled={disabled}
          />
          <InputGroupAddon align="inline-end">{satuanDasar}</InputGroupAddon>
        </InputGroup>
        {errors.nilaiDasar ? <p className="text-destructive text-sm">{errors.nilaiDasar}</p> : null}
      </div>
    </div>
  );
}

function FormTambah({
  bahanId,
  satuanDasar,
  saran,
}: {
  bahanId: string;
  satuanDasar: string;
  saran: SaranKonversi[];
}) {
  const [namaSatuan, setNamaSatuan] = useState('');
  const [nilaiDasar, setNilaiDasar] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function isiSaran(item: SaranKonversi) {
    setNamaSatuan(item.namaSatuan);
    setNilaiDasar(item.nilaiDasar.replace('.', ','));
    setErrors({});
    setError(null);
  }

  function simpan(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cek = tambahKonversiSchema.safeParse({ bahanId, namaSatuan, nilaiDasar });
    if (!cek.success) {
      setErrors(errorZod(cek.error));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const hasil = await tambahKonversi(cek.data);
      if (!hasil.ok) {
        setError(hasil.error);
        setErrors(errorDari(hasil.fieldErrors));
        return;
      }
      toast.success('Konversi ditambahkan');
      setNamaSatuan('');
      setNilaiDasar('');
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">Tambah konversi</h2>
        <p className="text-muted-foreground text-sm">
          Contoh: 1 sdm setara dengan 12 {satuanDasar}.
        </p>
      </div>

      {saran.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Saran</p>
          <div className="flex flex-wrap gap-2">
            {saran.map((item) => (
              <Button
                key={`${item.namaSatuan}-${item.nilaiDasar}`}
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full"
                onClick={() => isiSaran(item)}
                disabled={pending}
              >
                {item.namaSatuan} · {formatAngka(item.nilaiDasar)} {satuanDasar}
              </Button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">Perkiraan, cek dengan timbangan.</p>
        </div>
      ) : null}

      <form onSubmit={simpan} className="flex flex-col gap-4" noValidate>
        <InputKonversi
          namaSatuan={namaSatuan}
          nilaiDasar={nilaiDasar}
          satuanDasar={satuanDasar}
          errors={errors}
          disabled={pending}
          onNamaChange={setNamaSatuan}
          onNilaiChange={setNilaiDasar}
        />
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-11 sm:self-end" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
          Tambah konversi
        </Button>
      </form>
    </section>
  );
}

function DialogUbah({
  konversi,
  satuanDasar,
}: {
  konversi: BarisKonversiBahan;
  satuanDasar: string;
}) {
  const [open, setOpen] = useState(false);
  const [namaSatuan, setNamaSatuan] = useState(konversi.namaSatuan);
  const [nilaiDasar, setNilaiDasar] = useState(formatAngka(konversi.nilaiDasar));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ubahOpen(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setNamaSatuan(konversi.namaSatuan);
      setNilaiDasar(formatAngka(konversi.nilaiDasar));
      setErrors({});
      setError(null);
    }
  }

  function simpan(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cek = ubahKonversiSchema.safeParse({ id: konversi.id, namaSatuan, nilaiDasar });
    if (!cek.success) {
      setErrors(errorZod(cek.error));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const hasil = await ubahKonversi(cek.data);
      if (!hasil.ok) {
        setError(hasil.error);
        setErrors(errorDari(hasil.fieldErrors));
        return;
      }
      toast.success('Konversi diperbarui');
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={ubahOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            aria-label={`Ubah ${konversi.namaSatuan}`}
          >
            <Pencil />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah konversi</DialogTitle>
          <DialogDescription>
            Takaran resep dan produk yang memakai konversi ini akan dihitung ulang.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={simpan} className="flex flex-col gap-4" noValidate>
          <InputKonversi
            namaSatuan={namaSatuan}
            nilaiDasar={nilaiDasar}
            satuanDasar={satuanDasar}
            errors={errors}
            disabled={pending}
            onNamaChange={setNamaSatuan}
            onNilaiChange={setNilaiDasar}
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
      </DialogContent>
    </Dialog>
  );
}

function TombolHapus({ konversi }: { konversi: BarisKonversiBahan }) {
  async function hapus() {
    const hasil = await hapusKonversi({ id: konversi.id });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success('Konversi dihapus');
  }

  return (
    <ConfirmDialog
      judul={`Hapus konversi ${konversi.namaSatuan}?`}
      deskripsi="Konversi yang sedang dipakai resep atau produk tidak dapat dihapus."
      labelKonfirmasi="Hapus"
      berbahaya
      onKonfirmasi={hapus}
      pemicu={
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive size-10"
          aria-label={`Hapus ${konversi.namaSatuan}`}
        >
          <Trash2 />
        </Button>
      }
    />
  );
}

export function TabKonversi({
  bahan,
  konversi,
  saran,
}: {
  bahan: { id: string; satuanDasar: string };
  konversi: BarisKonversiBahan[];
  saran: SaranKonversi[];
}) {
  const namaTerpakai = new Set(konversi.map((item) => item.namaSatuan.toLowerCase()));
  const saranBaru = saran.filter((item) => !namaTerpakai.has(item.namaSatuan.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      {konversi.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
          <Scale className="text-muted-foreground size-8" aria-hidden />
          <div>
            <h2 className="font-medium">Belum ada konversi</h2>
            <p className="text-muted-foreground text-sm">
              Tambahkan satuan dapur seperti sdm, cup, atau butir.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {konversi.map((item) => (
            <li key={item.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
              <p className="min-w-0 flex-1 text-base tabular-nums">
                1 <span className="font-medium">{item.namaSatuan}</span> ={' '}
                <span className="font-medium">{formatAngka(item.nilaiDasar)}</span>{' '}
                {bahan.satuanDasar}
              </p>
              <div className="flex shrink-0 items-center">
                <DialogUbah konversi={item} satuanDasar={bahan.satuanDasar} />
                <TombolHapus konversi={item} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <FormTambah bahanId={bahan.id} satuanDasar={bahan.satuanDasar} saran={saranBaru} />
    </div>
  );
}
