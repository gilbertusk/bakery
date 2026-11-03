import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Pre-Order' };

export default function HalamanPreOrder() {
  return <HalamanSegeraHadir href="/pre-order" />;
}
