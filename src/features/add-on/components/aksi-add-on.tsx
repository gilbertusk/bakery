'use client';

import { Pencil, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';

import { hapusAddOn, setAktifAddOn } from '../actions';
import type { BarisAddOn, PilihanBahanAddOn } from '../queries';
import { FormAddOn } from './form-add-on';

type Props = { addOn: BarisAddOn; bahan: PilihanBahanAddOn[]; targetMargin: string };

export function AksiAddOn({ addOn, bahan, targetMargin }: Props) {
  async function ubahAktif() {
    const hasil = await setAktifAddOn({ id: addOn.id, aktif: !addOn.aktif });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success(addOn.aktif ? 'Add-on dinonaktifkan' : 'Add-on diaktifkan');
  }

  async function hapus() {
    const hasil = await hapusAddOn({ id: addOn.id });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success('Add-on dihapus');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FormAddOn
        addOn={addOn}
        bahan={bahan}
        targetMargin={targetMargin}
        pemicu={
          <Button variant="outline" className="h-10" aria-label={`Ubah ${addOn.nama}`}>
            <Pencil />
            Ubah
          </Button>
        }
      />
      <ConfirmDialog
        judul={addOn.aktif ? `Nonaktifkan ${addOn.nama}?` : `Aktifkan ${addOn.nama}?`}
        deskripsi={
          addOn.aktif
            ? 'Add-on tidak muncul lagi di kasir. Data dan riwayat transaksi tetap tersimpan.'
            : 'Add-on akan muncul lagi di kasir untuk semua produk.'
        }
        labelKonfirmasi={addOn.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        onKonfirmasi={ubahAktif}
        pemicu={
          <Button variant="ghost" className="h-10">
            <Power />
            {addOn.aktif ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
        }
      />
      <ConfirmDialog
        judul={`Hapus ${addOn.nama}?`}
        deskripsi="Add-on dihapus permanen. Add-on yang sudah dipakai di transaksi tidak bisa dihapus, hanya dinonaktifkan."
        labelKonfirmasi="Hapus"
        berbahaya
        onKonfirmasi={hapus}
        pemicu={
          <Button
            variant="ghost"
            className="text-destructive h-10"
            aria-label={`Hapus ${addOn.nama}`}
          >
            <Trash2 />
            Hapus
          </Button>
        }
      />
    </div>
  );
}
