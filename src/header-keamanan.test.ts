import { describe, expect, it } from 'vitest';

import nextConfig from '../next.config';

async function headerUntukSemuaHalaman() {
  const aturan = (await nextConfig.headers?.()) ?? [];
  const semua = aturan.find((a) => a.source === '/:path*');
  return Object.fromEntries((semua?.headers ?? []).map((h) => [h.key, h.value]));
}

describe('header keamanan', () => {
  it('dipasang untuk semua path', async () => {
    const header = await headerUntukSemuaHalaman();

    expect(header['X-Content-Type-Options']).toBe('nosniff');
    expect(header['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(header['X-Frame-Options']).toBe('DENY');
  });

  it('Permissions-Policy mematikan kamera, mikrofon, lokasi; bluetooth hanya untuk situs sendiri', async () => {
    const policy = (await headerUntukSemuaHalaman())['Permissions-Policy'] ?? '';
    const arahan = policy.split(',').map((s) => s.trim());

    expect(arahan).toEqual(
      expect.arrayContaining(['camera=()', 'microphone=()', 'geolocation=()', 'bluetooth=(self)']),
    );
  });

  it('tidak membocorkan header X-Powered-By', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
