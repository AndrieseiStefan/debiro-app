import {expect, test, type Locator} from '@playwright/test';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import {openFilters} from './support/filters';

const searchGeometry = (control: Locator) => control.evaluate((element) => {
  const style = getComputedStyle(element);
  const input = element.querySelector('input')!;
  const value = getComputedStyle(input);
  const placeholder = getComputedStyle(input, '::placeholder');
  return {height: element.getBoundingClientRect().height, background: style.backgroundColor, border: style.border, radius: style.borderRadius, padding: style.padding, gap: style.gap, valueColor: value.color, valueSize: value.fontSize, valueWeight: value.fontWeight, placeholderColor: placeholder.color, placeholderSize: placeholder.fontSize, placeholderWeight: placeholder.fontWeight};
});

for (const locale of ['ro', 'en'] as const) {
  const copy = locale === 'ro' ? ro : en;
  const prefix = locale === 'ro' ? '' : '/en';
  const triggerName = new RegExp(`^${copy.DataFilters.trigger}( \\(\\d+\\))?$`);

  test(`${locale}: Vendors search, filters, reset, sort and pagination compose`, async ({page}) => {
    await page.goto(`${prefix}/vendors`);
    const search = page.getByRole('searchbox', {name: copy.Vendors.searchLabel});
    const trigger = page.getByRole('button', {name: triggerName});
    await page.getByRole('button', {name: '3', exact: true}).click();
    await search.fill('  cOnStRuCt  ');
    await expect(page.locator('tbody tr[data-vendor-id]')).toHaveCount(3);
    await expect(page.getByRole('button', {name: '1', exact: true})).toHaveAttribute('aria-current', 'page');
    await expect(trigger).toHaveText(copy.DataFilters.trigger);
    let panel = await openFilters(page);
    await panel.getByRole('combobox', {name: copy.Vendors.categoryLabel}).selectOption('construction');
    await panel.getByRole('combobox', {name: copy.DataFilters.complianceStatus}).selectOption('attention');
    await expect(trigger).toHaveText(`${copy.DataFilters.trigger} (2)`);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.getByRole('columnheader', {name: copy.Vendors.table.vendor}).getByRole('button').click();
    await expect(page.locator('tbody tr[data-vendor-id]').first()).toHaveAttribute('data-vendor-id', 'alpha-construction');
    panel = await openFilters(page);
    await panel.getByRole('combobox', {name: copy.DataFilters.complianceStatus}).selectOption('noncompliant');
    await expect(page.getByText(copy.Vendors.noResults)).toBeVisible();
    await panel.getByRole('button', {name: copy.DataFilters.reset, exact: true}).click();
    await expect(search).toHaveValue('  cOnStRuCt  ');
    await expect(trigger).toHaveText(copy.DataFilters.trigger);
    await expect(page.locator('tbody tr[data-vendor-id]')).toHaveCount(3);
    await page.keyboard.press('Escape');
    await search.fill('');
    await expect(page.getByRole('button', {name: '3', exact: true})).toBeVisible();
    await expect(page.locator('tbody tr[data-vendor-id]').first()).toHaveAttribute('data-vendor-id', 'alpha-construction');
  });

  test(`${locale}: Vendor Documents filter existing statuses and preserve search on reset`, async ({page}) => {
    await page.goto(`${prefix}/vendors/construct-pro`);
    const search = page.getByRole('searchbox', {name: copy.VendorDetails.searchLabel});
    await search.fill(locale === 'ro' ? ' CERTIFICAT ' : ' CERTIFIC ');
    await expect(page.locator('tbody tr')).toHaveCount(3);
    const panel = await openFilters(page);
    await panel.getByRole('combobox', {name: copy.VendorDetails.table.status}).selectOption('missing');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText('ISO 9001');
    await expect(page.getByRole('button', {name: triggerName})).toHaveText(`${copy.DataFilters.trigger} (1)`);
    await panel.getByRole('button', {name: copy.DataFilters.reset, exact: true}).click();
    await expect(search).toHaveValue(locale === 'ro' ? ' CERTIFICAT ' : ' CERTIFIC ');
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await page.keyboard.press('Escape');
    await search.fill('');
    await expect(page.locator('tbody tr')).toHaveCount(5);
    await expect(page.getByRole('button', {name: copy.VendorTemplates.title, exact: true})).toBeEnabled();
  });

  test(`${locale}: Documents retains its four domain filters and independent sort`, async ({page}) => {
    await page.goto(`${prefix}/documents`);
    const search = page.getByRole('searchbox', {name: copy.Documents.searchLabel});
    await page.getByRole('combobox', {name: copy.Documents.sortLabel}).selectOption('oldest');
    await page.getByRole('button', {name: copy.Documents.pageNumber.replace('{page}', '3')}).click();
    await search.fill(' CERTIFICAT_FISCAL_CP_2024.PDF ');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.getByRole('button', {name: copy.Documents.previousPage})).toBeDisabled();
    const panel = await openFilters(page);
    await panel.getByRole('combobox', {name: copy.Documents.vendor, exact: true}).selectOption('construct-pro');
    await panel.getByRole('combobox', {name: copy.Documents.type}).selectOption('tax');
    await panel.getByRole('checkbox', {name: new RegExp(copy.Documents.status.review)}).check();
    await panel.getByRole('checkbox', {name: new RegExp(copy.Documents.status.valid)}).check();
    await panel.getByRole('combobox', {name: copy.Documents.uploadPeriod}).selectOption('2026');
    await expect(page.getByRole('button', {name: triggerName})).toHaveText(`${copy.DataFilters.trigger} (5)`);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await panel.getByRole('button', {name: copy.DataFilters.reset, exact: true}).click();
    await expect(search).toHaveValue(' CERTIFICAT_FISCAL_CP_2024.PDF ');
    await expect(page.getByRole('combobox', {name: copy.Documents.sortLabel})).toHaveValue('oldest');
    await expect(page.getByRole('button', {name: triggerName})).toHaveText(copy.DataFilters.trigger);
    await page.keyboard.press('Escape');
    await search.fill('');
    await expect(page.locator('tbody tr')).toHaveCount(8);
    await expect(page.locator('tbody tr').first()).toContainText('Terra Materials SRL');
  });

  test(`${locale}: shared search geometry, filter containment and keyboard dismissal at every target width`, async ({page}) => {
    test.setTimeout(90_000);
    for (const width of [1448, 1024, 758, 600, 375, 320]) {
      await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
      for (const route of ['/vendors', '/vendors/construct-pro', '/documents']) {
        await page.goto(`${prefix}${route}`);
        await page.evaluate(async () => {await document.fonts.ready;});
        const searches = page.locator('[data-search-control]');
        const globalGeometry = await searchGeometry(searches.first());
        expect(globalGeometry.height).toBe(45);
        expect(await searchGeometry(searches.nth(1))).toEqual(globalGeometry);
        const search = searches.nth(1).getByRole('searchbox');
        await search.focus();
        expect(await searches.nth(1).evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('3px');
        const trigger = page.getByRole('button', {name: triggerName});
        expect((await trigger.boundingBox())!.height).toBe(45);
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await trigger.focus();
        await page.keyboard.press('Enter');
        let panel = page.getByRole('dialog', {name: copy.DataFilters.title, exact: true});
        await expect(panel).toBeVisible();
        await expect.poll(async () => {const settled = (await panel.boundingBox())!; return settled.x + settled.width;}).toBeLessThanOrEqual(width);
        expect(await panel.evaluate((element) => ({left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, overflow: element.scrollWidth > element.clientWidth}))).toMatchObject({overflow: false});
        const box = (await panel.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
        const field = panel.getByRole('combobox').first();
        await field.selectOption((await field.locator('option').nth(1).getAttribute('value'))!);
        await expect(field).not.toHaveValue('all');
        await panel.getByRole('button', {name: copy.DataFilters.reset, exact: true}).click();
        await expect(field).toHaveValue('all');
        if (width <= 600) {
          await expect(panel).toHaveAttribute('aria-modal', 'true');
          await panel.getByRole('combobox').last().focus();
          await expect(panel.getByRole('combobox').last()).toBeFocused();
          await panel.getByRole('button', {name: copy.DataFilters.close}).click();
          await expect(panel).toHaveCount(0);
          await expect(trigger).toBeFocused();
        } else {
          await trigger.click();
          await expect(panel).toHaveCount(0);
          panel = await openFilters(page);
          await search.click();
          await expect(panel).toHaveCount(0);
          await openFilters(page);
          await page.keyboard.press('Tab');
          await expect(page.getByRole('button', {name: copy.DataFilters.reset, exact: true})).toBeFocused();
        }
        await openFilters(page);
        await page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await openFilters(page);
        if (width <= 600) {
          // Full-width mobile drawers use X/Escape as their exit controls.
          await page.keyboard.press('Escape');
        } else {
          const last = panel.getByRole('combobox').last();
          await last.focus();
          await page.keyboard.press('Tab');
          await expect(panel).toHaveCount(0); // Non-modal popovers do not trap Tab.
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    }
  });
}
