import { ArrowLeft, Printer, Tag } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';

import { db } from '@/db/client';
import { EmptyState } from '@/components/empty-state';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { peranUntuk } from '@/config/navigasi';
import { hppSemuaProduk } from '@/features/hpp/queries';
import { ubahHargaJual } from '@/features/hpp/actions';
import { detailProduk } from '@/features/produk/queries';
import { requirePeran } from '@/lib/auth';
import { formatAngka, formatRupiah } from '@/lib/format';
import { ConfirmDialog } from '@/components/confirm-dialog';

export const metadata: Metadata = { title: 'Detail produk' };

async function IsiDetailProduk(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await requirePeran(...peranUntuk('/produk'));
  if (!z.uuid().safeParse(id).success) notFound();

  const [produk, ringkasan] = await Promise.all([
    detailProduk(id),
    hppSemuaProduk(db, { produkIds: [id] }),
  ]);
  if (!produk) notFound();

  const r = ringkasan.get(id);
  if (!r) notFound();
  const ringkasanProduk = r;

  const marginPersen = ringkasanProduk.marginPersen
    ? Number(ringkasanProduk.marginPersen) * 100
    : 0;
  const targetPersen = Number(ringkasanProduk.target) * 100;

  const status =
    ringkasanProduk.marginPersen === null || marginPersen < 0
      ? 'merah'
      : marginPersen < targetPersen
        ? 'kuning'
        : 'hijau';

  const statusLabel =
    status === 'merah' ? 'Rugi' : status === 'kuning' ? 'Di bawah target' : 'Di atas target';

  async function pakaiHargaSaran() {
    const hasil = await ubahHargaJual({
      id,
      hargaJual: String(ringkasanProduk.saranHarga),
    });
    if (!hasil.ok) {
      toast.error(hasil.error);
      return;
    }
    toast.success(`Harga jual diperbarui menjadi ${formatRupiah(ringkasanProduk.saranHarga)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <Button
        variant="ghost"
        className="h-10 w-fit"
        nativeButton={false}
        render={<Link href="/produk" />}
      >
        <ArrowLeft /> Kembali ke daftar
      </Button>
      <PageHeader
        judul={produk.nama}
        deskripsi={
          <>
            {produk.cetakan ? <span>{produk.cetakan} · </span> : null}
            <Badge variant={produk.dijual ? 'secondary' : 'outline'}>
              {produk.dijual ? 'Dijual' : 'Tidak dijual'}
            </Badge>
            {produk.aktif ? null : <Badge variant="secondary">Nonaktif</Badge>}
          </>
        }
        aksi={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-11" disabled>
              <Printer /> Cetak etiket
            </Button>
          </div>
        }
      />

      {/* Kartu HPP */}
      <section className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-medium">Rincian HPP</h2>
            <p className="text-muted-foreground text-sm">
              Biaya bahan pokok per pcs, termasuk overhead.
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">
              {formatRupiah(ringkasanProduk.hpp)}
            </p>
            <p className="text-muted-foreground text-xs">Total HPP per pcs</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-4 gap-2 border-t pt-2">
          <dt className="text-muted-foreground text-sm">Total</dt>
          <dd className="text-right font-medium tabular-nums">
            {formatRupiah(ringkasanProduk.hpp)}
          </dd>
        </dl>
        {ringkasanProduk.diBawahTarget ? (
          <p className="text-destructive mt-2 text-sm">
            HPP di atas target margin untuk harga jual saat ini.
          </p>
        ) : null}
      </section>

      {/* Kartu Margin */}
      <section className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-medium">Margin</h2>
            <p className="text-muted-foreground text-sm">
              Keuntungan per pcs setelah dikurangi HPP.
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">
              {formatRupiah(ringkasanProduk.marginRp)}
            </p>
            <p className="text-muted-foreground text-xs">Margin per pcs</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-4 gap-2">
          <dt className="text-muted-foreground text-sm">Margin persen</dt>
          <dd className="text-right font-medium tabular-nums">{marginPersen.toFixed(2)}%</dd>
          <dt className="text-muted-foreground text-sm">Target margin</dt>
          <dd className="text-right font-medium tabular-nums">
            {(Number(ringkasanProduk.target) * 100).toFixed(2)}%
          </dd>
          <dt className="text-muted-foreground text-sm">Status</dt>
          <dd className="text-right font-medium">
            <Badge
              variant={
                status === 'merah' ? 'destructive' : status === 'kuning' ? 'secondary' : 'default'
              }
            >
              {statusLabel}
            </Badge>
          </dd>
        </dl>
        {ringkasanProduk.saranHarga > 0 ? (
          <div className="mt-3 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">
                Saran harga untuk target margin {(Number(ringkasanProduk.target) * 100).toFixed(0)}
                %:
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {formatRupiah(ringkasanProduk.saranHarga)}
              </p>
            </div>
            <ConfirmDialog
              judul={`Perbarui harga jual ${produk.nama}?`}
              deskripsi={`Harga jual akan berubah dari ${formatRupiah(produk.hargaJual)} menjadi ${formatRupiah(ringkasanProduk.saranHarga)}.`}
              labelKonfirmasi="Pakai harga saran"
              onKonfirmasi={pakaiHargaSaran}
              pemicu={
                <Button className="h-11 sm:self-start">
                  <Tag /> Pakai harga ini
                </Button>
              }
            />
          </div>
        ) : null}
      </section>

      {/* Tabel komponen */}
      <section className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
        <h2 className="font-medium">Komponen per pcs</h2>
        {produk.komponen.length === 0 ? (
          <EmptyState
            ikon={Tag}
            judul="Belum ada komponen"
            deskripsi="Tambahkan komponen resep atau bahan pada halaman ubah produk."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium">Komponen</th>
                  <th className="p-2 text-right font-medium">Peran</th>
                  <th className="p-2 text-right font-medium">Takaran/pcs</th>
                  <th className="p-2 text-right font-medium">Biaya/pcs</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {produk.komponen.map((k) => (
                  <tr key={k.id}>
                    <td className="p-2 font-medium">
                      {k.jenis === 'adonan' ? k.namaResep : k.namaBahan}
                      {k.namaSatuan ? ` (${k.namaSatuan})` : null}
                    </td>
                    <td className="text-muted-foreground p-2 text-right tabular-nums">{k.peran}</td>
                    <td className="p-2 text-right tabular-nums">
                      {k.jenis === 'adonan'
                        ? `${formatAngka(k.gramPerPcs ?? '0')} g`
                        : `${formatAngka(k.takaranDasar)} ${k.satuanDasar ?? 'g'}`}
                    </td>
                    <td className="p-2 text-right font-medium tabular-nums">
                      {formatRupiah(k.biayaPerPcs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tab: Ringkasan | Stok | Riwayat produksi */}
      <Tabs value="ringkasan" defaultValue="ringkasan" className="w-full">
        <TabsList>
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="stok">Kartu Stok</TabsTrigger>
          <TabsTrigger value="produksi">Riwayat produksi</TabsTrigger>
        </TabsList>
        <TabsContent value="ringkasan" className="mt-3">
          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:p-6">
            {ringkasanProduk.diBawahTarget ? (
              <p className="text-destructive text-sm">
                Peringatan: Margin produk ini di bawah target. Pertimbangkan menyesuaikan harga jual
                atau mengurangi biaya bahan.
              </p>
            ) : null}
            <p className="text-sm">
              1 resep ≈{' '}
              {produk.komponen.find((k) => k.jenis === 'adonan')?.gramPerPcs
                ? 'hitung dari gram per pcs'
                : '—'}
            </p>
          </div>
        </TabsContent>
        <TabsContent value="stok" className="mt-3">
          <EmptyState
            ikon={Tag}
            judul="Kartu stok segera hadir"
            deskripsi="Stok produk akan dapat dikelola di modul stok (2.3)."
          />
        </TabsContent>
        <TabsContent value="produksi" className="mt-3">
          <EmptyState
            ikon={Tag}
            judul="Riwayat produksi segera hadir"
            deskripsi="Riwayat produksi akan muncul di sini (2.5)."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function HalamanDetailProduk({ params }: PageProps<'/produk/[id]'>) {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<LoadingSkeleton baris={6} />}>
        <IsiDetailProduk params={params} />
      </Suspense>
    </div>
  );
}
