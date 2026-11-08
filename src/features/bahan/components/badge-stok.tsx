import { Badge } from '@/components/ui/badge';

import type { StatusStok } from '../status-stok';

export function BadgeStok({ status }: { status: StatusStok }) {
  if (status === 'minus') return <Badge variant="destructive">Minus</Badge>;
  if (status === 'menipis') {
    return (
      <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
        Menipis
      </Badge>
    );
  }
  return null;
}

export function BadgeNonaktif({ aktif }: { aktif: boolean }) {
  return aktif ? null : <Badge variant="secondary">Nonaktif</Badge>;
}
