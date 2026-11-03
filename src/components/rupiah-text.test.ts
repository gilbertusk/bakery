import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RupiahText } from './rupiah-text';

describe('RupiahText', () => {
  it.each([
    [15000, 'Rp15.000'],
    [-5000, '-Rp5.000'],
    ['2675.5', 'Rp2.676'],
  ])('menampilkan %s sebagai %s', (nilai, hasil) => {
    const html = renderToStaticMarkup(createElement(RupiahText, { nilai }));
    expect(html).toContain(`>${hasil}</span>`);
    expect(html).toContain('tabular-nums');
  });
});
