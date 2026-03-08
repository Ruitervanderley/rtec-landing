import { expect, test } from '@playwright/test';

test.describe('I18n', () => {
  test.describe('Marketing pages', () => {
    test('should render Portuguese copy on the homepage by default', async ({ page }) => {
      await page.goto('/');

      await expect(
        page.getByRole('heading', { name: /Automatizamos suas operações/i }),
      ).toBeVisible();

      await expect(
        page.getByRole('link', { name: 'Falar com um especialista' }).first(),
      ).toBeVisible();
    });

    test('should render French copy on the homepage', async ({ page }) => {
      await page.goto('/fr');

      await expect(
        page.getByRole('heading', { name: /Nous automatisons vos opérations/i }),
      ).toBeVisible();

      await expect(
        page.getByRole('link', { name: 'Parler à un expert' }).first(),
      ).toBeVisible();
    });

    test('should render French copy on the about page', async ({ page }) => {
      await page.goto('/fr/about');

      await expect(
        page.getByRole('heading', { name: /Une base technique solide avec une vision tournée vers l'avenir/i }),
      ).toBeVisible();
    });
  });
});
