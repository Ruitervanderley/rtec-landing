import { expect, test } from '@playwright/test';

test.describe('I18n', () => {
  test.describe('Marketing pages', () => {
    test('renders Portuguese copy on the homepage by default', async ({ page }) => {
      await page.goto('/');

      await expect(
        page.getByRole('heading', { name: /Segurança eletrônica e informática/i }),
      ).toBeVisible();

      await expect(
        page.getByRole('link', { name: 'Solicitar avaliação' }).first(),
      ).toBeVisible();
    });

    test('renders French copy on the homepage', async ({ page }) => {
      await page.goto('/fr');

      await expect(
        page.getByRole('heading', { name: /Sécurité électronique et informatique/i }),
      ).toBeVisible();

      await expect(
        page.getByRole('link', { name: 'Demander une évaluation' }).first(),
      ).toBeVisible();
    });

    test('renders French copy on the about page', async ({ page }) => {
      await page.goto('/fr/about');

      await expect(
        page.getByRole('heading', { name: /Sécurité électronique, informatique, réseaux et serveurs/i }),
      ).toBeVisible();
    });
  });
});
