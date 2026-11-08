'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { type Path, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { SatuanDasar } from '@/db/schema/enums';
import { satuanKemasanUntuk } from '@/lib/hpp/konversi';
import { cn } from '@/lib/utils';
import '@/lib/zod-id';

import { buatBahan, ubahBahan } from '../actions';
import {
  type BuatBahanData,
  KATEGORI_BAHAN,
  SATUAN_DASAR,
  buatBahanSchema,
  ubahBahanSchema,
} from '../schemas';
import { InputHargaKemasan, type NilaiKemasan, kemasanAwal } from './input-harga-kemasan';

export const LABEL_SATUAN: Record<SatuanDasar, string> = {
  g: 'gram (g)',
  ml: 'mililiter (ml)',
  pcs: 'pcs (butir/buah)',
};

const PESAN_TERKUNCI =
  'Satuan dasar terkunci karena bahan sudah punya mutasi stok atau dipakai resep.';

type NilaiForm = {
  nama: string;
  kategori: string;
  satuanDasar: SatuanDasar;
  stokMinimal: string;
  supplierUtamaId: string | null;
  isiHarga: boolean;
  hargaAwal: NilaiKemasan;
  stokAwal: string;
};

type DataForm = Omit<BuatBahanData, 'hargaAwal' | 'stokAwal'> &
  Partial<Pick<BuatBahanData, 'hargaAwal' | 'stokAwal'>>;

const schemaBuat = z.preprocess((nilai) => {
  const form = nilai as NilaiForm;
  return { ...form, hargaAwal: form.isiHarga ? form.hargaAwal : null };
}, buatBahanSchema);
const schemaUbah = ubahBahanSchema.omit({ id: true });

const resolverBuat = zodResolver(
  schemaBuat as unknown as z.ZodType<DataForm, NilaiForm>,
) as unknown as Resolver<NilaiForm, unknown, DataForm>;
const resolverUbah = zodResolver(schemaUbah) as unknown as Resolver<NilaiForm, unknown, DataForm>;

const FIELD_FORM = new Set<string>([
  'nama',
  'kategori',
  'satuanDasar',
  'stokMinimal',
  'supplierUtamaId',
  'stokAwal',
  'hargaAwal.jumlahKemasan',
  'hargaAwal.satuanKemasan',
  'hargaAwal.totalHarga',
]);

export type PilihanSupplier = { id: string; nama: string };

export type BahanAwal = {
  id: string;
  nama: string;
  kategori: string;
  satuanDasar: SatuanDasar;
  stokMinimal: string;
  supplierUtamaId: string | null;
  terkunci: boolean;
};

type Props = {
  suppliers: PilihanSupplier[];
  /** Kosong = bahan baru. */
  bahan?: BahanAwal;
};

export function FormBahan({ suppliers, bahan }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const terkunci = bahan?.terkunci ?? false;

  const form = useForm<NilaiForm, unknown, DataForm>({
    resolver: bahan ? resolverUbah : resolverBuat,
    defaultValues: {
      nama: bahan?.nama ?? '',
      kategori: bahan?.kategori ?? '',
      satuanDasar: bahan?.satuanDasar ?? 'g',
      stokMinimal: bahan ? String(Number(bahan.stokMinimal)) : '',
      supplierUtamaId: bahan?.supplierUtamaId ?? null,
      isiHarga: false,
      hargaAwal: kemasanAwal(bahan?.satuanDasar ?? 'g'),
      stokAwal: '',
    },
  });

  const satuan = useWatch({ control: form.control, name: 'satuanDasar' });
  const isiHarga = useWatch({ control: form.control, name: 'isiHarga' });
  const kategori = useWatch({ control: form.control, name: 'kategori' });
  const errorHarga = form.formState.errors.hargaAwal;

  function onSubmit(values: DataForm) {
    setError(null);
    startTransition(async () => {
      const hasil = bahan ? await ubahBahan({ id: bahan.id, ...values }) : await buatBahan(values);

      if (!hasil.ok) {
        setError(hasil.error);
        for (const [field, pesan] of Object.entries(hasil.fieldErrors ?? {})) {
          if (FIELD_FORM.has(field)) form.setError(field as Path<NilaiForm>, { message: pesan[0] });
        }
        return;
      }

      if (bahan) {
        toast.success('Bahan diperbarui');
        form.reset(form.getValues());
      } else {
        toast.success('Bahan ditambahkan');
        router.push(`/bahan/${hasil.data.id}`);
      }
    });
  }

  const pilihanSupplier: { value: string | null; label: string }[] = [
    { value: null, label: 'Tanpa supplier' },
    ...suppliers.map((s) => ({ value: s.id, label: s.nama })),
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <FormField
          control={form.control}
          name="nama"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama bahan</FormLabel>
              <FormControl>
                <Input className="h-11" autoComplete="off" placeholder="Tepung Terigu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="kategori"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategori</FormLabel>
              <FormControl>
                <Input className="h-11" autoComplete="off" placeholder="tepung" {...field} />
              </FormControl>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saran kategori">
                {KATEGORI_BAHAN.map((saran) => (
                  <Button
                    key={saran}
                    type="button"
                    size="sm"
                    variant={kategori.trim().toLowerCase() === saran ? 'default' : 'outline'}
                    className="h-8 rounded-full"
                    onClick={() =>
                      form.setValue('kategori', saran, { shouldDirty: true, shouldValidate: true })
                    }
                  >
                    {saran}
                  </Button>
                ))}
              </div>
              <FormDescription>Pilih saran atau ketik kategori sendiri.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="satuanDasar"
          render={({ field }) => {
            const pemilih = (
              <Select
                items={LABEL_SATUAN}
                value={field.value}
                onValueChange={(nilai) => {
                  if (!nilai) return;
                  const baru = nilai as SatuanDasar;
                  field.onChange(baru);
                  form.setValue('hargaAwal.satuanKemasan', satuanKemasanUntuk(baru)[0]!);
                }}
                disabled={terkunci}
              >
                <FormControl>
                  <SelectTrigger className="h-11! w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SATUAN_DASAR.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LABEL_SATUAN[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
            return (
              <FormItem>
                <FormLabel>Satuan dasar</FormLabel>
                {terkunci ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={<span className="w-full cursor-not-allowed sm:w-64" tabIndex={0} />}
                    >
                      {pemilih}
                    </TooltipTrigger>
                    <TooltipContent>{PESAN_TERKUNCI}</TooltipContent>
                  </Tooltip>
                ) : (
                  pemilih
                )}
                <FormDescription className={cn(terkunci && 'flex items-start gap-1.5')}>
                  {terkunci ? (
                    <>
                      <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {PESAN_TERKUNCI}
                    </>
                  ) : (
                    'Satuan untuk stok, harga, dan takaran resep. Terkunci setelah bahan dipakai.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="stokMinimal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stok minimal (opsional)</FormLabel>
                <InputGroup className="h-11">
                  <FormControl>
                    <InputGroupInput
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      className="tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <InputGroupAddon align="inline-end">{satuan}</InputGroupAddon>
                </InputGroup>
                <FormDescription>Bahan ditandai menipis bila stok ≤ angka ini.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplierUtamaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier utama (opsional)</FormLabel>
                <Select
                  items={pilihanSupplier}
                  value={field.value}
                  onValueChange={(nilai) => field.onChange(nilai ?? null)}
                >
                  <FormControl>
                    <SelectTrigger className="h-11! w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {pilihanSupplier.map((p) => (
                      <SelectItem key={p.value ?? 'kosong'} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {bahan ? null : (
          <>
            <div className="flex flex-col gap-3 rounded-xl border p-4">
              <FormField
                control={form.control}
                name="isiHarga"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <FormLabel>Isi harga awal</FormLabel>
                      <FormDescription>
                        Bisa dilewati; harga juga diperbarui otomatis saat pembelian.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {isiHarga ? (
                <FormField
                  control={form.control}
                  name="hargaAwal"
                  render={({ field }) => (
                    <InputHargaKemasan
                      satuanDasar={satuan}
                      value={field.value}
                      onChange={field.onChange}
                      error={{
                        jumlahKemasan: errorHarga?.jumlahKemasan?.message,
                        satuanKemasan: errorHarga?.satuanKemasan?.message,
                        totalHarga: errorHarga?.totalHarga?.message,
                      }}
                    />
                  )}
                />
              ) : null}
            </div>

            <FormField
              control={form.control}
              name="stokAwal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stok awal (opsional)</FormLabel>
                  <InputGroup className="h-11 sm:w-64">
                    <FormControl>
                      <InputGroupInput
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0"
                        className="tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <InputGroupAddon align="inline-end">{satuan}</InputGroupAddon>
                  </InputGroup>
                  <FormDescription>Stok yang ada sekarang, dicatat di kartu stok.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {bahan ? null : (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => router.push('/bahan')}
            >
              Batal
            </Button>
          )}
          <Button
            type="submit"
            className="h-11"
            disabled={pending || (bahan !== undefined && !form.formState.isDirty)}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {bahan ? 'Simpan perubahan' : 'Simpan bahan'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
