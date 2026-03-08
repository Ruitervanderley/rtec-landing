import { expect, takeSnapshot, test } from '@chromatic-com/playwright';

test.describe('Visual testing', () => {
  test.describe('Static pages', () => {
    test('should take screenshot of the homepage', async ({ page }, testInfo) => {
      await page.goto('/');

      await expect(
        page.getByRole('heading', { name: /Automatizamos suas operações/i }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });

    test('should take screenshot of the portfolio page', async ({ page }, testInfo) => {
      await page.goto('/portfolio');

      await expect(
        page.getByRole('heading', { name: /Nossos casos de sucesso/i }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });

    test('should take screenshot of the about page', async ({ page }, testInfo) => {
      await page.goto('/about');

      await expect(
        page.getByRole('heading', { name: /Tecnologia com base sólida e visão de futuro/i }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });

    test('should take screenshot of the French homepage', async ({ page }, testInfo) => {
      await page.goto('/fr');

      await expect(
        page.getByRole('heading', { name: /Nous automatisons vos opérations/i }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });
  });
});
