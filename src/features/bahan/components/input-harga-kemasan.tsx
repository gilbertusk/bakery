'use client';

import { useId } from 'react';

import { InputRupiah } from '@/components/input-rupiah';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SatuanDasar } from '@/db/schema/enums';
import { type SatuanKemasan, satuanKemasanUntuk } from '@/lib/hpp/konversi';

import { pratinjauHarga } from '../harga';

export type NilaiKemasan = {
  jumlahKemasan: string;
  satuanKemasan: SatuanKemasan;
  totalHarga: number | null;
};

export type ErrorKemasan = Partial<Record<keyof NilaiKemasan, string>>;

export function kemasanAwal(satuanDasar: SatuanDasar): NilaiKemasan {
  return {
    jumlahKemasan: '1',
    satuanKemasan: satuanKemasanUntuk(satuanDasar)[0]!,
    totalHarga: null,
  };
}

type Props = {
  satuanDasar: SatuanDasar;
  value: NilaiKemasan;
  onChange: (nilai: NilaiKemasan) => void;
  error?: ErrorKemasan;
  disabled?: boolean;
};

/** "Isi [1] [kg ▾] seharga Rp[15.000]" dengan pratinjau langsung "= Rp15/g". */
export function InputHargaKemasan({ satuanDasar, value, onChange, error = {}, disabled }: Props) {
  const id = useId();
  const pilihan = satuanKemasanUntuk(satuanDasar);
  const pratinjau = pratinjauHarga(value, satuanDasar);
  const pesanError = [error.jumlahKemasan, error.satuanKemasan, error.totalHarga].filter(Boolean);
  const idError = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-jumlah`} className="text-sm">
          Isi
        </label>
        <Input
          id={`${id}-jumlah`}
          inputMode="decimal"
          autoComplete="off"
          className="h-11 w-24 tabular-nums"
          value={value.jumlahKemasan}
          onChange={(e) => onChange({ ...value, jumlahKemasan: e.target.value })}
          aria-invalid={Boolean(error.jumlahKemasan)}
          aria-describedby={pesanError.length > 0 ? idError : undefined}
          disabled={disabled}
        />
        <Select
          items={Object.fromEntries(pilihan.map((s) => [s, s]))}
          value={value.satuanKemasan}
          onValueChange={(satuan) => {
            if (satuan) onChange({ ...value, satuanKemasan: satuan as SatuanKemasan });
          }}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-11! w-24"
            aria-label="Satuan kemasan"
            aria-invalid={Boolean(error.satuanKemasan)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pilihan.map((satuan) => (
              <SelectItem key={satuan} value={satuan}>
                {satuan}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-harga`} className="shrink-0 text-sm">
          seharga
        </label>
        <InputRupiah
          id={`${id}-harga`}
          className="flex-1"
          value={value.totalHarga}
          onChange={(totalHarga) => onChange({ ...value, totalHarga })}
          aria-invalid={Boolean(error.totalHarga)}
          aria-describedby={pesanError.length > 0 ? idError : undefined}
          disabled={disabled}
        />
      </div>
      <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
        {pratinjau ? (
          <>
            = <span className="text-foreground font-medium">{pratinjau}</span>
          </>
        ) : (
          `Harga per ${satuanDasar} muncul setelah isian lengkap`
        )}
      </p>
      {pesanError.length > 0 ? (
        <div id={idError} className="text-destructive flex flex-col gap-0.5 text-sm">
          {pesanError.map((pesan) => (
            <p key={pesan}>{pesan}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
