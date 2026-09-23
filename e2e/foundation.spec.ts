import {expect, test} from '@playwright/test';

test('boots the Romanian placeholder and English route', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByRole('heading', {level: 1})).toContainText('Fundația interfeței');
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toContainText('interface foundation');
});

test('shows the development-only primitive preview without horizontal overflow', async ({page}) => {
  await page.goto('/__dev/design-system');
  await expect(page.getByRole('heading', {name: 'Previzualizare sistem de design'})).toBeVisible();
  await expect(page.getByText('debiro')).toBeVisible();
  await page.setViewportSize({width: 375, height: 812});
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
