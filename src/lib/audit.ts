import type { Tx } from '@/db/client';
import { type AksiAudit, auditLog } from '@/db/schema';
import { D } from '@/lib/angka';

type Data = Record<string, unknown>;

/** Ubah ke nilai JSON (Decimal → string, Date → ISO) agar bisa dibandingkan dan disimpan. */
function keJson(data: Data): Data {
  return JSON.parse(JSON.stringify(data)) as Data;
}

const POLA_ANGKA = /^-?\d+(\.\d+)?$/;

function isAngka(nilai: unknown): nilai is string | number {
  return typeof nilai === 'number' || (typeof nilai === 'string' && POLA_ANGKA.test(nilai));
}

/** "15.0000" dan "15" dianggap sama: kolom numeric dari DB vs nilai hasil hitung. */
function samaNilai(a: unknown, b: unknown): boolean {
  if (isAngka(a) && isAngka(b)) return D(a).eq(D(b));
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Field yang berubah antara dua versi data; null bila tidak ada perubahan. */
export function selisihData(lama: Data, baru: Data): { lama: Data; baru: Data } | null {
  const a = keJson(lama);
  const b = keJson(baru);
  const hasil = { lama: {} as Data, baru: {} as Data };
  let berubah = false;

  for (const kunci of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const nilaiLama = a[kunci] ?? null;
    const nilaiBaru = b[kunci] ?? null;
    if (samaNilai(nilaiLama, nilaiBaru)) continue;
    hasil.lama[kunci] = nilaiLama;
    hasil.baru[kunci] = nilaiBaru;
    berubah = true;
  }

  return berubah ? hasil : null;
}

export type InputAudit = {
  penggunaId: string;
  tabel: string;
  recordId: string;
  aksi: AksiAudit;
  dataLama?: Data | null;
  dataBaru?: Data | null;
};

/**
 * Tulis audit log. Untuk `update`, hanya field yang berubah yang disimpan; bila tidak ada
 * perubahan, tidak ada baris yang ditulis dan fungsi mengembalikan null.
 */
export async function catatAudit(tx: Tx, input: InputAudit) {
  let dataLama = input.dataLama ? keJson(input.dataLama) : null;
  let dataBaru = input.dataBaru ? keJson(input.dataBaru) : null;

  if (input.aksi === 'update') {
    const selisih = selisihData(dataLama ?? {}, dataBaru ?? {});
    if (!selisih) return null;
    dataLama = selisih.lama;
    dataBaru = selisih.baru;
  }

  const [baris] = await tx
    .insert(auditLog)
    .values({
      penggunaId: input.penggunaId,
      tabel: input.tabel,
      recordId: input.recordId,
      aksi: input.aksi,
      dataLama,
      dataBaru,
    })
    .returning();
  if (!baris) throw new Error('Gagal menyimpan audit log');
  return baris;
}
