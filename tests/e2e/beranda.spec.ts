import { expect, test } from '@playwright/test';

test('halaman beranda menampilkan nama toko', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Toko Kue Khansa' })).toBeVisible();
  await expect(page.getByText('sedang dibangun')).toBeVisible();
});
