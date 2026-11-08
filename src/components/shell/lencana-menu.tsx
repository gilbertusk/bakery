import { cn } from '@/lib/utils';

/** Jumlah per href menu, mis. `{ '/bahan': 3 }` untuk bahan stok menipis. */
export type LencanaMenu = Partial<Record<string, number>>;

export function LencanaJumlah({
  jumlah,
  label,
  className,
}: {
  jumlah: number | undefined;
  label: string;
  className?: string;
}) {
  if (!jumlah) return null;
  return (
    <span
      className={cn(
        'bg-destructive text-destructive-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.7rem] leading-none font-semibold tabular-nums',
        className,
      )}
    >
      <span aria-hidden>{jumlah > 99 ? '99+' : jumlah}</span>
      <span className="sr-only">
        {jumlah} {label}
      </span>
    </span>
  );
}
