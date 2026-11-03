'use client';

import { LoaderCircle } from 'lucide-react';
import { type ReactElement, type ReactNode, useState, useTransition } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type ConfirmDialogProps = {
  /** Elemen pemicu (mis. `<Button>`); diklik untuk membuka dialog. */
  pemicu: ReactElement;
  judul: string;
  deskripsi?: ReactNode;
  labelKonfirmasi?: string;
  labelBatal?: string;
  berbahaya?: boolean;
  /** Dialog tertutup setelah promise selesai tanpa error. */
  onKonfirmasi: () => void | Promise<void>;
};

export function ConfirmDialog({
  pemicu,
  judul,
  deskripsi,
  labelKonfirmasi = 'Ya, lanjutkan',
  labelBatal = 'Batal',
  berbahaya = false,
  onKonfirmasi,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function konfirmasi() {
    startTransition(async () => {
      await onKonfirmasi();
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger render={pemicu} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{judul}</AlertDialogTitle>
          {deskripsi ? <AlertDialogDescription>{deskripsi}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={pending}>
            {labelBatal}
          </AlertDialogCancel>
          <Button
            className="h-11"
            variant={berbahaya ? 'destructive' : 'default'}
            disabled={pending}
            onClick={konfirmasi}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {labelKonfirmasi}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
