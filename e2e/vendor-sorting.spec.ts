import {expect, test, type Page} from '@playwright/test';
import {openFilters} from './support/filters';
import en from '../messages/en.json' with {type: 'json'};
import ro from '../messages/ro.json' with {type: 'json'};
import {vendorsListFixture} from '../src/features/vendors/fixtures';
import {readDocumentRecords} from '../src/features/documents/created-documents';
import {getVendorRequirements, readVendorRequirements} from '../src/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '../src/features/vendors/projections';

type Column = 'vendor' | 'category' | 'generalStatus' | 'documents' | 'nextExpiry';
const columns: Column[] = ['vendor', 'category', 'generalStatus', 'documents', 'nextExpiry'];
const fixtures = vendorsListFixture.vendors.map((vendor) => projectVendorDocuments(vendor, getVendorRequirements(readVendorRequirements(), 'demo-company', vendor.id), readDocumentRecords(), 'demo-company'));
const ids = (page: Page) => page.locator('tbody tr[data-vendor-id]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-vendor-id')));

for (const locale of ['ro', 'en'] as const) {
  const t = (locale === 'ro' ? ro : en).Vendors;
  const route = locale === 'ro' ? '/vendors' : '/en/vendors';
  const byName = (a: typeof fixtures[number], b: typeof fixtures[number]) => a.name.localeCompare(b.name, locale, {sensitivity: 'base'});
  const expected = (column: Column, descending: boolean) => [...fixtures].sort((a, b) => {
    let comparison = 0;
    if (column === 'vendor') comparison = byName(a, b);
    if (column === 'category') comparison = t.category[a.category].localeCompare(t.category[b.category], locale, {sensitivity: 'base'});
    if (column === 'generalStatus') comparison = ['compliant', 'attention', 'noncompliant'].indexOf(a.status) - ['compliant', 'attention', 'noncompliant'].indexOf(b.status);
    if (column === 'documents') comparison = (a.documentTarget ? a.documentCount / a.documentTarget : 0) - (b.documentTarget ? b.documentCount / b.documentTarget : 0);
    if (column === 'nextExpiry') {
      if (!a.nextExpiry.date && b.nextExpiry.date) return 1;
      if (a.nextExpiry.date && !b.nextExpiry.date) return -1;
      if (a.nextExpiry.date && b.nextExpiry.date) comparison = Date.parse(a.nextExpiry.date) - Date.parse(b.nextExpiry.date);
    }
    return comparison * (descending ? -1 : 1) || byName(a, b);
  }).map((row) => row.id);

  test(`${locale}: all five headers toggle semantic ordering and expose exactly one active sort`, async ({page}) => {
    await page.goto(route);
    const table = page.getByRole('table');
    await page.getByRole('combobox', {name: t.pageSizeLabel}).selectOption('24');
    await expect(page.locator('tbody tr[data-vendor-id]')).toHaveCount(24);
    expect(await ids(page)).toEqual(fixtures.map((row) => row.id));
    const actions = table.getByRole('columnheader', {name: t.table.actions, exact: true});
    await expect(actions.getByRole('button')).toHaveCount(0);
    await expect(actions).not.toHaveAttribute('aria-sort');

    for (const column of columns) {
      const header = table.getByRole('columnheader', {name: t.table[column], exact: true});
      const button = header.getByRole('button');
      await button.click();
      await expect(header).toHaveAttribute('aria-sort', 'ascending');
      await expect(table.locator('th[aria-sort]')).toHaveCount(1);
      expect(await ids(page)).toEqual(expected(column, false));
      await button.click();
      await expect(header).toHaveAttribute('aria-sort', 'descending');
      expect(await ids(page)).toEqual(expected(column, true));
    }
  });

  test(`${locale}: sorting combines with filters, page sizes, pagination and retained inactive compliance`, async ({page}) => {
    await page.goto(route);
    const pagination = page.getByRole('navigation', {name: t.paginationLabel});
    const table = page.getByRole('table');
    const nameHeader = table.getByRole('columnheader', {name: t.table.vendor});
    await pagination.getByRole('button', {name: '3', exact: true}).click();
    await nameHeader.getByRole('button').click();
    await expect(pagination.getByRole('button', {name: '1', exact: true})).toHaveAttribute('aria-current', 'page');
    expect(await ids(page)).toEqual(expected('vendor', false).slice(0, 8));
    await pagination.getByRole('button', {name: '2', exact: true}).click();
    expect(await ids(page)).toEqual(expected('vendor', false).slice(8, 16));
    await page.getByRole('combobox', {name: t.pageSizeLabel}).selectOption('16');
    expect(await ids(page)).toEqual(expected('vendor', false).slice(0, 16));

    await openFilters(page);
    await page.getByRole('combobox', {name: t.categoryLabel}).selectOption('construction');
    expect(await ids(page)).toEqual(['alpha-construction', 'construct-pro', 'delta-construct']);
    await table.getByRole('columnheader', {name: t.table.documents}).getByRole('button').click();
    expect(await ids(page)).toEqual(['delta-construct', 'construct-pro', 'alpha-construction']);
    const row = page.locator('[data-vendor-id="construct-pro"]');
    await row.getByRole('button', {name: t.rowAction.replace('{name}', 'Construct Pro SRL')}).click();
    await page.getByRole('menuitem', {name: t.markInactive}).click();
    await expect(row).toHaveAttribute('data-lifecycle', 'inactive');
    expect(await ids(page)).toEqual(['delta-construct', 'construct-pro', 'alpha-construction']);
    await openFilters(page);
    await page.getByRole('combobox', {name: locale === 'ro' ? ro.DataFilters.complianceStatus : en.DataFilters.complianceStatus}).selectOption('compliant');
    expect(await ids(page)).toEqual([]);
    await page.getByRole('searchbox', {name: t.searchLabel}).fill('Construct');
    expect(await ids(page)).toEqual([]);
    await page.getByRole('searchbox', {name: t.searchLabel}).fill('RO12345678');
    await expect(table.getByText(t.noResults)).toBeVisible();
    await openFilters(page);
    await page.getByRole('combobox', {name: locale === 'ro' ? ro.DataFilters.complianceStatus : en.DataFilters.complianceStatus}).selectOption('attention');
    expect(await ids(page)).toEqual(['construct-pro']);
    await table.getByRole('columnheader', {name: t.table.generalStatus}).getByRole('button').click();
    expect(await ids(page)).toEqual(['construct-pro']);
    await openFilters(page);
    await page.getByRole('combobox', {name: locale === 'ro' ? ro.DataFilters.complianceStatus : en.DataFilters.complianceStatus}).selectOption('attention');
    await page.keyboard.press('Escape');
    await row.getByRole('button', {name: t.rowAction.replace('{name}', 'Construct Pro SRL')}).click();
    await page.getByRole('menuitem', {name: t.markActive}).click();
    await expect(row).toHaveAttribute('data-lifecycle', 'active');
  });

  test(`${locale}: local vendors have zero completion and missing expiries sort last in either direction`, async ({page}) => {
    await page.goto(route);
    await page.getByRole('button', {name: t.addVendor, exact: true}).click();
    const drawer = page.getByRole('dialog', {name: t.addVendor});
    await drawer.getByRole('textbox', {name: locale === 'ro' ? /Numele furnizorului/ : /Supplier name/}).fill('Zulu Local SRL');
    await drawer.getByRole('textbox', {name: locale === 'ro' ? /CUI \/ Cod fiscal/ : /CUI \/ Tax ID/}).fill('RO99990001');
    await drawer.getByRole('textbox', {name: locale === 'ro' ? /Email de contact/ : /Contact email/}).fill('zulu@example.test');
    await drawer.getByRole('combobox', {name: new RegExp(t.categoryLabel)}).selectOption('construction');
    await drawer.getByRole('button', {name: t.addVendor, exact: true}).click();
    await expect(page).toHaveURL(/\/vendors\/local-/);
    await page.getByRole('navigation', {name: (locale === 'ro' ? ro : en).VendorDetails.breadcrumbLabel}).getByRole('link', {name: t.title, exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    const table = page.getByRole('table');
    await table.getByRole('columnheader', {name: t.table.documents}).getByRole('button').click();
    await expect(page.locator('tbody tr[data-vendor-id]').first()).toContainText('Artisan Food SRL');
    for (const first of ['terra-materials', 'build-more']) {
      await table.getByRole('columnheader', {name: t.table.nextExpiry}).getByRole('button').click();
      expect((await ids(page))[0]).toBe(first);
      await page.getByRole('navigation', {name: t.paginationLabel}).getByRole('button', {name: '4', exact: true}).click();
      await expect(page.locator('tbody tr[data-vendor-id]')).toHaveCount(1);
      await expect(page.locator('tbody tr[data-vendor-id]').last()).toContainText('Zulu Local SRL');
    }
  });
}

test('sortable headers remain keyboard accessible and contained at desktop/reduced/mobile widths', async ({page}) => {
  await page.goto('/vendors');
  for (const width of [1448, 1024, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    for (const column of columns) {
      const header = page.getByRole('columnheader', {name: ro.Vendors.table[column], exact: true});
      const button = header.getByRole('button');
      await button.scrollIntoViewIfNeeded();
      await button.focus();
      await expect(button).toBeFocused();
      const outline = await button.evaluate((element) => ({style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth)}));
      expect(outline.style).not.toBe('none');
      expect(outline.width).toBeGreaterThanOrEqual(2);
      await page.keyboard.press('Enter');
      await expect(header).toHaveAttribute('aria-sort', 'ascending');
      await page.keyboard.press('Space');
      await expect(header).toHaveAttribute('aria-sort', 'descending');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
});
