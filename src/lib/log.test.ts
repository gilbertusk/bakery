import { afterEach, describe, expect, it, vi } from 'vitest';

import { log } from './log';

afterEach(() => {
  vi.restoreAllMocks();
});

function barisTerakhir(spy: { mock: { calls: unknown[][] } }) {
  const panggilan = spy.mock.calls.at(-1);
  return JSON.parse(String(panggilan?.[0])) as Record<string, unknown>;
}

describe('log', () => {
  it('error menulis JSON satu baris berisi detail error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const galat = Object.assign(new Error('koneksi putus'), { code: 'ECONNRESET' });

    log.error('Gagal menyimpan', { error: galat, modul: 'kasir' });

    const baris = barisTerakhir(spy);
    expect(baris.level).toBe('error');
    expect(baris.pesan).toBe('Gagal menyimpan');
    expect(baris.modul).toBe('kasir');
    expect(baris.error).toMatchObject({
      name: 'Error',
      message: 'koneksi putus',
      code: 'ECONNRESET',
    });
    expect(typeof baris.waktu).toBe('string');
  });

  it('menyertakan cause bersarang', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    log.error('Gagal', { error: new Error('luar', { cause: new Error('dalam') }) });
    expect(barisTerakhir(spy).error).toMatchObject({ cause: { message: 'dalam' } });
  });

  it('nilai error bukan Error tetap tercatat', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    log.error('Gagal', { error: 'teks' });
    expect(barisTerakhir(spy).error).toBe('teks');
  });

  it('info dan warn memakai console yang sesuai', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    log.info('Mulai');
    log.warn('Hati-hati', { sisa: 2 });

    expect(barisTerakhir(info)).toMatchObject({ level: 'info', pesan: 'Mulai' });
    expect(barisTerakhir(warn)).toMatchObject({ level: 'warn', pesan: 'Hati-hati', sisa: 2 });
  });
});
