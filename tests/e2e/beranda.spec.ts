import { expect, test } from '@playwright/test';

test('akses dashboard tanpa login diarahkan ke halaman login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole('heading', { name: 'Toko Kue Khansa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();
});

test('beranda tanpa login berakhir di halaman login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login/);
});

test('tombol tampil/sembunyi password mengubah tipe input', async ({ page }) => {
  await page.goto('/login');

  const password = page.getByLabel('Password', { exact: true });
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Tampilkan password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
});
