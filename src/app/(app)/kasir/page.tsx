import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Kasir' };

export default function HalamanKasir() {
  return <HalamanSegeraHadir href="/kasir" />;
}
