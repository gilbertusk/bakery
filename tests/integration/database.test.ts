import { afterAll, describe, expect, it } from 'vitest';

import { testSql } from './setup/db';

describe('database test lokal', () => {
  afterAll(async () => testSql.end());

  it('menerima query setelah global setup selesai', async () => {
    const [result] = await testSql<{ value: number }[]>`SELECT 1 AS value`;

    expect(result?.value).toBe(1);
  });
});
