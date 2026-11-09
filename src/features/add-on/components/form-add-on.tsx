'use client';

import { LoaderCircle } from 'lucide-react';
import { type FormEvent, type ReactElement, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { InputRupiah } from '@/components/input-rupiah';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ComboboxBahan } from '@/features/resep/components/combobox-bahan';
import { formatRupiahDesimal } from '@/lib/format';

import { buatAddOn, ubahAddOn } from '../actions';
import { teksMargin } from '../format';
import { hitungPratinjauAddOn } from '../hitung-form';
import type { BarisAddOn, PilihanBahanAddOn } from '../queries';

const FIELD = ['nama', 'bahanId', 'takaran', 'konversiSatuanId', 'harga'] as const;
type Field = (typeof FIELD)[number];

/** Nilai Select untuk satuan dasar bahan (konversi null). */
const SATUAN_DASAR = 'dasar';

type Props = {
  pemicu: ReactElement;
  bahan: PilihanBahanAddOn[];
  targetMargin: string;
  /** Kosong = tambah add-on baru. */
  addOn?: BarisAddOn;
};

type Nilai = {
  nama: string;
  bahanId: string;
  takaran: string;
  konversiSatuanId: string | null;
  harga: number | null;
};

function nilaiAwal(addOn?: BarisAddOn): Nilai {
  return {
    nama: addOn?.nama ?? '',
    bahanId: addOn?.bahanId ?? '',
    takaran: addOn ? String(Number(addOn.takaran)).replace('.', ',') : '',
    konversiSatuanId: addOn?.konversiSatuanId ?? null,
    harga: addOn?.harga ?? null,
  };
}

function Pesan({ isi }: { isi?: string }) {
  return isi ? <p className="text-destructive text-sm">{isi}</p> : null;
}

export function FormAddOn({ pemicu, bahan, targetMargin, addOn }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nilai, setNilai] = useState<Nilai>(() => nilaiAwal(addOn));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);

  const bahanTerpilih = bahan.find((b) => b.id === nilai.bahanId);
  const itemSatuan = bahanTerpilih
    ? {
        [SATUAN_DASAR]: bahanTerpilih.satuanDasar,
        ...Object.fromEntries(bahanTerpilih.konversi.map((k) => [k.id, k.namaSatuan])),
      }
    : {};
  const pratinjau = hitungPratinjauAddOn({
    bahan: bahanTerpilih,
    takaran: nilai.takaran,
    konversiSatuanId: nilai.konversiSatuanId,
    harga: nilai.harga,
    targetMargin,
  });

  function ubah<K extends keyof Nilai>(kunci: K, isi: Nilai[K]) {
    setNilai((lama) => ({ ...lama, [kunci]: isi }));
    setError(null);
    if (kunci in errors) setErrors((lama) => ({ ...lama, [kunci]: undefined }));
  }

  function ubahBahan(id: string) {
    // Konversi milik bahan lama tidak berlaku untuk bahan baru.
    setNilai((lama) => ({ ...lama, bahanId: id, konversiSatuanId: null }));
    setError(null);
    setErrors((lama) => ({ ...lama, bahanId: undefined, konversiSatuanId: undefined }));
  }

  function ubahOpen(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setNilai(nilaiAwal(addOn));
      setErrors({});
      setError(null);
    }
  }

  function kirim(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const input = {
      nama: nilai.nama,
      bahanId: nilai.bahanId,
      takaran: nilai.takaran,
      konversiSatuanId: nilai.konversiSatuanId,
      harga: nilai.harga ?? '',
    };

    startTransition(async () => {
      const hasil = addOn ? await ubahAddOn({ id: addOn.id, ...input }) : await buatAddOn(input);
      if (!hasil.ok) {
        const baru: Partial<Record<Field, string>> = {};
        for (const [field, pesan] of Object.entries(hasil.fieldErrors ?? {})) {
          if ((FIELD as readonly string[]).includes(field)) baru[field as Field] = pesan[0];
        }
        setErrors(baru);
        if (Object.keys(baru).length === 0) setError(hasil.error);
        return;
      }
      toast.success(addOn ? 'Add-on diperbarui' : 'Add-on ditambahkan');
      setOpen(false);
      setNilai(nilaiAwal(addOn));
      setErrors({});
    });
  }

  return (
    <Dialog open={open} onOpenChange={ubahOpen}>
      <DialogTrigger render={pemicu} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{addOn ? 'Ubah add-on' : 'Tambah add-on'}</DialogTitle>
          <DialogDescription>Satu bahan dengan takaran per pcs, mis. Extra keju.</DialogDescription>
        </DialogHeader>
        <form onSubmit={kirim} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-on-nama" className="text-sm font-medium">
              Nama
            </label>
            <Input
              id="add-on-nama"
              className="h-11"
              autoComplete="off"
              placeholder="mis. Extra keju"
              value={nilai.nama}
              onChange={(e) => ubah('nama', e.target.value)}
              aria-invalid={Boolean(errors.nama)}
            />
            <Pesan isi={errors.nama} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Bahan</span>
            <ComboboxBahan
              bahan={bahan}
              value={nilai.bahanId}
              onChange={ubahBahan}
              invalid={Boolean(errors.bahanId)}
            />
            <Pesan isi={errors.bahanId} />
          </div>

          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-on-takaran" className="text-sm font-medium">
                Takaran per pcs
              </label>
              <Input
                id="add-on-takaran"
                className="h-11 tabular-nums"
                inputMode="decimal"
                autoComplete="off"
                placeholder="mis. 20"
                value={nilai.takaran}
                onChange={(e) => ubah('takaran', e.target.value)}
                aria-invalid={Boolean(errors.takaran)}
              />
              <Pesan isi={errors.takaran} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Satuan</span>
              <Select
                items={itemSatuan}
                value={nilai.konversiSatuanId ?? SATUAN_DASAR}
                onValueChange={(value) =>
                  ubah('konversiSatuanId', !value || value === SATUAN_DASAR ? null : value)
                }
                disabled={!bahanTerpilih}
              >
                <SelectTrigger
                  className="h-11! w-full"
                  aria-invalid={Boolean(errors.konversiSatuanId)}
                >
                  <SelectValue placeholder="Satuan" />
                </SelectTrigger>
                <SelectContent>
                  {bahanTerpilih ? (
                    <SelectItem value={SATUAN_DASAR}>{bahanTerpilih.satuanDasar}</SelectItem>
                  ) : null}
                  {bahanTerpilih?.konversi.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.namaSatuan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Pesan isi={errors.konversiSatuanId} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-on-harga" className="text-sm font-medium">
              Harga jual per pcs
            </label>
            <InputRupiah
              id="add-on-harga"
              placeholder="0"
              value={nilai.harga}
              onChange={(harga) => ubah('harga', harga)}
              aria-invalid={Boolean(errors.harga)}
            />
            <Pesan isi={errors.harga} />
          </div>

          <section
            aria-live="polite"
            className="bg-muted/50 grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl border p-3 text-sm"
          >
            <span className="text-muted-foreground">HPP per pcs</span>
            <span className="text-right font-medium tabular-nums">
              {pratinjau ? formatRupiahDesimal(pratinjau.hpp) : '–'}
            </span>
            <span className="text-muted-foreground">Margin</span>
            <span className="text-right font-medium tabular-nums">
              {pratinjau ? teksMargin(pratinjau.marginRp, pratinjau.marginPersen) : '–'}
            </span>
            {pratinjau?.diBawahTarget ? (
              <Badge
                variant="destructive"
                className="bg-destructive/10 text-destructive col-span-2 w-fit"
              >
                Di bawah target margin
              </Badge>
            ) : null}
          </section>

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
