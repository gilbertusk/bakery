import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Keuangan' };

export default function HalamanKeuangan() {
  return <HalamanSegeraHadir href="/keuangan" />;
}
