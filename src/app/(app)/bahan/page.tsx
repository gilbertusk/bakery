import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Bahan' };

export default function HalamanBahan() {
  return <HalamanSegeraHadir href="/bahan" />;
}
