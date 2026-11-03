import { expect, test } from '@playwright/test';

test('halaman login dikirim dengan header keamanan', async ({ request }) => {
  const response = await request.get('/login');
  const header = response.headers();

  expect(response.ok()).toBe(true);
  expect(header['x-content-type-options']).toBe('nosniff');
  expect(header['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(header['x-frame-options']).toBe('DENY');
  expect(header['permissions-policy']).toContain('camera=()');
  expect(header['permissions-policy']).toContain('bluetooth=(self)');
  expect(header['x-powered-by']).toBeUndefined();
});
