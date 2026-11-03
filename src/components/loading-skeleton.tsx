import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function LoadingSkeleton({ baris = 4, className }: { baris?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4', className)} role="status" aria-live="polite">
      <span className="sr-only">Memuat…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="mt-2 flex flex-col gap-3">
        {Array.from({ length: baris }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
