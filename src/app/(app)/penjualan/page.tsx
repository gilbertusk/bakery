import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Penjualan' };

export default function HalamanPenjualan() {
  return <HalamanSegeraHadir href="/penjualan" />;
}
