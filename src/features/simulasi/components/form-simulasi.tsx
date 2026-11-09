'use client';

import { ArrowRight, Calculator, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ComboboxBahan } from '@/features/resep/components/combobox-bahan';
import { D } from '@/lib/angka';
import { formatAngka, formatRupiah, formatRupiahDesimal } from '@/lib/format';

import { type HasilSimulasiHarga, simulasikanHargaBahan } from '../actions';
import { ringkasanSimulasi } from '../format';
import type { PilihanBahanSimulasi } from '../queries';

type Baris = { kunci: number; bahanId: string; persen: string };

function margin(nilai: string | null): string {
  return nilai === null ? '–' : `${formatAngka(D(nilai).times(100), 2)}%`;
}

function selisih(nilai: string): string {
  const angka = D(nilai);
  const teks = formatRupiahDesimal(angka, 2);
  return angka.gt(0) ? `+${teks}` : teks;
}

function HasilKartu({ hasil }: { hasil: HasilSimulasiHarga }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {hasil.produk.map((item) => (
        <li key={item.produkId} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium">{item.nama}</h3>
            <Badge
              variant={item.diBawahTarget ? 'destructive' : 'secondary'}
              className={item.diBawahTarget ? 'bg-destructive/10 text-destructive' : ''}
            >
              {item.diBawahTarget ? 'Di bawah target' : 'Margin aman'}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">HPP</dt>
            <dd className="flex flex-wrap items-center justify-end gap-1 text-right font-medium tabular-nums">
              {formatRupiahDesimal(item.hppLama)}
              <ArrowRight className="text-muted-foreground size-3.5" aria-label="menjadi" />
              {formatRupiahDesimal(item.hppBaru)}
              <span className="text-muted-foreground">({selisih(item.selisih)})</span>
            </dd>
            <dt className="text-muted-foreground">Margin</dt>
            <dd className="flex items-center justify-end gap-1 text-right font-medium tabular-nums">
              {margin(item.marginLama)}
              <ArrowRight className="text-muted-foreground size-3.5" aria-label="menjadi" />
              {margin(item.marginBaru)}
            </dd>
            <dt className="text-muted-foreground">Saran harga baru</dt>
            <dd className="text-right font-medium tabular-nums">{formatRupiah(item.saranHarga)}</dd>
          </dl>
          <Button
            variant="outline"
            className="h-10"
            nativeButton={false}
            render={<Link href={`/produk/${item.produkId}`} />}
          >
            Lihat produk
          </Button>
        </li>
      ))}
    </ul>
  );
}

function HasilTabel({ hasil }: { hasil: HasilSimulasiHarga }) {
  return (
    <div className="hidden rounded-xl border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produk</TableHead>
            <TableHead className="text-right">HPP lama → baru</TableHead>
            <TableHead className="text-right">Selisih</TableHead>
            <TableHead className="text-right">Margin lama → baru</TableHead>
            <TableHead className="text-right">Saran harga</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasil.produk.map((item) => (
            <TableRow key={item.produkId}>
              <TableCell className="font-medium">{item.nama}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRupiahDesimal(item.hppLama)} → {formatRupiahDesimal(item.hppBaru)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{selisih(item.selisih)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {margin(item.marginLama)} → {margin(item.marginBaru)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatRupiah(item.saranHarga)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={item.diBawahTarget ? 'destructive' : 'secondary'}
                  className={item.diBawahTarget ? 'bg-destructive/10 text-destructive' : ''}
                >
                  {item.diBawahTarget ? 'Di bawah target' : 'Margin aman'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  className="h-9"
                  nativeButton={false}
                  render={<Link href={`/produk/${item.produkId}`} />}
                >
                  Lihat
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function FormSimulasi({
  bahan,
  bahanAwalId,
}: {
  bahan: PilihanBahanSimulasi[];
  bahanAwalId?: string;
}) {
  const kunciBerikutnya = useRef(2);
  const [baris, setBaris] = useState<Baris[]>([
    { kunci: 1, bahanId: bahanAwalId ?? '', persen: '10' },
  ]);
  const [hasil, setHasil] = useState<HasilSimulasiHarga | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bahanCombobox = bahan.map((item) => ({ ...item, konversi: [] }));

  function ubah(index: number, data: Partial<Pick<Baris, 'bahanId' | 'persen'>>) {
    setBaris((lama) => lama.map((item, i) => (i === index ? { ...item, ...data } : item)));
    setHasil(null);
    setError(null);
    setErrors({});
  }

  function tambah() {
    setBaris((lama) => [...lama, { kunci: kunciBerikutnya.current++, bahanId: '', persen: '10' }]);
    setHasil(null);
  }

  function hapus(index: number) {
    setBaris((lama) => lama.filter((_, i) => i !== index));
    setHasil(null);
    setErrors({});
  }

  function kirim(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const respons = await simulasikanHargaBahan({
        perubahan: baris.map(({ bahanId, persen }) => ({ bahanId, persen })),
      });
      if (!respons.ok) {
        setHasil(null);
        setErrors(respons.fieldErrors ?? {});
        if (!respons.fieldErrors) setError(respons.error);
        return;
      }
      setErrors({});
      setHasil(respons.data);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={kirim}
        className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6"
        noValidate
      >
        <div className="flex flex-col gap-3">
          {baris.map((item, index) => (
            <div
              key={item.kunci}
              className="bg-muted/40 grid gap-3 rounded-xl p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-start"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Bahan</span>
                <ComboboxBahan
                  bahan={bahanCombobox}
                  value={item.bahanId}
                  onChange={(bahanId) => ubah(index, { bahanId })}
                  invalid={Boolean(errors[`perubahan.${index}.bahanId`])}
                />
                {errors[`perubahan.${index}.bahanId`]?.[0] ? (
                  <p className="text-destructive text-sm">
                    {errors[`perubahan.${index}.bahanId`]?.[0]}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`persen-${item.kunci}`} className="text-sm font-medium">
                  Perubahan
                </label>
                <InputGroup className="h-11">
                  <InputGroupInput
                    id={`persen-${item.kunci}`}
                    inputMode="decimal"
                    className="tabular-nums"
                    value={item.persen}
                    onChange={(event) => ubah(index, { persen: event.target.value })}
                    aria-invalid={Boolean(errors[`perubahan.${index}.persen`])}
                  />
                  <InputGroupAddon align="inline-end">%</InputGroupAddon>
                </InputGroup>
                {errors[`perubahan.${index}.persen`]?.[0] ? (
                  <p className="text-destructive text-sm">
                    {errors[`perubahan.${index}.persen`]?.[0]}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6 hidden size-11 sm:inline-flex"
                aria-label={`Hapus baris ${index + 1}`}
                disabled={baris.length === 1}
                onClick={() => hapus(index)}
              >
                <Trash2 />
              </Button>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                {[5, 10, 20].map((persen) => (
                  <Button
                    key={persen}
                    type="button"
                    variant={item.persen === String(persen) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => ubah(index, { persen: String(persen) })}
                  >
                    +{persen}%
                  </Button>
                ))}
                {baris.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive sm:hidden"
                    onClick={() => hapus(index)}
                  >
                    <Trash2 /> Hapus
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {errors.perubahan?.[0] ? (
          <p className="text-destructive text-sm">{errors.perubahan[0]}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Isi −50% sampai +200%. Simulasi tidak mengubah harga bahan maupun produk.
        </p>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={baris.length >= 20 || pending}
            onClick={tambah}
          >
            <Plus /> Tambah bahan
          </Button>
          <Button type="submit" className="h-11" disabled={pending || bahan.length === 0}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Calculator />}
            Hitung
          </Button>
        </div>
      </form>

      {hasil ? (
        <section className="flex flex-col gap-4" aria-live="polite">
          <div>
            <h2 className="text-lg font-semibold">Hasil simulasi</h2>
            <p className="text-muted-foreground text-sm">
              {ringkasanSimulasi(hasil.jumlahProduk, hasil.jumlahDiBawahTarget)}
            </p>
          </div>
          {hasil.produk.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
              Tidak ada HPP produk aktif yang berubah.
            </div>
          ) : (
            <>
              <HasilKartu hasil={hasil} />
              <HasilTabel hasil={hasil} />
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
