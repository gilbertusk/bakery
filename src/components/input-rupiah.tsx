'use client';

import type { ComponentProps } from 'react';

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { formatRibuan, parseKetikanRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

type InputRupiahProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: number | null;
  onChange: (nilai: number | null) => void;
};

/** Input rupiah integer: titik ribuan muncul saat mengetik, nilai keluar sebagai number. */
export function InputRupiah({ value, onChange, className, ...props }: InputRupiahProps) {
  return (
    <InputGroup className={cn('h-11', className)}>
      <InputGroupAddon>Rp</InputGroupAddon>
      <InputGroupInput
        inputMode="numeric"
        autoComplete="off"
        className="tabular-nums"
        {...props}
        value={formatRibuan(value)}
        onChange={(e) => onChange(parseKetikanRupiah(e.target.value))}
      />
    </InputGroup>
  );
}
