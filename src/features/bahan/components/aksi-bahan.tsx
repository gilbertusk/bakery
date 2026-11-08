'use client';

import { Power } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';

import { setAktifBahan } from '../actions';

export function TombolAktifBahan({
  bahan,
}: {
  bahan: { id: string; nama: string; aktif: boolean };
}) {
  async function ubahAktif() {
    const hasil = await setAktifBahan({ id: bahan.id, aktif: !bahan.aktif });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success(bahan.aktif ? 'Bahan dinonaktifkan' : 'Bahan diaktifkan');
  }

  return (
    <ConfirmDialog
      judul={bahan.aktif ? `Nonaktifkan ${bahan.nama}?` : `Aktifkan ${bahan.nama}?`}
      deskripsi={
        bahan.aktif
          ? 'Bahan nonaktif tidak muncul di pilihan resep dan pembelian. Stok dan riwayat tetap tersimpan.'
          : 'Bahan akan muncul lagi di pilihan resep dan pembelian.'
      }
      labelKonfirmasi={bahan.aktif ? 'Nonaktifkan' : 'Aktifkan'}
      berbahaya={bahan.aktif}
      onKonfirmasi={ubahAktif}
      pemicu={
        <Button variant={bahan.aktif ? 'outline' : 'default'} className="h-11">
          <Power />
          {bahan.aktif ? 'Nonaktifkan bahan' : 'Aktifkan bahan'}
        </Button>
      }
    />
  );
}
