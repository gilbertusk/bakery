import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Produk' };

export default function HalamanProduk() {
  return <HalamanSegeraHadir href="/produk" />;
}
