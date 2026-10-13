import {expect, test, type Page} from '@playwright/test';
import {createWorkspaceCompany, switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

const routes = ['/dashboard', '/vendors', '/vendors/construct-pro', '/documents', '/documents/construct-pro-tax-2024/review', '/requirements', '/notifications', '/company/settings/profile', '/company/settings/members', '/company/settings/billing', '/profile/companies', '/profile', '/invitations'];
async function switchToOther(page: Page, english: boolean) {
  await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
  await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} every existing company switch enters target Dashboard without stale entity UI`, async ({page}) => {
    for (const route of routes) {
      await page.goto(prefix + route); await switchToOther(page, english);
      await expect(page).toHaveURL(new RegExp(`${prefix}/dashboard$`));
      await expect(page.getByRole('button', {name: 'Global Clean Services', exact: true})).toBeVisible();
      await expect(page.locator('section[aria-label] [data-tone] strong').first()).toHaveText('0');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('#review-companyName, [data-vendor-name], [data-version]')).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText('Construct Pro SRL');
      await expect(page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: 'Dashboard', exact: true})).toHaveAttribute('aria-current', 'page');
    }
  });
  test(`${english ? 'EN' : 'RO'} dirty template Cancel preserves state, same-company stays put, and Discard enters Dashboard`, async ({page}) => {
    await page.goto(prefix + '/requirements'); await page.locator('#requirement-template-name').fill('Retain this draft');
    await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
    await page.locator('[data-company-switch-id="demo-company"]').click();
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${prefix}/requirements$`)); await expect(page.locator('#requirement-template-name')).toHaveValue('Retain this draft');
    await switchToOther(page, english); const confirmation = page.getByRole('alertdialog'); await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', {name: english ? 'Continue editing' : 'Continuă editarea'}).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/requirements$`)); await expect(page.locator('#requirement-template-name')).toHaveValue('Retain this draft');
    await expect(page.getByRole('button', {name: 'Demo Company SRL', exact: true})).toBeVisible();
    await switchToOther(page, english); await confirmation.getByRole('button', {name: english ? 'Discard changes' : 'Renunță la modificări'}).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/dashboard$`)); await expect(page.getByRole('button', {name: 'Global Clean Services', exact: true})).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });
}

test('My Companies switch and creation use the same workspace entry and retain A/B/A records', async ({page}) => {
  await createWorkspaceCompany(page, 'Switch B');
  await page.getByRole('button', {name: 'Adaugă primul furnizor'}).click(); const drawer = page.getByRole('dialog');
  await drawer.locator('#add-vendor-name').fill('B preserved'); await drawer.locator('#add-vendor-cui').fill('RO-B-PRESERVED');
  await drawer.locator('#add-vendor-email').fill('b@example.test'); await drawer.locator('#add-vendor-category').selectOption('construction');
  await drawer.getByRole('button', {name: 'Adaugă furnizor', exact: true}).click(); await expect(page).toHaveURL(/\/vendors\/local-/);
  await switchWorkspaceCompany(page, 'Switch B', 'Demo Company SRL'); await expect(page.locator('section[aria-label] [data-tone] strong').first()).toHaveText('24');
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await page.getByRole('dialog', {name: 'Meniu profil'}).getByRole('link', {name: 'Companiile mele 3'}).click();
  await page.locator('[data-company-id^="local-company-"]').getByRole('button', {name: 'Comută', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard$/); await expect(page.getByRole('button', {name: 'Switch B', exact: true})).toBeVisible();
  await expect(page.locator('section[aria-label] [data-tone] strong').first()).toHaveText('1');
  await workspaceSection(page, 'vendors'); await expect(page.getByRole('link', {name: 'Detalii pentru B preserved'})).toBeVisible();
});

for (const {route, open} of [
  {route: '/documents', open: async (page: Page) => {await page.getByRole('row', {name: /ONRC_2024.pdf/}).locator('a').first().click();}},
  {route: '/dashboard', open: async (page: Page) => {await createWorkspaceCompany(page, 'Overlay B'); await page.getByRole('button', {name: 'Adaugă primul furnizor'}).click();}}
]) test(`a confirmed context change closes scoped overlays from ${route}`, async ({page}) => {
  await page.goto(route); await open(page); await expect(page.getByRole('dialog')).toBeVisible();
  // Modal backgrounds are intentionally inert. Simulate a confirmed context change
  // through existing controls rather than making background switching accessible.
  await page.locator('button[aria-haspopup="dialog"]').filter({hasText: route === '/dashboard' ? 'Overlay B' : 'Demo Company SRL'}).evaluate((element: HTMLButtonElement) => element.click());
  await page.locator('[data-company-switch-id="global-clean-services"]').evaluate((element: HTMLButtonElement) => element.click());
  await expect(page).toHaveURL(/\/dashboard$/); await expect(page.getByRole('button', {name: 'Global Clean Services', exact: true})).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('[data-version], #add-vendor-name')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden'); expect(await page.locator('main').evaluate((element) => element.parentElement?.inert)).toBe(false);
});
