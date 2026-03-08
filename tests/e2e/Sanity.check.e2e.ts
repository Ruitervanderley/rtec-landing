import { expect, test } from '@playwright/test';

test.describe('Sanity', () => {
  test.describe('Static pages', () => {
    test('should display the homepage', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/`);

      await expect(
        page.getByRole('heading', { name: /Automatizamos suas operações/i }),
      ).toBeVisible();
    });

    test('should display the about page', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/about`);

      await expect(
        page.getByRole('heading', { name: /Tecnologia com base sólida e visão de futuro/i }),
      ).toBeVisible();
    });

    test('should navigate to the portfolio page', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/`);

      await page.getByRole('link', { name: 'Portfólio' }).click();

      await expect(page).toHaveURL(/portfolio$/);

      await expect(
        page.getByRole('heading', { name: /Nossos casos de sucesso/i }),
      ).toBeVisible();
    });
  });
});
