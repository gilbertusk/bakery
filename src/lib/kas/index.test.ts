import { describe, expect, it } from 'vitest';

import { akunDariMetode } from './index';

describe('akunDariMetode', () => {
  it('tunai masuk laci, transfer dan QRIS masuk rekening', () => {
    expect(akunDariMetode('tunai')).toBe('tunai');
    expect(akunDariMetode('transfer')).toBe('rekening');
    expect(akunDariMetode('qris')).toBe('rekening');
  });
});
