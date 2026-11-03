import type { Metadata } from 'next';

import { HalamanSegeraHadir } from '@/components/segera-hadir';

export const metadata: Metadata = { title: 'Pengaturan' };

export default function HalamanPengaturan() {
  return <HalamanSegeraHadir href="/pengaturan" />;
}
