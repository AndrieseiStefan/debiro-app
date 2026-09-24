import {expect, test} from '@playwright/test';
import {boundaryViewports, viewports} from './support/viewports';

test('renders the canonical Romanian dashboard in the authenticated shell', async ({page}) => {
  const response = await page.goto('/dashboard');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Bun venit, Andrei!');
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Dashboard'})).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('searchbox', {name: 'Caută furnizori, documente sau cerințe'})).toBeVisible();
  await page.getByRole('searchbox').fill('Construct Pro');
  await expect(page.getByRole('searchbox')).toHaveValue('Construct Pro');
  await expect(page.getByRole('heading', {name: 'Documente care necesită atenție'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Status furnizori'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Activitate recentă'})).toBeVisible();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(6);
  await expect(page.getByRole('button', {name: 'Adaugă furnizor'})).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('img', {name: 'Status furnizori: 24 furnizori'})).toBeVisible();
  await expect(page.getByRole('banner').getByText('DEBIRO')).toHaveCount(0);
});

test('renders English localization and switches back to Romanian', async ({page}) => {
  const response = await page.goto('/en/dashboard');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Welcome, Andrei!');
  await expect(page.getByRole('heading', {name: 'Documents needing attention'})).toBeVisible();
  await page.setViewportSize({width: 320, height: 700});
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
});

test('keeps dashboard regions separated and document overflow contained', async ({page}) => {
  await page.goto('/dashboard');
  const matrix = [viewports.desktop, viewports.tablet, viewports.mobile, {width: 320, height: 700}, ...boundaryViewports];

  for (const {width, height} of matrix) {
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({width, height});
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'})).toBeVisible();
      await expect(page.getByRole('searchbox')).toBeVisible();
      await expect(page.getByRole('heading', {name: 'Documente care necesită atenție'})).toBeVisible();
      await expect(page.getByRole('heading', {name: 'Status furnizori'})).toBeVisible();

      const geometry = await page.evaluate(() => {
        const bounds = (element: Element) => {
          const {left, right, top, bottom} = element.getBoundingClientRect();
          return {left, right, top, bottom};
        };
        const sidebar = bounds(document.querySelector('aside[aria-label="Bară laterală aplicație"]')!);
        const header = bounds(document.querySelector('header')!);
        const main = bounds(document.querySelector('main')!);
        const table = document.querySelector('table')!;
        const scrollContainer = table.parentElement!;
        return {
          scrollWidth: document.documentElement.scrollWidth,
          sidebar,
          header,
          main,
          tableScrollContained: scrollContainer.scrollWidth <= scrollContainer.clientWidth || scrollContainer.scrollWidth > scrollContainer.clientWidth && scrollContainer.clientWidth <= main.right - main.left
        };
      });

      expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
      expect(geometry.tableScrollContained).toBe(true);
      if (width > 800) {
        expect(geometry.sidebar.right).toBeLessThanOrEqual(geometry.main.left + 1);
        expect(geometry.header.bottom).toBeLessThanOrEqual(geometry.main.top + 1);
      } else {
        expect(geometry.sidebar.bottom).toBeLessThanOrEqual(geometry.header.top + 1);
        expect(geometry.header.bottom).toBeLessThanOrEqual(geometry.main.top + 1);
      }
    });
  }
});
