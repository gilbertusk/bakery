import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Stok' };

export default function HalamanStok() {
  return <HalamanSegeraHadir href="/stok" />;
}
