'use client';

import { Pencil, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';

import { hapusBiayaTambahan, setAktifBiayaTambahan } from '../actions';
import type { BarisBiayaTambahan } from '../queries';
import { FormBiayaTambahan } from './form-biaya-tambahan';

type Props = { biaya: BarisBiayaTambahan; produk: { id: string; nama: string }[] };

export function AksiBiayaTambahan({ biaya, produk }: Props) {
  async function ubahAktif() {
    const hasil = await setAktifBiayaTambahan({ id: biaya.id, aktif: !biaya.aktif });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success(biaya.aktif ? 'Biaya dinonaktifkan' : 'Biaya diaktifkan');
  }

  async function hapus() {
    const hasil = await hapusBiayaTambahan({ id: biaya.id });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success('Biaya tambahan dihapus');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FormBiayaTambahan
        biaya={biaya}
        produk={produk}
        pemicu={
          <Button variant="outline" className="h-10" aria-label={`Ubah ${biaya.nama}`}>
            <Pencil />
            Ubah
          </Button>
        }
      />
      <ConfirmDialog
        judul={biaya.aktif ? `Nonaktifkan ${biaya.nama}?` : `Aktifkan ${biaya.nama}?`}
        deskripsi={
          biaya.aktif
            ? 'Biaya ini tidak lagi masuk HPP produk. Data tetap tersimpan.'
            : 'Biaya ini akan masuk lagi ke HPP produk.'
        }
        labelKonfirmasi={biaya.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        onKonfirmasi={ubahAktif}
        pemicu={
          <Button variant="ghost" className="h-10">
            <Power />
            {biaya.aktif ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
        }
      />
      <ConfirmDialog
        judul={`Hapus ${biaya.nama}?`}
        deskripsi="Biaya dihapus permanen dan HPP produk dihitung ulang. Pilih Nonaktifkan jika hanya ingin berhenti sementara."
        labelKonfirmasi="Hapus"
        berbahaya
        onKonfirmasi={hapus}
        pemicu={
          <Button
            variant="ghost"
            className="text-destructive h-10"
            aria-label={`Hapus ${biaya.nama}`}
          >
            <Trash2 />
            Hapus
          </Button>
        }
      />
    </div>
  );
}
