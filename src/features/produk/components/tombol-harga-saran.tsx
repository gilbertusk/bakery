'use client';

import { Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { ubahHargaJual } from '@/features/hpp/actions';
import { formatRupiah } from '@/lib/format';

export function TombolHargaSaran({
  id,
  nama,
  hargaLama,
  hargaSaran,
}: {
  id: string;
  nama: string;
  hargaLama: number;
  hargaSaran: number;
}) {
  const router = useRouter();

  async function pakaiHargaSaran() {
    const hasil = await ubahHargaJual({ id, hargaJual: String(hargaSaran) });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success(`Harga jual diperbarui menjadi ${formatRupiah(hargaSaran)}`);
    router.refresh();
  }

  return (
    <ConfirmDialog
      judul={`Perbarui harga jual ${nama}?`}
      deskripsi={`Harga jual akan berubah dari ${formatRupiah(hargaLama)} menjadi ${formatRupiah(hargaSaran)}.`}
      labelKonfirmasi="Pakai harga saran"
      onKonfirmasi={pakaiHargaSaran}
      pemicu={
        <Button className="h-11 sm:self-start">
          <Tag /> Pakai harga ini
        </Button>
      }
    />
  );
}
