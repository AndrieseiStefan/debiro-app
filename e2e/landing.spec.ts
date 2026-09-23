import {expect, test} from '@playwright/test';

test('renders canonical Romanian copy, navigation and textual branding', async ({page}) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', {level: 1})).toHaveText(/Toate documentele furnizorilor tăi, într-un singur loc\./);
  await expect(page.getByRole('navigation', {name: 'Navigare principală'})).toBeVisible();
  await expect(page.getByRole('button', {name: /Încearcă gratuit/}).first()).toBeVisible();
  const brand = page.getByRole('link', {name: 'debiro'});
  await expect(brand).toHaveText('debiro');
  await expect(brand.locator('img, svg')).toHaveCount(0);
  await expect(page.getByText('Fără Excel. Fără stres.', {exact: false})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
});

test('renders English copy and switches locale', async ({page}) => {
  const response = await page.goto('/en');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toContainText("All your suppliers'");
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
});

test('avoids document-level horizontal overflow at desktop and narrow widths', async ({page}) => {
  await page.goto('/');
  for (const width of [1448, 375, 320]) {
    await page.setViewportSize({width, height: 1086});
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('provides a visible keyboard focus indicator', async ({page}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name: 'debiro'})).toBeFocused();
  await expect(page.getByRole('link', {name: 'debiro'})).toHaveCSS('outline-style', 'solid');
});
