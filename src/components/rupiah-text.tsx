import type { NilaiAngka } from '@/lib/angka';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

export function RupiahText({ nilai, className }: { nilai: NilaiAngka; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{formatRupiah(nilai)}</span>;
}
