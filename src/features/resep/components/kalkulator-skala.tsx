'use client';

import { Clipboard, LoaderCircle, Printer, Save, Scale } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { D, type Decimal } from '@/lib/angka';
import { formatAngka, formatRupiah, formatTakaran, formatTakaranSkala } from '@/lib/format';
import { faktorSkala, skalakanItems } from '@/lib/hpp';

import { simpanLoyangResep } from '../actions';
import { simpanLoyangResepSchema } from '../schemas';

type Bentuk = 'bulat' | 'kotak';
type LoyangAcuan =
  { bentuk: 'bulat'; diameter: string } | { bentuk: 'kotak'; panjang: string; lebar: string };

export type DataSkalaResep = {
  id: string;
  nama: string;
  hasilGram: string;
  biayaTotal: string;
  bentukLoyang: Bentuk | null;
  diameterCm: string | null;
  panjangCm: string | null;
  lebarCm: string | null;
  items: Array<{
    id: string;
    namaBahan: string;
    takaran: string;
    takaranDasar: string;
    namaSatuan: string | null;
    satuanDasar: 'g' | 'ml' | 'pcs';
  }>;
};

function angka(input: string) {
  return input.trim().replace(',', '.');
}

function acuanAwal(resep: DataSkalaResep): LoyangAcuan | null {
  if (resep.bentukLoyang === 'bulat' && resep.diameterCm) {
    return { bentuk: 'bulat', diameter: resep.diameterCm };
  }
  if (resep.bentukLoyang === 'kotak' && resep.panjangCm && resep.lebarCm) {
    return { bentuk: 'kotak', panjang: resep.panjangCm, lebar: resep.lebarCm };
  }
  return null;
}

function faktorDariLoyang(
  acuan: LoyangAcuan,
  tujuan: { bentuk: Bentuk; diameter: string; panjang: string; lebar: string },
) {
  if (acuan.bentuk === 'bulat' && tujuan.bentuk === 'bulat') {
    return faktorSkala({
      jenis: 'bulat',
      diameterAcuan: acuan.diameter,
      diameterBaru: angka(tujuan.diameter),
    });
  }
  if (acuan.bentuk === 'kotak' && tujuan.bentuk === 'kotak') {
    return faktorSkala({
      jenis: 'kotak',
      pAcuan: acuan.panjang,
      lAcuan: acuan.lebar,
      pBaru: angka(tujuan.panjang),
      lBaru: angka(tujuan.lebar),
    });
  }
  return faktorSkala({
    jenis: 'campuran',
    acuan:
      acuan.bentuk === 'bulat'
        ? { bentuk: 'bulat', diameter: acuan.diameter }
        : { bentuk: 'kotak', p: acuan.panjang, l: acuan.lebar },
    baru:
      tujuan.bentuk === 'bulat'
        ? { bentuk: 'bulat', diameter: angka(tujuan.diameter) }
        : { bentuk: 'kotak', p: angka(tujuan.panjang), l: angka(tujuan.lebar) },
  });
}

function InputCm({
  id,
  label,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <InputGroup className="h-11">
        <InputGroupInput
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
        />
        <InputGroupAddon align="inline-end">cm</InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function KalkulatorSkala({ resep }: { resep: DataSkalaResep }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('faktor');
  const [faktorManual, setFaktorManual] = useState('1');
  const [acuan, setAcuan] = useState<LoyangAcuan | null>(() => acuanAwal(resep));
  const [bentukAcuan, setBentukAcuan] = useState<Bentuk>('bulat');
  const [diameterAcuan, setDiameterAcuan] = useState('');
  const [panjangAcuan, setPanjangAcuan] = useState('');
  const [lebarAcuan, setLebarAcuan] = useState('');
  const [bentukTujuan, setBentukTujuan] = useState<Bentuk>(acuan?.bentuk ?? 'bulat');
  const [diameterTujuan, setDiameterTujuan] = useState('24');
  const [panjangTujuan, setPanjangTujuan] = useState('24');
  const [lebarTujuan, setLebarTujuan] = useState('24');
  const [errorAcuan, setErrorAcuan] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const faktor = useMemo((): Decimal | null => {
    try {
      if (tab === 'faktor') return faktorSkala({ jenis: 'manual', faktor: angka(faktorManual) });
      if (!acuan) return null;
      return faktorDariLoyang(acuan, {
        bentuk: bentukTujuan,
        diameter: diameterTujuan,
        panjang: panjangTujuan,
        lebar: lebarTujuan,
      });
    } catch {
      return null;
    }
  }, [acuan, bentukTujuan, diameterTujuan, faktorManual, lebarTujuan, panjangTujuan, tab]);

  const hasil = useMemo(() => {
    if (!faktor) return null;
    const items = skalakanItems(resep.items, faktor);
    return {
      items,
      hasilGram: D(resep.hasilGram).times(faktor),
      biayaTotal: D(resep.biayaTotal).times(faktor),
    };
  }, [faktor, resep]);

  function pilihCepat(nilai: string) {
    setTab('faktor');
    setFaktorManual(nilai);
  }

  function simpanAcuan() {
    setError(null);
    setErrorAcuan({});
    const loyang =
      bentukAcuan === 'bulat'
        ? { bentuk: 'bulat' as const, diameterCm: diameterAcuan }
        : { bentuk: 'kotak' as const, panjangCm: panjangAcuan, lebarCm: lebarAcuan };
    const input = simpanLoyangResepSchema.safeParse({ resepId: resep.id, loyang });
    if (!input.success) {
      setErrorAcuan(
        Object.fromEntries(
          input.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
        ),
      );
      return;
    }

    startTransition(async () => {
      const disimpan = await simpanLoyangResep(input.data);
      if (!disimpan.ok) {
        setError(disimpan.error);
        return;
      }
      const baru: LoyangAcuan =
        input.data.loyang.bentuk === 'bulat'
          ? { bentuk: 'bulat', diameter: input.data.loyang.diameterCm }
          : {
              bentuk: 'kotak',
              panjang: input.data.loyang.panjangCm,
              lebar: input.data.loyang.lebarCm,
            };
      setAcuan(baru);
      setBentukTujuan(baru.bentuk);
      toast.success('Loyang acuan disimpan');
    });
  }

  async function salinTeks() {
    if (!hasil || !faktor) return;
    const daftar = hasil.items.map((item) => {
      const satuan = item.namaSatuan ?? item.satuanDasar;
      return `- ${item.namaBahan}: ${formatTakaranSkala(item.takaran, satuan).teks}`;
    });
    const teks = [
      `${resep.nama} — skala ${formatAngka(faktor, 4)}×`,
      ...daftar,
      `Hasil adonan: ${formatTakaranSkala(hasil.hasilGram, 'g').teks}`,
      `Perkiraan biaya: ${formatRupiah(hasil.biayaTotal)}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(teks);
      toast.success('Daftar bahan disalin');
    } catch {
      toast.error('Daftar bahan tidak dapat disalin');
    }
  }

  const catatan = hasil
    ? [
        ...new Set(
          hasil.items.flatMap((item) => {
            const satuan = item.namaSatuan ?? item.satuanDasar;
            const pesan = formatTakaranSkala(item.takaran, satuan).catatan;
            return pesan ? [pesan] : [];
          }),
        ),
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-11">
            <Scale /> Skala
          </Button>
        }
      />
      <DialogContent
        data-cetak-skala
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-3xl"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Kalkulator skala — {resep.nama}</DialogTitle>
            <DialogDescription>
              Hanya pratinjau. Takaran asli resep tidak akan berubah.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid h-10 w-full grid-cols-2" data-tidak-cetak>
              <TabsTrigger value="faktor">Faktor</TabsTrigger>
              <TabsTrigger value="loyang">Loyang</TabsTrigger>
            </TabsList>
            <TabsContent value="faktor" className="mt-3 flex flex-col gap-3" data-tidak-cetak>
              <div className="grid grid-cols-4 gap-2">
                {['0.5', '1.5', '2', '3'].map((nilai) => (
                  <Button
                    key={nilai}
                    type="button"
                    variant={faktorManual === nilai ? 'default' : 'outline'}
                    className="h-10"
                    onClick={() => pilihCepat(nilai)}
                  >
                    {nilai.replace('.', ',')}×
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="faktor-bebas" className="text-sm font-medium">
                  Faktor bebas
                </label>
                <InputGroup className="h-11 sm:max-w-xs">
                  <InputGroupInput
                    id="faktor-bebas"
                    inputMode="decimal"
                    value={faktorManual}
                    onChange={(e) => setFaktorManual(e.target.value)}
                    aria-invalid={!faktor}
                  />
                  <InputGroupAddon align="inline-end">×</InputGroupAddon>
                </InputGroup>
                {!faktor ? (
                  <p className="text-destructive text-sm">Faktor harus lebih dari 0</p>
                ) : null}
              </div>
            </TabsContent>
            <TabsContent value="loyang" className="mt-3 flex flex-col gap-4" data-tidak-cetak>
              {!acuan ? (
                <div className="flex flex-col gap-3 rounded-xl border p-4">
                  <div>
                    <h3 className="font-medium">Isi loyang acuan</h3>
                    <p className="text-muted-foreground text-sm">
                      Ukuran ini disimpan ke resep agar perbandingan loyang akurat.
                    </p>
                  </div>
                  <Select
                    items={{ bulat: 'Bulat', kotak: 'Kotak' }}
                    value={bentukAcuan}
                    onValueChange={(value) => value && setBentukAcuan(value as Bentuk)}
                  >
                    <SelectTrigger className="h-11! w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulat">Bulat</SelectItem>
                      <SelectItem value="kotak">Kotak</SelectItem>
                    </SelectContent>
                  </Select>
                  {bentukAcuan === 'bulat' ? (
                    <InputCm
                      id="diameter-acuan"
                      label="Diameter acuan"
                      value={diameterAcuan}
                      onChange={setDiameterAcuan}
                      invalid={Boolean(errorAcuan['loyang.diameterCm'])}
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InputCm
                        id="panjang-acuan"
                        label="Panjang acuan"
                        value={panjangAcuan}
                        onChange={setPanjangAcuan}
                        invalid={Boolean(errorAcuan['loyang.panjangCm'])}
                      />
                      <InputCm
                        id="lebar-acuan"
                        label="Lebar acuan"
                        value={lebarAcuan}
                        onChange={setLebarAcuan}
                        invalid={Boolean(errorAcuan['loyang.lebarCm'])}
                      />
                    </div>
                  )}
                  {Object.values(errorAcuan)[0] ? (
                    <p className="text-destructive text-sm">{Object.values(errorAcuan)[0]}</p>
                  ) : null}
                  {error ? <p className="text-destructive text-sm">{error}</p> : null}
                  <Button
                    type="button"
                    className="h-11 sm:self-end"
                    disabled={pending}
                    onClick={simpanAcuan}
                  >
                    {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
                    Simpan loyang acuan
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-muted-foreground text-sm">
                    Acuan:{' '}
                    {acuan.bentuk === 'bulat'
                      ? `bulat Ø ${formatAngka(acuan.diameter)} cm`
                      : `kotak ${formatAngka(acuan.panjang)} × ${formatAngka(acuan.lebar)} cm`}
                  </p>
                  <Select
                    items={{ bulat: 'Bulat', kotak: 'Kotak' }}
                    value={bentukTujuan}
                    onValueChange={(value) => value && setBentukTujuan(value as Bentuk)}
                  >
                    <SelectTrigger className="h-11! w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulat">Bulat</SelectItem>
                      <SelectItem value="kotak">Kotak</SelectItem>
                    </SelectContent>
                  </Select>
                  {bentukTujuan === 'bulat' ? (
                    <InputCm
                      id="diameter-tujuan"
                      label="Diameter tujuan"
                      value={diameterTujuan}
                      onChange={setDiameterTujuan}
                      invalid={!faktor}
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InputCm
                        id="panjang-tujuan"
                        label="Panjang tujuan"
                        value={panjangTujuan}
                        onChange={setPanjangTujuan}
                        invalid={!faktor}
                      />
                      <InputCm
                        id="lebar-tujuan"
                        label="Lebar tujuan"
                        value={lebarTujuan}
                        onChange={setLebarTujuan}
                        invalid={!faktor}
                      />
                    </div>
                  )}
                  {!faktor ? (
                    <p className="text-destructive text-sm">Lengkapi ukuran tujuan lebih dari 0</p>
                  ) : null}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {hasil && faktor ? (
            <section className="flex flex-col gap-3">
              <div className="bg-muted grid grid-cols-3 gap-3 rounded-xl p-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Faktor</p>
                  <p className="font-semibold tabular-nums">{formatAngka(faktor, 4)}×</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hasil</p>
                  <p className="font-semibold tabular-nums">{formatAngka(hasil.hasilGram, 1)} g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Biaya</p>
                  <p className="font-semibold tabular-nums">{formatRupiah(hasil.biayaTotal)}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="p-2 text-left font-medium">Bahan</th>
                      <th className="p-2 text-right font-medium">Asli → baru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hasil.items.map((item) => {
                      const satuan = item.namaSatuan ?? item.satuanDasar;
                      return (
                        <tr key={item.id}>
                          <td className="p-2 align-top font-medium">{item.namaBahan}</td>
                          <td className="p-2 text-right align-top tabular-nums">
                            <p>
                              {formatTakaran(item.takaran.div(faktor), satuan)} →{' '}
                              {formatTakaranSkala(item.takaran, satuan).teks}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatTakaranSkala(item.takaranDasar, item.satuanDasar).teks} satuan
                              dasar
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {catatan.map((pesan) => (
                <p key={pesan} className="text-muted-foreground text-xs">
                  * {pesan}
                </p>
              ))}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end" data-tidak-cetak>
                <Button type="button" variant="outline" className="h-11" onClick={salinTeks}>
                  <Clipboard /> Salin teks
                </Button>
                <Button type="button" className="h-11" onClick={() => window.print()}>
                  <Printer /> Cetak
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
