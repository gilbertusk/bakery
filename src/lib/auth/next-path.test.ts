import { describe, expect, it } from 'vitest';

import { tujuanSetelahLogin } from './next-path';

describe('tujuanSetelahLogin', () => {
  it.each(['/kasir', '/dashboard?tab=hari-ini', '/pre-order/baru'])(
    'menerima path internal %s',
    (path) => {
      expect(tujuanSetelahLogin(path)).toBe(path);
    },
  );

  it.each([undefined, null, '', 'kasir', '//evil.com', 'https://evil.com', '/\\evil.com'])(
    'menolak tujuan tidak aman %s',
    (path) => {
      expect(tujuanSetelahLogin(path)).toBe('/dashboard');
    },
  );
});
