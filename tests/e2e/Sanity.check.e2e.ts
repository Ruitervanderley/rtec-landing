import { expect, test } from '@playwright/test';

test.describe('Sanity', () => {
  test.describe('Static pages', () => {
    test('displays the homepage', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/`);

      await expect(
        page.getByRole('heading', { name: /Segurança eletrônica e informática/i }),
      ).toBeVisible();
    });

    test('displays the about page', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/about`);

      await expect(
        page.getByRole('heading', { name: /Segurança eletrônica, informática, redes e servidores/i }),
      ).toBeVisible();
    });

    test('navigates to the portfolio page', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/`);

      await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Portfólio' }).click();

      await expect(page).toHaveURL(/portfolio$/);

      await expect(
        page.getByRole('heading', { name: /Provas de execução em operações críticas/i }),
      ).toBeVisible();
    });
  });
});
