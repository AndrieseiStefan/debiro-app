import {expect, test} from '@playwright/test';

test('renders the Romanian vendors list inside the shared authenticated shell', async ({page}) => {
  const response = await page.goto('/vendors');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Furnizori');
  const navigation = page.getByRole('navigation', {name: 'Navigare în aplicație'});
  await expect(navigation.getByRole('link', {name: 'Furnizori'})).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', {name: 'Dashboard'})).not.toHaveAttribute('aria-current');
  await expect(page.getByRole('button', {name: 'Adaugă furnizor'})).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(9);
  await expect(page.getByText('Afișez 1 – 8 din 24 furnizori')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'})).toHaveAttribute('href', '/vendors/construct-pro');
});

test('renders English vendors and keeps locale switching on the current route', async ({page}) => {
  await page.goto('/en/vendors');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Suppliers');
  await expect(page.getByRole('columnheader', {name: 'NEXT EXPIRY'})).toBeVisible();
  await page.setViewportSize({width: 375, height: 812});
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
});

test('keeps vendors controls and table usable without document overflow', async ({page}) => {
  await page.goto('/vendors');
  for (const {width, height} of [
    {width: 1448, height: 1086},
    {width: 1024, height: 768},
    {width: 801, height: 900},
    {width: 800, height: 900},
    {width: 600, height: 800},
    {width: 375, height: 812},
    {width: 320, height: 700}
  ]) {
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({width, height});
      await expect(page.getByRole('heading', {level: 1, name: 'Furnizori'})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Adaugă furnizor'})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Furnizori', exact: true})).toHaveAttribute('aria-current', 'page');
      await expect(page.getByRole('searchbox', {name: 'Caută furnizori după nume, CUI sau persoană de contact'})).toBeVisible();
      const geometry = await page.evaluate(() => {
        const tableRegion = document.querySelector('[role="region"][aria-label="Tabel furnizori"]')!;
        const table = tableRegion.querySelector('table')!;
        const main = document.querySelector('main')!.getBoundingClientRect();
        const region = tableRegion.getBoundingClientRect();
        const sidebar = document.querySelector('aside[aria-label="Bară laterală aplicație"]')!.getBoundingClientRect();
        const header = document.querySelector('header')!.getBoundingClientRect();
        return {
          documentWidth: document.documentElement.scrollWidth,
          mainRight: main.right,
          regionLeft: region.left,
          regionRight: region.right,
          regionClientWidth: tableRegion.clientWidth,
          tableScrollWidth: tableRegion.scrollWidth,
          tableWidth: table.getBoundingClientRect().width,
          sidebarBottom: sidebar.bottom,
          headerTop: header.top,
          headerBottom: header.bottom,
          mainTop: main.top
        };
      });
      expect(geometry.documentWidth).toBeLessThanOrEqual(width);
      expect(geometry.regionLeft).toBeGreaterThanOrEqual(0);
      expect(geometry.regionRight).toBeLessThanOrEqual(geometry.mainRight + 1);
      if (width <= 1024) expect(geometry.tableScrollWidth).toBeGreaterThan(geometry.regionClientWidth);
      if (width <= 800) {
        expect(geometry.sidebarBottom).toBeLessThanOrEqual(geometry.headerTop + 1);
        expect(geometry.headerBottom).toBeLessThanOrEqual(geometry.mainTop + 1);
      }
    });
  }
});

test('filters and paginates fixture vendors locally', async ({page}) => {
  await page.goto('/vendors');
  await page.getByRole('button', {name: '2', exact: true}).click();
  await expect(page.getByText('Alpha Construction SRL')).toBeVisible();
  await page.getByRole('searchbox', {name: 'Caută furnizori după nume, CUI sau persoană de contact'}).fill('Tech Solutions');
  await expect(page.getByText('Afișez 1 – 1 din 1 furnizori')).toBeVisible();
  await page.getByRole('combobox', {name: 'Status'}).selectOption('attention');
  await expect(page.getByText('Niciun furnizor nu corespunde filtrelor.')).toBeVisible();
});
