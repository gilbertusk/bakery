import { describe, expect, it } from 'vitest';

import { faktorSkala, skalakanItems } from './skala';

describe('faktorSkala', () => {
  it('manual memakai faktor apa adanya', () => {
    expect(faktorSkala({ jenis: 'manual', faktor: '1.5' }).toString()).toBe('1.5');
  });

  it('bulat 20 → 24 cm = 1,44', () => {
    expect(faktorSkala({ jenis: 'bulat', diameterAcuan: 20, diameterBaru: 24 }).toString()).toBe(
      '1.44',
    );
  });

  it('kotak 20×20 → 22×22 = 1,21', () => {
    expect(
      faktorSkala({ jenis: 'kotak', pAcuan: 20, lAcuan: 20, pBaru: 22, lBaru: 22 }).toString(),
    ).toBe('1.21');
  });

  it('campuran bulat 20 → kotak 20×20 ≈ 1,2732', () => {
    const faktor = faktorSkala({
      jenis: 'campuran',
      acuan: { bentuk: 'bulat', diameter: 20 },
      baru: { bentuk: 'kotak', p: 20, l: 20 },
    });
    expect(faktor.toFixed(4)).toBe('1.2732');
  });

  it('campuran kotak → bulat adalah kebalikannya', () => {
    const faktor = faktorSkala({
      jenis: 'campuran',
      acuan: { bentuk: 'kotak', p: 20, l: 20 },
      baru: { bentuk: 'bulat', diameter: 20 },
    });
    expect(faktor.toFixed(4)).toBe('0.7854');
  });

  it.each([
    [{ jenis: 'manual', faktor: 0 }],
    [{ jenis: 'manual', faktor: -1 }],
    [{ jenis: 'bulat', diameterAcuan: 0, diameterBaru: 24 }],
    [{ jenis: 'bulat', diameterAcuan: 20, diameterBaru: -24 }],
    [{ jenis: 'kotak', pAcuan: 20, lAcuan: 0, pBaru: 22, lBaru: 22 }],
    [
      {
        jenis: 'campuran',
        acuan: { bentuk: 'bulat', diameter: 20 },
        baru: { bentuk: 'kotak', p: 0, l: 20 },
      },
    ],
  ] as const)('ukuran atau faktor ≤ 0 ditolak: %j', (input) => {
    expect(() => faktorSkala(input)).toThrow('harus lebih dari 0');
  });
});

describe('skalakanItems', () => {
  it('mengalikan takaran dan takaranDasar, field lain tetap', () => {
    const items = [
      { bahanId: 'a', takaran: '3', takaranDasar: '36', satuan: 'sdm' },
      { bahanId: 'b', takaran: '250', takaranDasar: '250', satuan: 'g' },
    ];
    const hasil = skalakanItems(items, '1.5');

    expect(
      hasil.map((i) => [i.bahanId, i.satuan, i.takaran.toString(), i.takaranDasar.toString()]),
    ).toEqual([
      ['a', 'sdm', '4.5', '54'],
      ['b', 'g', '375', '375'],
    ]);
    expect(items[0]?.takaran).toBe('3');
  });

  it('menolak faktor ≤ 0', () => {
    expect(() => skalakanItems([], 0)).toThrow('Faktor skala harus lebih dari 0');
  });
});
