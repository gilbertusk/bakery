import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Produksi' };

export default function HalamanProduksi() {
  return <HalamanSegeraHadir href="/produksi" />;
}
