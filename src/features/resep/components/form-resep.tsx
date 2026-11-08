'use client';

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  LoaderCircle,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';
import { type Path, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatAngka, formatRupiah, formatRupiahDesimal } from '@/lib/format';
import '@/lib/zod-id';

import { simpanResep } from '../actions';
import { hitungRingkasanForm, type ItemFormHitung } from '../hitung-form';
import { resepSchema } from '../schemas';
import { ComboboxBahan, type BahanFormResep } from './combobox-bahan';

type NilaiForm = {
  nama: string;
  modeHasil: 'otomatis' | 'timbang';
  hasilGram: string;
  caraBuat: string;
  bentukLoyang: 'bulat' | 'kotak';
  diameterCm: string;
  panjangCm: string;
  lebarCm: string;
  items: { bahanId: string; takaran: string; konversiSatuanId: string | null }[];
};

export type ResepAwalForm = {
  id: string;
  nama: string;
  modeHasil: 'otomatis' | 'timbang';
  hasilGram: string;
  caraBuat: string | null;
  bentukLoyang: 'bulat' | 'kotak' | null;
  diameterCm: string | null;
  panjangCm: string | null;
  lebarCm: string | null;
  items: { bahanId: string; takaran: string; konversiSatuanId: string | null }[];
};

function pesan(error: { message?: string } | undefined) {
  return error?.message ? <p className="text-destructive text-sm">{error.message}</p> : null;
}

function inputHitung(
  item: NilaiForm['items'][number] | undefined,
  bahan: BahanFormResep[],
): ItemFormHitung | null {
  if (!item) return null;
  const info = bahan.find((pilihan) => pilihan.id === item.bahanId);
  if (!info) return null;
  const konversi = item.konversiSatuanId
    ? info.konversi.find((pilihan) => pilihan.id === item.konversiSatuanId)
    : null;
  return {
    namaBahan: info.nama,
    satuanDasar: info.satuanDasar,
    takaran: item.takaran,
    nilaiKonversi: konversi?.nilaiDasar ?? null,
    hargaPerSatuan: info.hargaPerSatuan,
  };
}

export function FormResep({ bahan, resep }: { bahan: BahanFormResep[]; resep?: ResepAwalForm }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pakaiLoyang, setPakaiLoyang] = useState(Boolean(resep?.bentukLoyang));
  const form = useForm<NilaiForm>({
    defaultValues: {
      nama: resep?.nama ?? '',
      modeHasil: resep?.modeHasil ?? 'otomatis',
      hasilGram: resep ? formatAngka(resep.hasilGram, 3) : '',
      caraBuat: resep?.caraBuat ?? '',
      bentukLoyang: resep?.bentukLoyang ?? 'kotak',
      diameterCm: resep?.diameterCm ? formatAngka(resep.diameterCm, 2) : '',
      panjangCm: resep?.panjangCm ? formatAngka(resep.panjangCm, 2) : '',
      lebarCm: resep?.lebarCm ? formatAngka(resep.lebarCm, 2) : '',
      items: resep?.items.map((item) => ({ ...item, takaran: formatAngka(item.takaran, 3) })) ?? [
        { bahanId: '', takaran: '', konversiSatuanId: null },
      ],
    },
  });
  const { fields, append, remove, swap } = useFieldArray({ control: form.control, name: 'items' });
  const items = useWatch({ control: form.control, name: 'items' });
  const modeHasil = useWatch({ control: form.control, name: 'modeHasil' });
  const hasilGram = useWatch({ control: form.control, name: 'hasilGram' });
  const bentukLoyang = useWatch({ control: form.control, name: 'bentukLoyang' });
  const inputRingkasan = items.flatMap((item) => {
    const input = inputHitung(item, bahan);
    return input ? [input] : [];
  });
  const ringkasan = hitungRingkasanForm({
    modeHasil,
    hasilGram: hasilGram || null,
    items: inputRingkasan,
  });

  function pathForm(path: string): Path<NilaiForm> {
    return (path.startsWith('loyang.') ? path.slice('loyang.'.length) : path) as Path<NilaiForm>;
  }

  function terapkanError(fieldErrors: Record<string, string[]> | undefined) {
    for (const [field, daftarPesan] of Object.entries(fieldErrors ?? {})) {
      form.setError(pathForm(field), { message: daftarPesan[0] });
    }
  }

  function simpan(e: FormEvent) {
    e.preventDefault();
    form.clearErrors();
    setError(null);
    const mentah = form.getValues();
    const hasil = resepSchema.safeParse({
      nama: mentah.nama,
      modeHasil: mentah.modeHasil,
      hasilGram: mentah.modeHasil === 'timbang' ? mentah.hasilGram : null,
      caraBuat: mentah.caraBuat,
      loyang: pakaiLoyang
        ? mentah.bentukLoyang === 'bulat'
          ? { bentuk: 'bulat', diameterCm: mentah.diameterCm }
          : { bentuk: 'kotak', panjangCm: mentah.panjangCm, lebarCm: mentah.lebarCm }
        : null,
      items: mentah.items,
    });
    if (!hasil.success) {
      for (const issue of hasil.error.issues) {
        form.setError(pathForm(issue.path.join('.')), { message: issue.message });
      }
      return;
    }

    startTransition(async () => {
      const disimpan = await simpanResep({ id: resep?.id ?? null, ...hasil.data });
      if (!disimpan.ok) {
        terapkanError(disimpan.fieldErrors);
        if (!disimpan.fieldErrors || Object.keys(disimpan.fieldErrors).length === 0) {
          setError(disimpan.error);
        }
        return;
      }
      toast.success(resep ? 'Resep diperbarui' : 'Resep ditambahkan');
      for (const peringatan of disimpan.data.peringatan) toast.warning(peringatan);
      router.push(`/resep/${disimpan.data.id}`);
    });
  }

  return (
    <form
      onSubmit={simpan}
      className="grid gap-5 pb-60 lg:grid-cols-[minmax(0,1fr)_19rem] lg:pb-0"
      noValidate
    >
      <div className="flex min-w-0 flex-col gap-5">
        <section className="flex flex-col gap-5 rounded-xl border p-4 sm:p-6">
          <div>
            <h2 className="font-medium">Info resep</h2>
            <p className="text-muted-foreground text-sm">Nama, hasil adonan, dan cara membuat.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nama-resep" className="text-sm font-medium">
              Nama resep
            </label>
            <Input
              id="nama-resep"
              className="h-11"
              autoComplete="off"
              {...form.register('nama')}
              aria-invalid={Boolean(form.formState.errors.nama)}
            />
            {pesan(form.formState.errors.nama)}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Mode hasil</p>
            <RadioGroup
              value={modeHasil}
              onValueChange={(nilai) =>
                form.setValue('modeHasil', nilai as NilaiForm['modeHasil'], { shouldDirty: true })
              }
              className="grid gap-2 sm:grid-cols-2"
            >
              <label className="has-data-checked:border-primary flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                <RadioGroupItem value="otomatis" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Otomatis</span>
                  <span className="text-muted-foreground text-sm">Jumlah bahan g dan ml.</span>
                </span>
              </label>
              <label className="has-data-checked:border-primary flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                <RadioGroupItem value="timbang" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Ditimbang</span>
                  <span className="text-muted-foreground text-sm">
                    Masukkan hasil akhir setelah proses.
                  </span>
                </span>
              </label>
            </RadioGroup>
            {pesan(form.formState.errors.modeHasil)}
          </div>

          {modeHasil === 'timbang' ? (
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <label htmlFor="hasil-gram" className="text-sm font-medium">
                Hasil adonan
              </label>
              <InputGroup className="h-11">
                <InputGroupInput
                  id="hasil-gram"
                  inputMode="decimal"
                  autoComplete="off"
                  {...form.register('hasilGram')}
                  aria-invalid={Boolean(form.formState.errors.hasilGram)}
                />
                <InputGroupAddon align="inline-end">g</InputGroupAddon>
              </InputGroup>
              {pesan(form.formState.errors.hasilGram)}
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cara-buat" className="text-sm font-medium">
              Cara membuat (opsional)
            </label>
            <Textarea
              id="cara-buat"
              rows={6}
              placeholder="1. Campur bahan…"
              {...form.register('caraBuat')}
              aria-invalid={Boolean(form.formState.errors.caraBuat)}
            />
            {pesan(form.formState.errors.caraBuat)}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium">Bahan</h2>
              <p className="text-muted-foreground text-sm">
                Urutan di sini menjadi urutan langkah resep.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => append({ bahanId: '', takaran: '', konversiSatuanId: null })}
            >
              <Plus /> Tambah
            </Button>
          </div>
          {pesan(form.formState.errors.items as { message?: string } | undefined)}

          <div className="flex flex-col gap-3">
            {fields.map((field, index) => {
              const item = items[index];
              const info = bahan.find((pilihan) => pilihan.id === item?.bahanId);
              const satuanItems = info
                ? [
                    { value: null, label: info.satuanDasar },
                    ...info.konversi.map((k) => ({ value: k.id, label: k.namaSatuan })),
                  ]
                : [];
              const hitungInput = inputHitung(item, bahan);
              const pratinjau = hitungInput
                ? hitungRingkasanForm({
                    modeHasil: 'timbang',
                    hasilGram: '1',
                    items: [hitungInput],
                  }).items[0]
                : null;
              const errors = form.formState.errors.items?.[index];
              return (
                <div key={field.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-sm font-medium">
                      Bahan {index + 1}
                    </span>
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        disabled={index === 0}
                        onClick={() => swap(index, index - 1)}
                        aria-label={`Naikkan bahan ${index + 1}`}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        disabled={index === fields.length - 1}
                        onClick={() => swap(index, index + 1)}
                        aria-label={`Turunkan bahan ${index + 1}`}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-9"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                        aria-label={`Hapus bahan ${index + 1}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem]">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Bahan</label>
                      <ComboboxBahan
                        bahan={bahan}
                        value={item?.bahanId ?? ''}
                        invalid={Boolean(errors?.bahanId)}
                        onChange={(id) => {
                          form.setValue(`items.${index}.bahanId`, id, {
                            shouldDirty: true,
                            shouldValidate: false,
                          });
                          form.setValue(`items.${index}.konversiSatuanId`, null, {
                            shouldDirty: true,
                          });
                          form.clearErrors(`items.${index}.bahanId`);
                        }}
                      />
                      {pesan(errors?.bahanId)}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`takaran-${field.id}`} className="text-sm font-medium">
                        Takaran
                      </label>
                      <Input
                        id={`takaran-${field.id}`}
                        className="h-11 tabular-nums"
                        inputMode="decimal"
                        autoComplete="off"
                        {...form.register(`items.${index}.takaran`)}
                        aria-invalid={Boolean(errors?.takaran)}
                      />
                      {pesan(errors?.takaran)}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Satuan</label>
                      <Select
                        items={satuanItems}
                        value={item?.konversiSatuanId ?? null}
                        onValueChange={(nilai) =>
                          form.setValue(`items.${index}.konversiSatuanId`, nilai ?? null, {
                            shouldDirty: true,
                          })
                        }
                        disabled={!info}
                      >
                        <SelectTrigger
                          className="h-11! w-full"
                          aria-invalid={Boolean(errors?.konversiSatuanId)}
                        >
                          <SelectValue placeholder="Satuan" />
                        </SelectTrigger>
                        <SelectContent>
                          {satuanItems.map((satuan) => (
                            <SelectItem key={satuan.value ?? 'dasar'} value={satuan.value}>
                              {satuan.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {pesan(errors?.konversiSatuanId)}
                    </div>
                  </div>
                  {info?.aktif === false ? (
                    <Badge variant="secondary" className="self-start">
                      Bahan nonaktif
                    </Badge>
                  ) : null}
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {pratinjau
                      ? `= ${formatAngka(pratinjau.takaranDasar)} ${info?.satuanDasar} · ${formatRupiah(pratinjau.biaya)}`
                      : 'Lengkapi bahan dan takaran untuk melihat biaya.'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <details
          open={pakaiLoyang}
          onToggle={(e) => setPakaiLoyang(e.currentTarget.open)}
          className="group rounded-xl border p-4 sm:p-6"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium">
            Loyang acuan (opsional)
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <Select
              items={{ kotak: 'Kotak', bulat: 'Bulat' }}
              value={form.getValues('bentukLoyang')}
              onValueChange={(nilai) =>
                nilai &&
                form.setValue('bentukLoyang', nilai as 'bulat' | 'kotak', { shouldDirty: true })
              }
            >
              <SelectTrigger className="h-11! w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kotak">Kotak</SelectItem>
                <SelectItem value="bulat">Bulat</SelectItem>
              </SelectContent>
            </Select>
            {bentukLoyang === 'bulat' ? (
              <div className="sm:max-w-xs">
                <label htmlFor="diameter" className="mb-1.5 block text-sm font-medium">
                  Diameter
                </label>
                <InputGroup className="h-11">
                  <InputGroupInput
                    id="diameter"
                    inputMode="decimal"
                    {...form.register('diameterCm')}
                    aria-invalid={Boolean(form.formState.errors.diameterCm)}
                  />
                  <InputGroupAddon align="inline-end">cm</InputGroupAddon>
                </InputGroup>
                {pesan(form.formState.errors.diameterCm)}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="panjang" className="mb-1.5 block text-sm font-medium">
                    Panjang
                  </label>
                  <InputGroup className="h-11">
                    <InputGroupInput
                      id="panjang"
                      inputMode="decimal"
                      {...form.register('panjangCm')}
                      aria-invalid={Boolean(form.formState.errors.panjangCm)}
                    />
                    <InputGroupAddon align="inline-end">cm</InputGroupAddon>
                  </InputGroup>
                  {pesan(form.formState.errors.panjangCm)}
                </div>
                <div>
                  <label htmlFor="lebar" className="mb-1.5 block text-sm font-medium">
                    Lebar
                  </label>
                  <InputGroup className="h-11">
                    <InputGroupInput
                      id="lebar"
                      inputMode="decimal"
                      {...form.register('lebarCm')}
                      aria-invalid={Boolean(form.formState.errors.lebarCm)}
                    />
                    <InputGroupAddon align="inline-end">cm</InputGroupAddon>
                  </InputGroup>
                  {pesan(form.formState.errors.lebarCm)}
                </div>
              </div>
            )}
          </div>
        </details>
      </div>

      <aside className="bg-background fixed inset-x-4 bottom-20 z-20 rounded-xl border p-4 shadow-lg lg:sticky lg:inset-auto lg:top-20 lg:self-start lg:shadow-sm">
        <h2 className="font-medium">Ringkasan</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Total bahan</dt>
          <dd className="text-right font-medium">{inputRingkasan.length}</dd>
          <dt className="text-muted-foreground">Hasil adonan</dt>
          <dd className="text-right font-medium tabular-nums">
            {ringkasan.hasilGram ? `${formatAngka(ringkasan.hasilGram)} g` : '—'}
          </dd>
          <dt className="text-muted-foreground">Biaya total</dt>
          <dd className="text-right font-medium tabular-nums">
            {formatRupiah(ringkasan.biayaTotal)}
          </dd>
          <dt className="text-muted-foreground">Biaya/gram</dt>
          <dd className="text-right font-medium tabular-nums">
            {ringkasan.biayaPerGram ? formatRupiahDesimal(ringkasan.biayaPerGram) : '—'}
          </dd>
        </dl>
        {ringkasan.peringatan.length > 0 ? (
          <div className="mt-3 flex max-h-20 flex-col gap-1 overflow-y-auto text-xs text-amber-800 dark:text-amber-200">
            {ringkasan.peringatan.map((item) => (
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
            render={<Link href={resep ? `/resep/${resep.id}` : '/resep'} />}
          >
            <ArrowLeft /> Batal
          </Button>
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}Simpan
          </Button>
        </div>
      </aside>
    </form>
  );
}
