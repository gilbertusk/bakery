import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Supplier' };

export default function HalamanSupplier() {
  return <HalamanSegeraHadir href="/supplier" />;
}
