import { expect, takeSnapshot, test } from '@chromatic-com/playwright';

test.describe('Visual testing', () => {
  test.describe('Static pages', () => {
    test('takes screenshot of the homepage', async ({ page }, testInfo) => {
      await page.goto('/');

      await expect(
        page.getByRole('heading', { name: /Segurança eletrônica e informática/i }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });

    test('takes screenshot of the portfolio page', async ({ page }, testInfo) => {
      await page.goto('/portfolio');

      await expect(
        page.getByRole('heading', { name: /Provas de execução em operações críticas/i }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });

    test('takes screenshot of the about page', async ({ page }, testInfo) => {
      await page.goto('/about');

      await expect(
        page.getByRole('heading', { name: /Segurança eletrônica, informática, redes e servidores/i }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });

    test('takes screenshot of the French homepage', async ({ page }, testInfo) => {
      await page.goto('/fr');

      await expect(
        page.getByRole('heading', { name: /Sécurité électronique et informatique/i }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });
  });
});
