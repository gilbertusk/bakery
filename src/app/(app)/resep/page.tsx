import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Resep' };

export default function HalamanResep() {
  return <HalamanSegeraHadir href="/resep" />;
}
