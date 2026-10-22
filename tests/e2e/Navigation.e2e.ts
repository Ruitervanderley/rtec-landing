import { expect, test } from '@playwright/test';

test.describe('Mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens services without horizontal overflow', async ({ page }) => {
    await page.goto('/');

    await page.getByText('Menu', { exact: true }).click();
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Serviços', exact: true }).click();

    await expect(page).toHaveURL(/services$/);
    await expect(page.getByRole('link', { name: 'Français', exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Informática, servidores e backups', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('preserves the current page when changing language', async ({ page }) => {
    await page.goto('/services');

    await page.getByText('Menu', { exact: true }).click();
    await page.getByRole('link', { name: 'Français', exact: true }).click();

    await expect(page).toHaveURL(/fr\/services$/);
    await expect(page.getByRole('heading', { name: 'Informatique, serveurs et sauvegardes', exact: true })).toBeVisible();
  });
});

test.describe('Responsive layout', () => {
  for (const width of [320, 360, 390, 768, 1440]) {
    test(`fits the viewport at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});

test.describe('FAQ', () => {
  test('exposes only the expanded answer', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('region', { name: 'Quanto tempo leva para começar?', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Como funciona a manutenção?', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Como funciona a manutenção?', exact: true }).click();

    await expect(page.getByRole('region', { name: 'Como funciona a manutenção?', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Quanto tempo leva para começar?', exact: true })).toHaveCount(0);
  });
});
