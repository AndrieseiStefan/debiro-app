import path from 'node:path';
import {expect, test} from '@playwright/test';

const route = process.env.VISUAL_ROUTE ?? '/__dev/design-system';
const action = process.env.VISUAL_ACTION;

test('capture an unapproved route screenshot for manual mockup comparison', async ({page}) => {
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('..')) {
    throw new Error('VISUAL_ROUTE must be a local absolute pathname without traversal.');
  }

  await page.clock.setFixedTime(new Date('2025-01-15T12:00:00Z'));
  const response = await page.goto(route);
  expect(response?.status()).toBeLessThan(400);
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { await document.fonts.ready; });
  if (action) {
    if (action !== 'invite-vendor') throw new Error('Unknown VISUAL_ACTION.');
    await page.getByRole('button', {name: 'Invită furnizor'}).click();
    await expect(page.getByRole('dialog', {name: 'Invită furnizorul să încarce documentele'})).toBeVisible();
  }

  const name = route === '/' ? 'root' : route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const output = path.join(process.cwd(), 'artifacts', 'visual', `${name}${action ? `-${action}` : ''}.png`);
  await page.screenshot({path: output, fullPage: !action, animations: 'disabled'});
});
