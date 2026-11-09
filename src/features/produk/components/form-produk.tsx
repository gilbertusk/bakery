'use client';

import {
  ArrowLeft,
  Cake,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react';
import { Controller, type Path, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { InputRupiah } from '@/components/input-rupiah';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { formatAngka, formatRupiah } from '@/lib/format';

import { simpanProduk, unggahFotoProduk } from '../actions';
import { kompresFotoProduk } from '../foto';
import {
  type BahanPratinjauProduk,
  type ResepPratinjauProduk,
  hitungPratinjauProduk,
} from '../hitung-form';
import { produkSchema } from '../schemas';
import { ComboboxBahan, type BahanFormResep } from '../../resep/components/combobox-bahan';

const KATEGORI = ['kue kering', 'kue basah', 'brownies', 'cake', 'roti', 'minuman', 'lainnya'];

type KomponenForm =
  | { jenis: 'adonan'; resepAdonanId: string; gramPerPcs: string }
  | {
      jenis: 'bahan';
      peran: 'topping' | 'filling' | 'kemasan' | 'lainnya';
      bahanId: string;
      takaran: string;
      konversiSatuanId: string | null;
    };

type NilaiForm = {
  nama: string;
  kategori: string;
  cetakan: string;
  hargaJual: number | null;
  targetMarginPersen: string;
  dijual: boolean;
  komponen: KomponenForm[];
};

export type ProdukAwalForm = {
  id: string;
  nama: string;
  kategori: string;
  cetakan: string | null;
  hargaJual: number;
  targetMargin: string | null;
  stok: number;
  fotoUrl: string | null;
  dijual: boolean;
  komponen: KomponenForm[];
};

function pesan(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  return message ? <p className="text-destructive text-sm">{message}</p> : null;
}

function targetKePersen(target: string | null | undefined, defaultTarget: string) {
  return formatAngka(Number(target ?? defaultTarget) * 100, 2);
}

function targetKeRasio(target: string): string {
  const angka = Number(target.trim().replace(',', '.'));
  return Number.isFinite(angka) ? String(angka / 100) : '0.3';
}

export function FormProduk({
  resep,
  bahan,
  targetMarginDefault,
  produk,
}: {
  resep: ResepPratinjauProduk[];
  bahan: BahanPratinjauProduk[];
  targetMarginDefault: string;
  produk?: ProdukAwalForm;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [pratinjauFoto, setPratinjauFoto] = useState<string | null>(produk?.fotoUrl ?? null);
  const urlFotoLokal = useRef<string | null>(null);
  const form = useForm<NilaiForm>({
    defaultValues: {
      nama: produk?.nama ?? '',
      kategori: produk?.kategori ?? '',
      cetakan: produk?.cetakan ?? '',
      hargaJual: produk?.hargaJual ?? null,
      targetMarginPersen: targetKePersen(produk?.targetMargin, targetMarginDefault),
      dijual: produk?.dijual ?? true,
      komponen: produk?.komponen ?? [{ jenis: 'adonan', resepAdonanId: '', gramPerPcs: '' }],
    },
  });
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'komponen',
  });
  const komponen = useWatch({ control: form.control, name: 'komponen' });
  const hargaJual = useWatch({ control: form.control, name: 'hargaJual' });
  const targetMarginPersen = useWatch({
    control: form.control,
    name: 'targetMarginPersen',
  });
  const dijual = useWatch({ control: form.control, name: 'dijual' });
  const targetRasio = targetKeRasio(targetMarginPersen);
  const pratinjau = hitungPratinjauProduk({
    hargaJual: String(hargaJual ?? ''),
    targetMargin: targetRasio,
    resep,
    bahan,
    komponen,
  });
  const bahanCombobox: BahanFormResep[] = bahan.map((item) => ({
    ...item,
    satuanDasar: item.satuanDasar as BahanFormResep['satuanDasar'],
    aktif: true,
  }));
  useEffect(() => {
    return () => {
      if (urlFotoLokal.current) URL.revokeObjectURL(urlFotoLokal.current);
    };
  }, []);

  function pilihFoto(file: File | null) {
    if (urlFotoLokal.current) URL.revokeObjectURL(urlFotoLokal.current);
    urlFotoLokal.current = file ? URL.createObjectURL(file) : null;
    setFoto(file);
    setPratinjauFoto(urlFotoLokal.current ?? produk?.fotoUrl ?? null);
  }

  function pathForm(path: string): Path<NilaiForm> {
    return path.replace('targetMargin', 'targetMarginPersen') as Path<NilaiForm>;
  }

  function terapkanError(fieldErrors: Record<string, string[]> | undefined) {
    for (const [field, daftar] of Object.entries(fieldErrors ?? {})) {
      form.setError(pathForm(field), { message: daftar[0] });
    }
  }

  function simpan(event: FormEvent) {
    event.preventDefault();
    setError(null);
    form.clearErrors();
    const nilai = form.getValues();
    const hasil = produkSchema.safeParse({
      nama: nilai.nama,
      kategori: nilai.kategori,
      cetakan: nilai.cetakan,
      hargaJual: nilai.hargaJual,
      targetMargin: nilai.targetMarginPersen.trim()
        ? targetKeRasio(nilai.targetMarginPersen)
        : null,
      dijual: nilai.dijual,
      komponen: nilai.komponen,
    });
    if (!hasil.success) {
      for (const issue of hasil.error.issues) {
        form.setError(pathForm(issue.path.join('.')), { message: issue.message });
      }
      return;
    }

    startTransition(async () => {
      const disimpan = await simpanProduk({ id: produk?.id ?? null, ...hasil.data });
      if (!disimpan.ok) {
        terapkanError(disimpan.fieldErrors);
        if (!disimpan.fieldErrors || Object.keys(disimpan.fieldErrors).length === 0) {
          setError(disimpan.error);
        }
        return;
      }

      if (foto) {
        try {
          const dikompres = await kompresFotoProduk(foto);
          const formData = new FormData();
          formData.set('id', disimpan.data.id);
          formData.set('file', dikompres);
          const diunggah = await unggahFotoProduk(formData);
          if (!diunggah.ok) toast.error(diunggah.error);
        } catch {
          toast.error('Gagal memproses foto di perangkat ini');
        }
      }

      toast.success(produk ? 'Produk diperbarui' : 'Produk ditambahkan');
      router.push(`/produk/${disimpan.data.id}`);
    });
  }

  return (
    <form
      onSubmit={simpan}
      className="grid gap-5 pb-72 lg:grid-cols-[minmax(0,1fr)_20rem] lg:pb-0"
      noValidate
    >
      <div className="flex min-w-0 flex-col gap-5">
        <section className="flex flex-col gap-5 rounded-xl border p-4 sm:p-6">
          <div>
            <h2 className="font-medium">Info produk</h2>
            <p className="text-muted-foreground text-sm">
              Data jual, target margin, dan foto produk.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nama-produk" className="text-sm font-medium">
                Nama produk
              </label>
              <Input id="nama-produk" className="h-11" {...form.register('nama')} />
              {pesan(form.formState.errors.nama)}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="kategori-produk" className="text-sm font-medium">
                Kategori
              </label>
              <Input
                id="kategori-produk"
                className="h-11"
                list="kategori-produk-pilihan"
                {...form.register('kategori')}
              />
              <datalist id="kategori-produk-pilihan">
                {KATEGORI.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {pesan(form.formState.errors.kategori)}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cetakan-produk" className="text-sm font-medium">
                Cetakan (opsional)
              </label>
              <Input id="cetakan-produk" className="h-11" {...form.register('cetakan')} />
              {pesan(form.formState.errors.cetakan)}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="harga-jual" className="text-sm font-medium">
                Harga jual
              </label>
              <Controller
                control={form.control}
                name="hargaJual"
                render={({ field }) => (
                  <InputRupiah
                    id="harga-jual"
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={Boolean(form.formState.errors.hargaJual)}
                  />
                )}
              />
              {pesan(form.formState.errors.hargaJual)}
            </div>
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <label htmlFor="target-margin" className="text-sm font-medium">
                Target margin
              </label>
              <InputGroup className="h-11">
                <InputGroupInput
                  id="target-margin"
                  inputMode="decimal"
                  {...form.register('targetMarginPersen')}
                  aria-invalid={Boolean(form.formState.errors.targetMarginPersen)}
                />
                <InputGroupAddon align="inline-end">%</InputGroupAddon>
              </InputGroup>
              {pesan(form.formState.errors.targetMarginPersen)}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Dijual</p>
                <p className="text-muted-foreground text-xs">Tampilkan di kasir.</p>
              </div>
              <Switch
                checked={dijual}
                onCheckedChange={(checked) =>
                  form.setValue('dijual', checked, { shouldDirty: true })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="foto-produk" className="text-sm font-medium">
              Foto produk
            </label>
            <div className="flex items-center gap-4">
              <div className="bg-muted relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                {pratinjauFoto ? (
                  <Image
                    src={pratinjauFoto}
                    alt="Pratinjau produk"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <Cake className="text-muted-foreground size-9" aria-hidden />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="foto-produk"
                  className="hover:bg-accent inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium"
                >
                  <ImagePlus className="size-4" /> {pratinjauFoto ? 'Ganti foto' : 'Pilih foto'}
                </label>
                <input
                  id="foto-produk"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => pilihFoto(event.target.files?.[0] ?? null)}
                />
                <p className="text-muted-foreground text-xs">
                  JPG, PNG, atau WebP. Maks. 2 MB setelah kompresi.
                </p>
              </div>
            </div>
          </div>
          {produk ? (
            <p className="text-muted-foreground text-sm">
              Stok saat ini: <strong>{formatAngka(produk.stok)}</strong> (hanya dapat diubah lewat
              produksi atau penyesuaian).
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium">Komponen per pcs</h2>
              <p className="text-muted-foreground text-sm">
                Gabungkan beberapa adonan dan bahan langsung.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => append({ jenis: 'adonan', resepAdonanId: '', gramPerPcs: '' })}
            >
              <Plus /> Tambah
            </Button>
          </div>
          {pesan(form.formState.errors.komponen as { message?: string } | undefined)}

          {fields.map((field, index) => {
            const item = komponen[index];
            const errors = form.formState.errors.komponen?.[index];
            if (!item) return null;
            return (
              <div key={field.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex rounded-lg border p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={item.jenis === 'adonan' ? 'default' : 'ghost'}
                      onClick={() =>
                        update(index, { jenis: 'adonan', resepAdonanId: '', gramPerPcs: '' })
                      }
                    >
                      Adonan
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={item.jenis === 'bahan' ? 'default' : 'ghost'}
                      onClick={() =>
                        update(index, {
                          jenis: 'bahan',
                          peran: 'topping',
                          bahanId: '',
                          takaran: '',
                          konversiSatuanId: null,
                        })
                      }
                    >
                      Bahan
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive size-9"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label={`Hapus komponen ${index + 1}`}
                  >
                    <Trash2 />
                  </Button>
                </div>

                {item.jenis === 'adonan' ? (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Resep adonan</label>
                      <Select
                        items={resep.map((r) => ({ value: r.id, label: r.nama }))}
                        value={item.resepAdonanId || null}
                        onValueChange={(value) =>
                          form.setValue(`komponen.${index}.resepAdonanId`, value ?? '', {
                            shouldDirty: true,
                          })
                        }
                      >
                        <SelectTrigger
                          className="h-11! w-full"
                          aria-invalid={Boolean(
                            errors && 'resepAdonanId' in errors && errors.resepAdonanId,
                          )}
                        >
                          <SelectValue placeholder="Pilih resep" />
                        </SelectTrigger>
                        <SelectContent>
                          {resep.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.nama}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {pesan(
                        errors && 'resepAdonanId' in errors ? errors.resepAdonanId : undefined,
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`gram-${field.id}`} className="text-sm font-medium">
                        Gram/pcs
                      </label>
                      <InputGroup className="h-11">
                        <InputGroupInput
                          id={`gram-${field.id}`}
                          inputMode="decimal"
                          {...form.register(`komponen.${index}.gramPerPcs`)}
                        />
                        <InputGroupAddon align="inline-end">g</InputGroupAddon>
                      </InputGroup>
                      {pesan(errors && 'gramPerPcs' in errors ? errors.gramPerPcs : undefined)}
                    </div>
                    {(() => {
                      const info = resep.find((r) => r.id === item.resepAdonanId);
                      const gram = Number(item.gramPerPcs.replace(',', '.'));
                      return info && gram > 0 ? (
                        <p className="text-muted-foreground text-sm sm:col-span-2">
                          1 resep {info.nama} ≈ {Math.floor(Number(info.hasilGram) / gram)} pcs
                        </p>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_7rem_8rem]">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Peran</label>
                      <Select
                        items={{
                          topping: 'Topping',
                          filling: 'Filling',
                          kemasan: 'Kemasan',
                          lainnya: 'Lainnya',
                        }}
                        value={item.peran}
                        onValueChange={(value) =>
                          value &&
                          form.setValue(`komponen.${index}.peran`, value as typeof item.peran, {
                            shouldDirty: true,
                          })
                        }
                      >
                        <SelectTrigger className="h-11! w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="topping">Topping</SelectItem>
                          <SelectItem value="filling">Filling</SelectItem>
                          <SelectItem value="kemasan">Kemasan</SelectItem>
                          <SelectItem value="lainnya">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Bahan</label>
                      <ComboboxBahan
                        bahan={bahanCombobox}
                        value={item.bahanId}
                        onChange={(id) => {
                          form.setValue(`komponen.${index}.bahanId`, id, { shouldDirty: true });
                          form.setValue(`komponen.${index}.konversiSatuanId`, null, {
                            shouldDirty: true,
                          });
                        }}
                        invalid={Boolean(errors && 'bahanId' in errors && errors.bahanId)}
                      />
                      {pesan(errors && 'bahanId' in errors ? errors.bahanId : undefined)}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`takaran-${field.id}`} className="text-sm font-medium">
                        Takaran
                      </label>
                      <Input
                        id={`takaran-${field.id}`}
                        className="h-11"
                        inputMode="decimal"
                        {...form.register(`komponen.${index}.takaran`)}
                      />
                      {pesan(errors && 'takaran' in errors ? errors.takaran : undefined)}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Satuan</label>
                      {(() => {
                        const info = bahan.find((b) => b.id === item.bahanId);
                        const satuan = info
                          ? [
                              { value: null, label: info.satuanDasar },
                              ...info.konversi.map((k) => ({
                                value: k.id,
                                label: k.namaSatuan ?? k.id,
                              })),
                            ]
                          : [];
                        return (
                          <Select
                            items={satuan}
                            value={item.konversiSatuanId}
                            onValueChange={(value) =>
                              form.setValue(`komponen.${index}.konversiSatuanId`, value ?? null, {
                                shouldDirty: true,
                              })
                            }
                            disabled={!info}
                          >
                            <SelectTrigger className="h-11! w-full">
                              <SelectValue placeholder="Satuan" />
                            </SelectTrigger>
                            <SelectContent>
                              {satuan.map((s) => (
                                <SelectItem key={s.value ?? 'dasar'} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <aside className="bg-background fixed inset-x-4 bottom-20 z-20 rounded-xl border p-4 shadow-lg lg:sticky lg:inset-auto lg:top-20 lg:self-start lg:shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">Pratinjau HPP</h2>
          <Badge variant={pratinjau.diBawahTarget ? 'destructive' : 'secondary'}>
            {pratinjau.diBawahTarget ? 'Di bawah target' : 'Margin aman'}
          </Badge>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">HPP/pcs</dt>
          <dd className="text-right font-medium tabular-nums">
            {formatRupiah(pratinjau.rincian.hpp)}
          </dd>
          <dt className="text-muted-foreground">Margin</dt>
          <dd className="text-right font-medium tabular-nums">
            {formatRupiah(pratinjau.marginRp)}
          </dd>
          <dt className="text-muted-foreground">Margin %</dt>
          <dd className="text-right font-medium tabular-nums">
            {pratinjau.marginPersen ? `${formatAngka(pratinjau.marginPersen.times(100), 2)}%` : '—'}
          </dd>
        </dl>
        {pratinjau.rincian.peringatan.length > 0 ? (
          <div className="mt-3 flex max-h-16 flex-col gap-1 overflow-y-auto text-xs text-amber-800 dark:text-amber-200">
            {pratinjau.rincian.peringatan.map((item) => (
              <p key={item} className="flex gap-1.5">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {item}
              </p>
            ))}
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {error}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={pending}
            nativeButton={false}
            render={<Link href={produk ? `/produk/${produk.id}` : '/produk'} />}
          >
            <ArrowLeft /> Batal
          </Button>
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null} Simpan
          </Button>
        </div>
      </aside>
    </form>
  );
}
