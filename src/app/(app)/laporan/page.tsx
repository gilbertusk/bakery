import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Laporan' };

export default function HalamanLaporan() {
  return <HalamanSegeraHadir href="/laporan" />;
}
