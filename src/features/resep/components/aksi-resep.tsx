'use client';

import { Power } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';

import { setAktifResep } from '../actions';

export function TombolAktifResep({
  resep,
}: {
  resep: { id: string; nama: string; aktif: boolean };
}) {
  async function ubahAktif() {
    const hasil = await setAktifResep({ id: resep.id, aktif: !resep.aktif });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success(resep.aktif ? 'Resep dinonaktifkan' : 'Resep diaktifkan');
  }

  return (
    <ConfirmDialog
      judul={resep.aktif ? `Nonaktifkan ${resep.nama}?` : `Aktifkan ${resep.nama}?`}
      deskripsi={
        resep.aktif
          ? 'Resep yang dipakai produk aktif tidak dapat dinonaktifkan.'
          : 'Resep akan bisa dipakai lagi saat membuat produk.'
      }
      labelKonfirmasi={resep.aktif ? 'Nonaktifkan' : 'Aktifkan'}
      berbahaya={resep.aktif}
      onKonfirmasi={ubahAktif}
      pemicu={
        <Button variant={resep.aktif ? 'outline' : 'default'} className="h-11">
          <Power /> {resep.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        </Button>
      }
    />
  );
}
