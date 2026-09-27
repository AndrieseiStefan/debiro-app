import path from 'node:path';
import {expect, test} from '@playwright/test';

const route = process.env.VISUAL_ROUTE ?? '/__dev/design-system';
const action = process.env.VISUAL_ACTION;
const viewportWidth = process.env.VISUAL_WIDTH ? Number(process.env.VISUAL_WIDTH) : undefined;
const viewportHeight = process.env.VISUAL_HEIGHT ? Number(process.env.VISUAL_HEIGHT) : undefined;

test('capture an unapproved route screenshot for manual mockup comparison', async ({page}) => {
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('..')) {
    throw new Error('VISUAL_ROUTE must be a local absolute pathname without traversal.');
  }
  if (viewportWidth !== undefined || viewportHeight !== undefined) {
    if (viewportWidth === undefined || viewportHeight === undefined || !Number.isInteger(viewportWidth) ||
        !Number.isInteger(viewportHeight) || viewportWidth < 320 || viewportHeight < 320) {
      throw new Error('VISUAL_WIDTH and VISUAL_HEIGHT must both be integers of at least 320.');
    }
    await page.setViewportSize({width: viewportWidth, height: viewportHeight});
  }

  await page.clock.setFixedTime(new Date('2025-01-15T12:00:00Z'));
  const response = await page.goto(route);
  expect(response?.status()).toBeLessThan(400);
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { await document.fonts.ready; });
  if (action) {
    if (action === 'invite-vendor') {
      await page.getByRole('button', {name: 'Invită furnizor'}).click();
      await expect(page.getByRole('dialog', {name: 'Invită furnizorul să încarce documentele'})).toBeVisible();
    } else if (action === 'add-vendor' || action === 'add-vendor-end' || action === 'add-vendor-created') {
      if (route !== '/vendors' && route !== '/en/vendors') throw new Error('Add Vendor capture action requires a vendors route.');
      const english = route.startsWith('/en');
      await page.getByRole('button', {name: english ? 'Add supplier' : 'Adaugă furnizor', exact: true}).click();
      const dialog = page.getByRole('dialog', {name: english ? 'Add supplier' : 'Adaugă furnizor'});
      await expect(dialog).toBeVisible();
      if (action === 'add-vendor-end') await dialog.evaluate((element) => {element.scrollTop = element.scrollHeight;});
      if (action === 'add-vendor-created') {
        await dialog.getByRole('textbox', {name: english ? /Supplier name/ : /Numele furnizorului/}).fill('Atelier Verde SRL');
        await dialog.getByRole('textbox', {name: english ? /CUI \/ Tax ID/ : /CUI \/ Cod fiscal/}).fill('RO24681357');
        await dialog.getByRole('textbox', {name: english ? /Contact email/ : /Email de contact/}).fill('contact@atelierverde.ro');
        await dialog.getByRole('combobox', {name: english ? /Category/ : /Categorie/}).selectOption('construction');
        await dialog.getByRole('button', {name: english ? 'Add supplier' : 'Adaugă furnizor', exact: true}).click();
        await expect(page.getByRole('heading', {name: 'Atelier Verde SRL', level: 1})).toBeVisible();
      }
    } else if (action === 'onboarding-step2' || action === 'onboarding-step3') {
      if (route !== '/onboarding' && route !== '/en/onboarding') throw new Error('Onboarding capture action requires an onboarding route.');
      await page.getByRole('button', {name: route.startsWith('/en') ? 'Continue' : 'Continuă'}).click();
      if (action === 'onboarding-step3') await page.getByRole('button', {name: route.startsWith('/en') ? 'Configure later' : 'Configurează mai târziu'}).click();
    } else throw new Error('Unknown VISUAL_ACTION.');
  }

  const name = route === '/' ? 'root' : route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const output = path.join(process.cwd(), 'artifacts', 'visual', `${name}${action ? `-${action}` : ''}${viewportWidth ? `-${viewportWidth}x${viewportHeight}` : ''}.png`);
  await page.screenshot({path: output, fullPage: !action, animations: 'disabled'});
});
