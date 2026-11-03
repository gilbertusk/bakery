import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Pembelian' };

export default function HalamanPembelian() {
  return <HalamanSegeraHadir href="/pembelian" />;
}
