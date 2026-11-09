'use client';

import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { type FormEvent, type ReactElement, useState, useTransition } from 'react';
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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { MetodeBiaya } from '@/db/schema';
import { formatRupiahDesimal } from '@/lib/format';

import {
  type DampakBiaya,
  buatBiayaTambahan,
  pratinjauDampakBiaya,
  ubahBiayaTambahan,
} from '../actions';
import { LABEL_METODE, kalimatDampak, nilaiUntukForm } from '../format';
import type { BarisBiayaTambahan } from '../queries';
import { METODE_BIAYA } from '../schemas';

const SEMUA = 'semua';
const FIELD = ['nama', 'metode', 'nilai', 'produkId'] as const;
type Field = (typeof FIELD)[number];

const BANTUAN_METODE: Record<MetodeBiaya, string> = {
  per_pcs: 'Ditambahkan ke HPP setiap pcs.',
  persen: 'Dihitung dari biaya bahan per pcs. Isi 0–100.',
  per_batch: 'Dibagi jumlah pcs dari 1 resep adonan utama.',
};

type Props = {
  pemicu: ReactElement;
  produk: { id: string; nama: string }[];
  /** Kosong = tambah biaya baru. */
  biaya?: BarisBiayaTambahan;
};

type Nilai = {
  nama: string;
  metode: MetodeBiaya;
  nilai: string;
  produkId: string;
  aktif: boolean;
};

function nilaiAwal(biaya?: BarisBiayaTambahan): Nilai {
  return {
    nama: biaya?.nama ?? '',
    metode: biaya?.metode ?? 'per_pcs',
    nilai: biaya ? nilaiUntukForm(biaya.metode, biaya.nilai) : '',
    produkId: biaya?.produkId ?? SEMUA,
    aktif: biaya?.aktif ?? true,
  };
}

export function FormBiayaTambahan({ pemicu, produk, biaya }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nilai, setNilai] = useState<Nilai>(() => nilaiAwal(biaya));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [dampak, setDampak] = useState<DampakBiaya | null>(null);

  // Biaya lama bisa menunjuk produk nonaktif yang tidak ada di pilihan.
  const pilihanProduk =
    biaya?.produkId && !produk.some((p) => p.id === biaya.produkId)
      ? [...produk, { id: biaya.produkId, nama: biaya.namaProduk ?? 'Produk nonaktif' }]
      : produk;
  const itemProduk = {
    [SEMUA]: 'Semua produk',
    ...Object.fromEntries(pilihanProduk.map((p) => [p.id, p.nama])),
  };

  function ubah<K extends keyof Nilai>(kunci: K, isi: Nilai[K]) {
    setNilai((lama) => ({ ...lama, [kunci]: isi }));
    setDampak(null);
    setError(null);
    if (kunci in errors) setErrors((lama) => ({ ...lama, [kunci]: undefined }));
  }

  function ubahOpen(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setNilai(nilaiAwal(biaya));
      setErrors({});
      setError(null);
      setDampak(null);
    }
  }

  function terapkanError(hasil: { error: string; fieldErrors?: Record<string, string[]> }) {
    const baru: Partial<Record<Field, string>> = {};
    for (const [field, pesan] of Object.entries(hasil.fieldErrors ?? {})) {
      if ((FIELD as readonly string[]).includes(field)) baru[field as Field] = pesan[0];
    }
    setErrors(baru);
    if (Object.keys(baru).length === 0) setError(hasil.error);
  }

  function kirim(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const input = {
      nama: nilai.nama,
      metode: nilai.metode,
      nilai: nilai.nilai,
      produkId: nilai.produkId === SEMUA ? null : nilai.produkId,
      aktif: nilai.aktif,
    };

    startTransition(async () => {
      if (!dampak) {
        const hasil = await pratinjauDampakBiaya({ id: biaya?.id ?? null, ...input });
        if (!hasil.ok) return terapkanError(hasil);
        setErrors({});
        setDampak(hasil.data);
        return;
      }

      const hasil = biaya
        ? await ubahBiayaTambahan({ id: biaya.id, ...input })
        : await buatBiayaTambahan(input);
      if (!hasil.ok) {
        setDampak(null);
        return terapkanError(hasil);
      }
      toast.success(biaya ? 'Biaya tambahan diperbarui' : 'Biaya tambahan ditambahkan');
      setOpen(false);
      setNilai(nilaiAwal(biaya));
      setDampak(null);
    });
  }

  const persen = nilai.metode === 'persen';

  return (
    <Dialog open={open} onOpenChange={ubahOpen}>
      <DialogTrigger render={pemicu} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{biaya ? 'Ubah biaya tambahan' : 'Tambah biaya tambahan'}</DialogTitle>
          <DialogDescription>
            Gas, listrik, tenaga, atau biaya lain di luar bahan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={kirim} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="biaya-nama" className="text-sm font-medium">
              Nama
            </label>
            <Input
              id="biaya-nama"
              className="h-11"
              autoComplete="off"
              placeholder="mis. Gas oven"
              value={nilai.nama}
              onChange={(e) => ubah('nama', e.target.value)}
              aria-invalid={Boolean(errors.nama)}
            />
            {errors.nama ? <p className="text-destructive text-sm">{errors.nama}</p> : null}
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Metode</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {METODE_BIAYA.map((metode) => (
                <Button
                  key={metode}
                  type="button"
                  variant={nilai.metode === metode ? 'default' : 'outline'}
                  className="h-11 whitespace-normal"
                  aria-pressed={nilai.metode === metode}
                  onClick={() => ubah('metode', metode)}
                >
                  {LABEL_METODE[metode]}
                </Button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">{BANTUAN_METODE[nilai.metode]}</p>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="biaya-nilai" className="text-sm font-medium">
              {persen
                ? 'Persen'
                : nilai.metode === 'per_pcs'
                  ? 'Rupiah per pcs'
                  : 'Rupiah per resep'}
            </label>
            <InputGroup className="h-11">
              {persen ? null : <InputGroupAddon>Rp</InputGroupAddon>}
              <InputGroupInput
                id="biaya-nilai"
                inputMode="decimal"
                autoComplete="off"
                className="tabular-nums"
                placeholder={persen ? '0–100' : '0'}
                value={nilai.nilai}
                onChange={(e) => ubah('nilai', e.target.value)}
                aria-invalid={Boolean(errors.nilai)}
              />
              {persen ? <InputGroupAddon align="inline-end">%</InputGroupAddon> : null}
            </InputGroup>
            {errors.nilai ? <p className="text-destructive text-sm">{errors.nilai}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Berlaku untuk</label>
            <Select
              items={itemProduk}
              value={nilai.produkId}
              onValueChange={(value) => ubah('produkId', value ?? SEMUA)}
            >
              <SelectTrigger className="h-11! w-full" aria-invalid={Boolean(errors.produkId)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEMUA}>Semua produk</SelectItem>
                {pilihanProduk.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.produkId ? <p className="text-destructive text-sm">{errors.produkId}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Aktif</p>
              <p className="text-muted-foreground text-xs">Biaya nonaktif tidak masuk HPP.</p>
            </div>
            <Switch checked={nilai.aktif} onCheckedChange={(checked) => ubah('aktif', checked)} />
          </div>

          {dampak ? <RingkasanDampak dampak={dampak} /> : null}

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
              {dampak ? 'Simpan' : 'Lihat dampak'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const MAKS_PRODUK = 5;

function RingkasanDampak({ dampak }: { dampak: DampakBiaya }) {
  const diBawahTarget = dampak.produk.filter((p) => p.diBawahTarget).length;
  return (
    <section aria-live="polite" className="bg-muted/50 flex flex-col gap-2 rounded-xl border p-3">
      <p className="text-sm font-medium">{kalimatDampak(dampak)}</p>
      {dampak.produk.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {dampak.produk.slice(0, MAKS_PRODUK).map((p) => (
            <li key={p.produkId} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{p.nama}</span>
              <span className="shrink-0 tabular-nums">
                {formatRupiahDesimal(p.hppLama)} → {formatRupiahDesimal(p.hppBaru)}
              </span>
            </li>
          ))}
          {dampak.produk.length > MAKS_PRODUK ? (
            <li className="text-muted-foreground">
              dan {dampak.produk.length - MAKS_PRODUK} produk lain
            </li>
          ) : null}
        </ul>
      ) : null}
      {diBawahTarget > 0 ? (
        <p className="flex gap-2 text-sm text-amber-800 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {diBawahTarget} produk akan berada di bawah target margin.
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Belum disimpan. Tekan Simpan untuk menerapkan.
      </p>
    </section>
  );
}
