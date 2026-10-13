import {expect, test, type Page} from '@playwright/test';
import {createWorkspaceCompany, switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

const routes = ['/dashboard', '/vendors', '/vendors/construct-pro', '/documents', '/documents/construct-pro-tax-2024/review', '/requirements', '/notifications', '/company/settings/profile', '/company/settings/members', '/company/settings/billing'];
async function switchToOther(page: Page, english: boolean) {
  await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
  await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} global Profile breadcrumbs use locale-preserving Profile parent links`, async ({page}) => {
    for (const [route, current] of [['/profile', english ? 'Profile' : 'Profil'], ['/profile/companies', english ? 'My Companies' : 'Companiile mele'], ['/invitations', english ? 'My Invitations' : 'Invitațiile mele']]) {
      await page.goto(prefix + route);
      const breadcrumb = page.locator('main').getByRole('navigation').first();
      await expect(breadcrumb).not.toContainText('Dashboard');
      await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(current);
      if (route === '/profile') {await expect(breadcrumb).toHaveText(current); await expect(breadcrumb.getByRole('link')).toHaveCount(0);}
      else {
        const parent = breadcrumb.getByRole('link', {name: english ? 'Profile' : 'Profil', exact: true});
        await expect(parent).toHaveAttribute('href', prefix + '/profile');
        await parent.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(prefix + '/profile');
      }
    }
  });
  test(`${english ? 'EN' : 'RO'} dirty global Profile survives company switches but actual navigation still guards it`, async ({page}) => {
    await page.goto(prefix + '/profile?from=account');
    await page.locator('#user-firstName').fill('Unsaved Profile'); await page.locator('#user-phone').fill('Draft phone');
    const summary = page.getByRole('switch', {name: english ? /^Reports and summaries/ : /^Rapoarte și rezumate/}); await summary.check();
    await switchToOther(page, english);
    await expect(page).toHaveURL(prefix + '/profile?from=account'); await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.locator('#user-firstName')).toHaveValue('Unsaved Profile'); await expect(page.locator('#user-phone')).toHaveValue('Draft phone'); await expect(summary).toBeChecked();
    const identity = page.getByRole('button', {name: english ? 'User profile: Andrei Popescu' : 'Profil utilizator: Andrei Popescu'});
    await identity.click(); const menu = page.getByRole('dialog', {name: english ? 'Profile menu' : 'Meniu profil'});
    await expect(menu).toContainText('Reviewer'); await expect(menu).toContainText('Global Clean Services'); await expect(menu).toContainText('andrei.popescu@demo.ro'); await expect(menu).toContainText('AP'); await page.keyboard.press('Escape');
    await page.getByRole('button', {name: 'Global Clean Services', exact: true}).click();
    await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Demo Company SRL/}).click();
    await expect(page).toHaveURL(prefix + '/profile?from=account'); await expect(page.locator('#user-firstName')).toHaveValue('Unsaved Profile'); await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await page.getByRole('link', {name: english ? 'Suppliers' : 'Furnizori', exact: true}).click();
    const confirmation = page.getByRole('alertdialog'); await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', {name: english ? 'Continue editing' : 'Continuă editarea'}).click(); await expect(page.locator('#user-firstName')).toHaveValue('Unsaved Profile');
    await page.getByRole('link', {name: english ? 'Suppliers' : 'Furnizori', exact: true}).click();
    await confirmation.getByRole('button', {name: english ? 'Discard changes' : 'Renunță la modificări'}).click(); await expect(page).toHaveURL(prefix + '/vendors');
  });
  test(`${english ? 'EN' : 'RO'} Invitations filter and My Companies form/active indicator survive switches`, async ({page}) => {
    await page.setViewportSize({width: 375, height: 812});
    await page.goto(prefix + '/invitations'); await page.locator('#invitation-filter').selectOption('pending'); await switchToOther(page, english);
    await expect(page).toHaveURL(prefix + '/invitations'); await expect(page.locator('#invitation-filter')).toHaveValue('pending');
    await expect(page.locator('[data-invitation-id]')).toHaveCount(1); await expect(page.locator('[data-invitation-id="invitation-construct-group"]')).toHaveAttribute('data-status', 'pending');
    await page.getByRole('button', {name: english ? 'User profile: Andrei Popescu' : 'Profil utilizator: Andrei Popescu'}).click();
    await page.getByRole('dialog', {name: english ? 'Profile menu' : 'Meniu profil'}).getByRole('link', {name: english ? 'My companies 2' : 'Companiile mele 2'}).click();
    await page.locator('#create-company-form input').first().fill('Retained company draft');
    const global = page.locator('[data-company-id="global-clean-services"]'), demo = page.locator('[data-company-id="demo-company"]');
    await expect(global).toHaveAttribute('data-active', 'true'); await demo.getByRole('button', {name: english ? 'Switch' : 'Comută', exact: true}).click();
    await expect(page).toHaveURL(prefix + '/profile/companies'); await expect(page.locator('#create-company-form input').first()).toHaveValue('Retained company draft');
    await expect(demo).toHaveAttribute('data-active', 'true'); await expect(global).toHaveAttribute('data-active', 'false');
    await expect(demo).toContainText(english ? 'Active company' : 'Companie activă'); await expect(global).not.toContainText(english ? 'Active company' : 'Companie activă');
  });
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

test('My Companies preserves its route on switch while retaining A/B/A workspace records', async ({page}) => {
  await createWorkspaceCompany(page, 'Switch B');
  await page.getByRole('button', {name: 'Adaugă primul furnizor'}).click(); const drawer = page.getByRole('dialog');
  await drawer.locator('#add-vendor-name').fill('B preserved'); await drawer.locator('#add-vendor-cui').fill('RO-B-PRESERVED');
  await drawer.locator('#add-vendor-email').fill('b@example.test'); await drawer.locator('#add-vendor-category').selectOption('construction');
  await drawer.getByRole('button', {name: 'Adaugă furnizor', exact: true}).click(); await expect(page).toHaveURL(/\/vendors\/local-/);
  await switchWorkspaceCompany(page, 'Switch B', 'Demo Company SRL'); await expect(page.locator('section[aria-label] [data-tone] strong').first()).toHaveText('24');
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await page.getByRole('dialog', {name: 'Meniu profil'}).getByRole('link', {name: 'Companiile mele 3'}).click();
  await page.locator('[data-company-id^="local-company-"]').getByRole('button', {name: 'Comută', exact: true}).click();
  await expect(page).toHaveURL(/\/profile\/companies$/); await expect(page.getByRole('button', {name: 'Switch B', exact: true})).toBeVisible();
  await expect(page.locator('[data-company-id^="local-company-"]')).toHaveAttribute('data-active', 'true');
  await workspaceSection(page, 'dashboard');
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
