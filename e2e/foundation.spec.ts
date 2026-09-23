import {expect, test} from '@playwright/test';
import {viewports} from './support/viewports';

test('boots the Romanian and English landing routes', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByRole('heading', {level: 1})).toContainText('Toate documentele');
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toContainText("All your suppliers'");
});

test('shows the development-only primitive preview without horizontal overflow', async ({page}) => {
  await page.goto('/__dev/design-system');
  await expect(page.getByRole('heading', {name: 'Previzualizare sistem de design'})).toBeVisible();
  await expect(page.getByText('DEBIRO')).toBeVisible();
  await page.setViewportSize(viewports.mobile);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewports.mobile.width);
});
