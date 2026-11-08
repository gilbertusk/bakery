'use client';

import { MessageCircle, Pencil, Power } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { setAktifSupplier } from '@/features/supplier/actions';
import type { BarisSupplier } from '@/features/supplier/queries';
import { linkWhatsApp } from '@/lib/telepon';

import { FormSupplier } from './form-supplier';

export function AksiSupplier({ supplier }: { supplier: BarisSupplier }) {
  const wa = linkWhatsApp(supplier.kontak);

  async function ubahAktif() {
    const hasil = await setAktifSupplier({ id: supplier.id, aktif: !supplier.aktif });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success(supplier.aktif ? 'Supplier dinonaktifkan' : 'Supplier diaktifkan');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {wa ? (
        <Button
          variant="outline"
          className="h-10"
          nativeButton={false}
          render={<a href={wa} target="_blank" rel="noopener noreferrer" />}
        >
          <MessageCircle />
          WhatsApp
        </Button>
      ) : null}
      <FormSupplier
        supplier={supplier}
        pemicu={
          <Button variant="outline" className="h-10" aria-label={`Ubah ${supplier.nama}`}>
            <Pencil />
            Ubah
          </Button>
        }
      />
      <ConfirmDialog
        judul={supplier.aktif ? `Nonaktifkan ${supplier.nama}?` : `Aktifkan ${supplier.nama}?`}
        deskripsi={
          supplier.aktif
            ? 'Supplier nonaktif tidak muncul di pilihan form bahan. Data lama tetap tersimpan.'
            : 'Supplier akan muncul lagi di pilihan form bahan.'
        }
        labelKonfirmasi={supplier.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        berbahaya={supplier.aktif}
        onKonfirmasi={ubahAktif}
        pemicu={
          <Button variant="ghost" className="h-10">
            <Power />
            {supplier.aktif ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
        }
      />
    </div>
  );
}
