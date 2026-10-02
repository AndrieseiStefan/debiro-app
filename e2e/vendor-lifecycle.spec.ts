import {expect, test, type Page} from '@playwright/test';
import {openFilters} from './support/filters';
import {documentsFixture} from '../src/features/documents/fixtures';

const copy = {
  ro: {prefix: '', title: 'Furnizori', action: 'Acțiuni pentru', open: 'Deschide furnizorul', inactive: 'Marchează ca inactiv', active: 'Marchează ca activ', badge: 'Inactiv',
    search: 'Caută furnizori după nume, CUI sau persoană de contact', category: 'Categorie', status: 'Status', pageSize: 'Furnizori pe pagină', summary: 'Rezumat furnizori', breadcrumbs: 'Navigare pe pagină'},
  en: {prefix: '/en', title: 'Suppliers', action: 'Actions for', open: 'Open supplier', inactive: 'Mark inactive', active: 'Mark active', badge: 'Inactive',
    search: 'Search suppliers by name, registration number or contact person', category: 'Category', status: 'Status', pageSize: 'Suppliers per page', summary: 'Supplier summary', breadcrumbs: 'Breadcrumb'}
};

async function returnToList(page: Page, locale: keyof typeof copy) {
  const c = copy[locale];
  await page.getByRole('navigation', {name: c.breadcrumbs}).getByRole('link', {name: c.title, exact: true}).click();
  await expect(page.getByRole('heading', {level: 1, name: c.title})).toBeVisible();
}

for (const locale of ['ro', 'en'] as const) {
  const c = copy[locale];
  test(`${locale}: every seeded vendor name opens its own Details, with safe missing data`, async ({page}) => {
    await page.goto(`${c.prefix}/vendors`);
    await page.getByRole('combobox', {name: c.pageSize}).selectOption('24');
    const links = await page.locator('tbody tr[data-vendor-id]').evaluateAll((rows) => rows.map((row) => {
      const link = row.querySelector('a')!;
      return {name: link.textContent!, href: link.getAttribute('href')!};
    }));
    expect(links).toHaveLength(24);
    await expect(page.getByRole('table').getByRole('checkbox')).toHaveCount(0);
    for (const vendor of links) {
      await page.getByRole('combobox', {name: c.pageSize}).selectOption('24');
      const nameLink = page.getByRole('table').getByRole('link').filter({hasText: vendor.name});
      await nameLink.click();
      await expect(page).toHaveURL((url) => url.pathname === vendor.href);
      await expect(page.getByRole('heading', {level: 1, name: vendor.name})).toBeVisible();
      if (!vendor.href.endsWith('/construct-pro')) {
        const records = documentsFixture.documents.filter((document) => document.vendorId === vendor.href.split('/').pop());
        await expect(page.getByRole('table').getByRole('row')).toHaveCount(records.length + 1);
        if (records.length) for (const document of records) await expect(page.getByRole('table')).toContainText(document.filename);
        else await expect(page.getByText(locale === 'ro' ? 'Nu există documente încă.' : 'No documents yet.')).toBeVisible();
        await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
        await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
        await expect(page.getByRole('tab', {name: locale === 'ro' ? 'Note' : 'Notes'})).not.toHaveAttribute('aria-disabled');
      }
      await returnToList(page, locale);
    }
  });

  test(`${locale}: context menu lifecycle survives Details, Back and locale changes without data loss`, async ({page}) => {
    await page.goto(`${c.prefix}/vendors/construct-pro`);
    const originalDocuments = await page.getByRole('table').innerText();
    await returnToList(page, locale);
    const row = page.locator('[data-vendor-id="construct-pro"]');
    const trigger = row.getByRole('button', {name: `${c.action} Construct Pro SRL`});
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    let menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveCount(2);
    await expect(menu.getByRole('menuitem', {name: c.open})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', {name: c.inactive})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(row).toHaveAttribute('data-lifecycle', 'inactive');
    await expect(row.getByText(c.badge, {exact: true})).toBeVisible();
    await expect(row).toContainText('3/5');
    const summary = page.getByRole('region', {name: c.summary});
    await expect(summary.locator('[data-status="all"]')).toContainText('24');
    await expect(summary.locator('[data-status="compliant"]')).toContainText('0');
    await expect(summary.locator('[data-status="attention"]')).toContainText('23');
    await trigger.click();
    menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveCount(2);
    await expect(menu.getByRole('menuitem', {name: c.active})).toBeVisible();
    await menu.getByRole('menuitem', {name: c.open}).click();
    await expect(page.locator('[data-vendor-lifecycle]')).toHaveText(c.badge);
    expect(await page.getByRole('table').innerText()).toBe(originalDocuments);
    await page.goBack();
    await expect(row).toHaveAttribute('data-lifecycle', 'inactive');
    await page.getByRole('link', {name: locale === 'ro' ? 'EN' : 'RO', exact: true}).click();
    const other = locale === 'ro' ? 'en' : 'ro';
    const otherCopy = copy[other];
    await expect(page).toHaveURL((url) => url.pathname === `${otherCopy.prefix}/vendors`);
    await expect(page.locator('html')).toHaveAttribute('lang', other);
    await expect(page.getByRole('heading', {level: 1, name: otherCopy.title})).toBeVisible();
    await expect(row).toHaveAttribute('data-lifecycle', 'inactive');
    await row.getByRole('link').click();
    await expect(page).toHaveURL((url) => url.pathname === `${otherCopy.prefix}/vendors/construct-pro`);
    await expect(page.locator('[data-vendor-lifecycle]')).toHaveText(otherCopy.badge);
    await page.getByRole('link', {name: locale.toUpperCase(), exact: true}).click();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page).toHaveURL((url) => url.pathname === `${c.prefix}/vendors/construct-pro`);
    expect(await page.getByRole('table').innerText()).toBe(originalDocuments);
    await returnToList(page, locale);
    await trigger.click();
    await page.getByRole('menuitem', {name: c.active}).click();
    await expect(row).toHaveAttribute('data-lifecycle', 'active');
    await expect(row.getByText(c.badge, {exact: true})).toHaveCount(0);
    await expect(summary.locator('[data-status="compliant"]')).toContainText('0');
    await expect(summary.locator('[data-status="attention"]')).toContainText('24');
    await row.getByRole('link').click();
    await expect(page).toHaveURL((url) => url.pathname === `${c.prefix}/vendors/construct-pro`);
    await expect(page.getByRole('heading', {level: 1, name: 'Construct Pro SRL'})).toBeVisible();
    expect(await page.getByRole('table').innerText()).toBe(originalDocuments);
  });

  test(`${locale}: created vendors share lifecycle behavior and retain contact/notes`, async ({page}) => {
    await page.goto(`${c.prefix}/vendors`);
    await page.getByRole('button', {name: locale === 'ro' ? 'Adaugă furnizor' : 'Add supplier'}).click();
    const drawer = page.getByRole('dialog', {name: locale === 'ro' ? 'Adaugă furnizor' : 'Add supplier'});
    await drawer.locator('#add-vendor-name').fill('Lifecycle Test SRL');
    await drawer.locator('#add-vendor-cui').fill('RO11122233');
    await drawer.locator('#add-vendor-email').fill('local@example.test');
    await drawer.locator('#add-vendor-category').selectOption('software');
    await drawer.locator('#add-vendor-notes').fill('Keep the submitted note.');
    await drawer.getByRole('button', {name: locale === 'ro' ? 'Adaugă furnizor' : 'Add supplier', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Lifecycle Test SRL'})).toBeVisible();
    const route = new URL(page.url()).pathname;
    await returnToList(page, locale);
    const row = page.getByRole('row', {name: /Lifecycle Test SRL/});
    await row.getByRole('button', {name: `${c.action} Lifecycle Test SRL`}).click();
    await page.getByRole('menuitem', {name: c.inactive}).click();
    await expect(row).toHaveAttribute('data-lifecycle', 'inactive');
    await expect(page.getByRole('region', {name: c.summary}).locator('[data-status="all"]')).toContainText('25');
    await expect(page.getByRole('region', {name: c.summary}).locator('[data-status="attention"]')).toContainText('24');
    await row.getByRole('link').click();
    await expect(page).toHaveURL((url) => url.pathname === route);
    await expect(page.locator('[data-vendor-lifecycle]')).toHaveText(c.badge);
    await expect(page.getByRole('link', {name: 'local@example.test'})).toBeVisible();
    await page.getByRole('tab', {name: locale === 'ro' ? 'Note' : 'Notes'}).click();
    await expect(page.getByRole('tabpanel')).toContainText('Keep the submitted note.');
    await returnToList(page, locale);
    await row.getByRole('button', {name: `${c.action} Lifecycle Test SRL`}).click();
    await page.getByRole('menuitem', {name: c.active}).click();
    await expect(row).toHaveAttribute('data-lifecycle', 'active');
    await expect(page.getByRole('region', {name: c.summary}).locator('[data-status="attention"]')).toContainText('25');
    await row.getByRole('link').click();
    await expect(page.locator('[data-vendor-lifecycle]')).toHaveCount(0);
    await expect(page.getByRole('link', {name: 'local@example.test'})).toBeVisible();
  });
}

test('inactive vendors remain searchable/filterable, and pagination is deterministic', async ({page}) => {
  await page.goto('/vendors');
  await page.getByRole('button', {name: '2', exact: true}).click();
  await page.getByRole('button', {name: 'Acțiuni pentru Alpha Construction SRL'}).click();
  await page.getByRole('menuitem', {name: 'Marchează ca inactiv'}).click();
  await expect(page.getByText('Afișez 9 – 16 din 24 furnizori')).toBeVisible();
  await page.getByRole('searchbox', {name: copy.ro.search}).fill('RO21436587');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toHaveAttribute('data-lifecycle', 'inactive');
  await openFilters(page);
  await page.getByRole('combobox', {name: 'Categorie'}).selectOption('construction');
  await page.getByRole('combobox', {name: 'Status conformitate', exact: true}).selectOption('attention');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('searchbox', {name: copy.ro.search}).fill('');
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.locator('[data-vendor-id="alpha-construction"]')).toHaveAttribute('data-lifecycle', 'inactive');
  await openFilters(page);
  await page.getByRole('combobox', {name: 'Categorie'}).selectOption('all');
  await page.getByRole('combobox', {name: 'Status conformitate', exact: true}).selectOption('all');
  await page.getByRole('combobox', {name: copy.ro.pageSize}).selectOption('24');
  await expect(page.locator('tbody tr')).toHaveCount(24);
  await page.getByRole('button', {name: 'Acțiuni pentru Alpha Construction SRL'}).click();
  await page.getByRole('menuitem', {name: 'Marchează ca activ'}).click();
  await expect(page.locator('tbody tr')).toHaveCount(24);
});

test('context menus stay contained and keyboard-accessible in desktop/reduced/mobile table layouts', async ({page}) => {
  await page.goto('/vendors');
  for (const width of [1448, 1024, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    const trigger = page.getByRole('button', {name: 'Acțiuni pentru Medical Supplies'});
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await page.keyboard.press('ArrowUp');
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', {name: 'Marchează ca inactiv'})).toBeFocused();
    const box = await menu.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.keyboard.press('Home');
    await expect(menu.getByRole('menuitem', {name: 'Deschide furnizorul'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole('heading', {name: 'Furnizori', exact: true}).click();
    await expect(menu).toHaveCount(0);
    await trigger.click();
    await page.keyboard.press('Tab');
    await expect(menu).toHaveCount(0);
  }
});

test('additional seeded Details routes render directly with recorded compliance and safe empty contacts', async ({page}) => {
  for (const prefix of ['', '/en']) {
    for (const [id, name, status] of [['global-clean', 'Global Clean Services', 'attention'], ['medical-supplies', 'Medical Supplies', 'attention'], ['alpha-construction', 'Alpha Construction SRL', 'attention']]) {
      const response = await page.goto(`${prefix}/vendors/${id}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', {level: 1, name})).toBeVisible();
      await expect(page.locator('[data-vendor-status]')).toHaveAttribute('data-compliance', status);
      for (const width of [1448, 1024, 758, 375, 320]) {
        await page.setViewportSize({width, height: 812});
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await expect(page.getByRole('heading', {level: 1, name})).toBeVisible();
      }
    }
  }
});
