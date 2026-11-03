import { cn } from '@/lib/utils';

// TODO(0.7): ganti dengan formatRupiah dari src/lib/format.ts.
export function formatRupiahSementara(nilai: number): string {
  const absolut = Math.abs(Math.trunc(nilai)).toLocaleString('id-ID');
  return `${nilai < 0 ? '-' : ''}Rp${absolut}`;
}

export function RupiahText({ nilai, className }: { nilai: number; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{formatRupiahSementara(nilai)}</span>;
}
