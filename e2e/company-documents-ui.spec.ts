import {expect, test, type Locator, type Page} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};

const typography = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color'] as const;
const controls = [...typography, 'backgroundColor', 'border', 'borderRadius', 'height', 'padding'] as const;
async function computed(locator: Locator, properties: readonly string[] = typography) {
  return locator.first().evaluate((element, keys) => Object.fromEntries(keys.map((key) => [key, getComputedStyle(element).getPropertyValue(key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`))])), [...properties]);
}
async function capture(page: Page, name: string) {await page.evaluate(() => document.fonts.ready); await page.screenshot({path: `artifacts/visual/e1c-003b/${name}.png`, animations: 'disabled'});}
async function close(page: Page) {await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);}

for (const locale of ['ro', 'en'] as const) {
  const copy = locale === 'en' ? en : ro, prefix = locale === 'en' ? '/en' : '';
  test(`${locale} company template action shares the compact bulk toolbar at desktop and wraps safely on mobile`, async ({page}) => {
    test.setTimeout(60_000); await mkdir('artifacts/visual/e1c-003c/toolbar', {recursive: true});
    await page.goto(`${prefix}/company/documents`);
    const action = page.getByRole('button', {name: copy.VendorTemplates.title, exact: true}), toolbar = action.locator('xpath=../..');
    const download = toolbar.getByRole('button', {name: copy.CompanyDocuments.downloadSelected, exact: true});
    const share = toolbar.getByRole('button', {name: copy.CompanyDocuments.shareSelected, exact: true});
    const more = toolbar.getByRole('button', {name: copy.CompanyDocuments.bulkActions, exact: true});
    await expect(toolbar.getByRole('status')).toHaveText(locale === 'ro' ? '0 selectate' : '0 selected');
    await expect(download).toBeDisabled(); await expect(share).toBeDisabled(); await expect(more).toBeDisabled(); await expect(action).toBeEnabled();
    await expect(page.locator('[class*=listHeader]')).toHaveCount(0);
    expect(await toolbar.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent))).toEqual([
      copy.CompanyDocuments.downloadSelected, copy.CompanyDocuments.shareSelected, copy.VendorTemplates.title, copy.CompanyDocuments.bulkActions
    ]);
    for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [768, 900], [375, 812], [320, 812]]) {
      await page.setViewportSize({width, height}); await toolbar.scrollIntoViewIfNeeded();
      const geometry = await toolbar.evaluate((element) => {
        const box = element.getBoundingClientRect(), next = element.nextElementSibling!.getBoundingClientRect();
        return {width: element.clientWidth, scroll: element.scrollWidth, bottom: box.bottom, tableTop: next.top,
          controls: [...element.querySelectorAll('button, input, [role=status]')].map((control) => {const rect = control.getBoundingClientRect(); return {left: rect.left, right: rect.right, center: (rect.top + rect.bottom) / 2, clipped: control.scrollWidth > control.clientWidth + 1};})};
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1); expect(Math.abs(geometry.bottom - geometry.tableTop)).toBeLessThanOrEqual(1);
      for (const control of geometry.controls) {expect(control.left).toBeGreaterThanOrEqual(0); expect(control.right).toBeLessThanOrEqual(width); expect(control.clipped).toBe(false);}
      if (width >= 1280) expect(Math.max(...geometry.controls.map((control) => control.center)) - Math.min(...geometry.controls.map((control) => control.center))).toBeLessThanOrEqual(1);
      await page.screenshot({path: `artifacts/visual/e1c-003c/toolbar/${locale}-${width}.png`, animations: 'disabled'});
      await action.focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('dialog', {name: copy.VendorTemplates.title, exact: true})).toBeVisible(); await close(page); await expect(action).toBeFocused();
    }
    // Give one existing record actual test-only bytes; selection and download availability are unchanged.
    await page.evaluate(() => {
      const session = Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {files: Map<string, Map<string, Blob>>; listeners: Set<() => void>; state: {byCompany: Record<string, {documents: {id: string; supersededById?: string}[]}>}};
      const document = session.state.byCompany['demo-company'].documents.find((item) => !item.supersededById)!;
      session.files.set('demo-company', new Map([[document.id, new Blob(['Toolbar regression test bytes'], {type: 'application/pdf'})]]));
      session.state = {...session.state}; session.listeners.forEach((notify) => notify());
    });
    await page.setViewportSize({width: 1448, height: 900});
    await toolbar.getByRole('checkbox', {name: copy.CompanyDocuments.selectPage, exact: true}).check();
    await expect(toolbar.getByRole('status')).toHaveText(locale === 'ro' ? '1 selectat' : '1 selected'); await expect(download).toBeEnabled(); await expect(share).toBeEnabled(); await expect(share).not.toHaveAttribute('aria-disabled', 'true'); await expect(more).toBeEnabled();
    const pending = page.waitForEvent('download'); await download.click(); await pending;
    await more.click(); await page.getByRole('menuitem', {name: copy.CompanyDocuments.deselectAll, exact: true}).click(); await expect(download).toBeDisabled();
  });

  test(`${locale} shared Company Documents computed typography, controls, states and visible template action`, async ({page}) => {
    test.setTimeout(90_000); await mkdir('artifacts/visual/e1c-003b', {recursive: true});
    await page.setViewportSize({width: 1448, height: 900});
    await page.goto(`${prefix}/vendors`); await page.evaluate(() => document.fonts.ready);
    const header = await computed(page.locator('main h1')), description = await computed(page.locator('main h1 + p'));
    const primary = await computed(page.locator('[data-page-primary-action]'), controls);
    const search = await computed(page.locator('main input[type=search]'));
    const footer = await computed(page.locator('[class*=tableFooter]'));
    await page.getByRole('button', {name: copy.AddVendor.title, exact: true}).click();
    const vendorInput = page.locator('#add-vendor-name'); await vendorInput.fill('Typed reference');
    await page.locator('#add-vendor-category').selectOption('construction');
    await page.getByRole('dialog').focus(); await page.mouse.move(0, 0);
    const input = await computed(vendorInput, controls), select = await computed(page.locator('#add-vendor-category'), controls);
    await page.keyboard.press('Tab'); await vendorInput.focus();
    const focus = await computed(vendorInput, ['outline', 'outlineOffset', 'border']);
    await vendorInput.fill(''); await page.getByRole('dialog').getByRole('button', {name: copy.AddVendor.submit, exact: true}).click();
    const invalid = await computed(vendorInput, ['border', 'height', 'padding']); await close(page);

    await page.goto(`${prefix}/documents`);
    expect(await computed(page.locator('main h1'))).toEqual(header); expect(await computed(page.locator('main h1 + p'))).toEqual(description);
    const summary = page.getByRole('region', {name: copy.Documents.summaryLabel});
    const kpi = {label: await computed(summary.locator('strong')), value: await computed(summary.locator('b')), helper: await computed(summary.locator('small'))};
    expect(await computed(page.locator('main input[type=search]'))).toEqual(search);

    await page.goto(`${prefix}/vendors/construct-pro`);
    const panel = page.getByRole('tabpanel');
    const table = {header: await computed(panel.locator('th')), cell: await computed(panel.locator('td')), primary: await computed(panel.locator('td a').first()), secondary: await computed(panel.locator('td small').first()), badge: await computed(panel.locator('[data-tone="success"]'), ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'padding', 'borderRadius', 'height'])};
    // The existing Vendor toolbar stretches its 44px-minimum action to its 45px SearchInput.
    const templateProperties = [...controls.filter((key) => key !== 'height'), 'minHeight'];
    const templateButton = await computed(panel.getByRole('button', {name: copy.VendorTemplates.title, exact: true}), templateProperties);
    await capture(page, `${locale}-vendor-template-reference`);

    await page.goto(`${prefix}/company/documents`);
    expect(await computed(page.locator('main h1'))).toEqual(header); expect(await computed(page.locator('main h1 + p'))).toEqual(description);
    expect(await computed(page.locator('[data-page-primary-action]'), controls)).toEqual(primary);
    expect(await computed(page.locator('main input[type=search]'))).toEqual(search);
    const companySummary = page.getByRole('region', {name: copy.CompanyDocuments.summaryLabel});
    expect(await computed(companySummary.locator('h2'))).toEqual(kpi.label); expect(await computed(companySummary.locator('strong'))).toEqual(kpi.value); expect(await computed(companySummary.locator('p'))).toEqual(kpi.helper);
    const companyTable = page.getByRole('table');
    expect(await computed(companyTable.locator('th'))).toEqual(table.header); expect(await computed(companyTable.locator('td'))).toEqual(table.cell);
    expect(await computed(companyTable.locator('td button').first())).toEqual(table.primary); expect(await computed(companyTable.locator('td small').first())).toEqual(table.secondary);
    expect(await computed(companyTable.locator('[data-tone="success"]'), ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'padding', 'borderRadius', 'height'])).toEqual(table.badge);
    expect((await computed(page.getByRole('status'))).fontSize).toBe(footer.fontSize);
    const action = page.getByRole('button', {name: copy.VendorTemplates.title, exact: true});
    expect(await computed(action, templateProperties)).toEqual(templateButton);
    await expect(action).toBeVisible(); expect(await action.evaluate((element) => element.closest('[aria-labelledby="company-documents-title"]') === null)).toBe(true);
    await expect(page.getByRole('button', {name: /Company document actions|Acțiuni documente companie/})).toHaveCount(0);
    await action.focus(); await page.keyboard.press('Enter');
    let dialog = page.getByRole('dialog', {name: copy.VendorTemplates.title, exact: true});
    await expect(dialog.getByText(copy.CompanyDocumentManagement.noTemplates, {exact: true})).toBeVisible();
    await expect(dialog.getByRole('link', {name: copy.VendorTemplates.openRequirements})).toHaveAttribute('href', `${prefix}/requirements`);
    await expect(dialog.getByRole('button', {name: copy.CompanyDocumentManagement.applyTemplate, exact: true})).toBeDisabled();
    await capture(page, `${locale}-template-empty`); await close(page); await expect(action).toBeFocused();

    await page.getByRole('button', {name: copy.CompanyDocuments.addDocuments, exact: true}).click(); dialog = page.getByRole('dialog');
    await dialog.locator('#company-upload-name').fill('Typed company document'); await dialog.locator('#company-upload-type').selectOption('tax');
    await dialog.focus(); await page.mouse.move(0, 0);
    for (const id of ['name', 'issuer', 'expires']) expect(await computed(dialog.locator(`#company-upload-${id}`), controls)).toEqual(input);
    expect(await computed(dialog.locator('#company-upload-type'), controls)).toEqual(select);
    await page.keyboard.press('Tab'); await dialog.locator('#company-upload-name').focus();
    expect(await computed(dialog.locator('#company-upload-name'), ['outline', 'outlineOffset', 'border'])).toEqual(focus);
    await dialog.locator('#company-upload-name').fill(''); await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click();
    expect(await computed(dialog.locator('#company-upload-name'), ['border', 'height', 'padding'])).toEqual(invalid);
    await capture(page, `${locale}-shared-validation`); await close(page);
    await page.locator('[data-company-document-row="company-requirement:criminal-record"]').getByRole('button', {name: copy.CompanyDocuments.upload, exact: true}).click();
    dialog = page.getByRole('dialog');
    for (const id of ['name', 'type']) {
      const field = dialog.locator(`#company-upload-${id}`); await expect(field).toHaveAttribute('readonly');
      const actual = await computed(field, controls); expect({...actual, backgroundColor: input.backgroundColor}).toEqual(input);
      expect(actual.backgroundColor).toBe('rgb(238, 246, 255)'); // Existing shared read-only surface token.
    }
    await capture(page, `${locale}-shared-readonly`);
    await writeFile(`artifacts/visual/e1c-003b/${locale}-computed.json`, JSON.stringify({header, description, primary, search, input, select, focus, invalid, kpi, table, templateButton}, null, 2));
  });

  test(`${locale} Company Documents and established reference captures at desktop tablet and mobile scales`, async ({page}) => {
    test.setTimeout(120_000); await mkdir('artifacts/visual/e1c-003b', {recursive: true});
    for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [1024, 900], [768, 900], [375, 812], [320, 812]]) {
      await page.setViewportSize({width, height});
      for (const [name, path] of [['vendors', '/vendors'], ['documents', '/documents'], ['company', '/company/documents']]) {
        await page.goto(`${prefix}${path}`); await capture(page, `${locale}-${name}-${width}`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        if (name === 'company') {
          const action = page.getByRole('button', {name: copy.VendorTemplates.title, exact: true}); await expect(action).toBeVisible();
          await action.scrollIntoViewIfNeeded(); const bounds = (await action.boundingBox())!;
          expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
          expect(await action.evaluate((button) => button.scrollWidth <= button.clientWidth + 1)).toBe(true);
          await capture(page, `${locale}-company-template-action-${width}`);
          await action.click(); await capture(page, `${locale}-template-empty-${width}`); await close(page);
        }
        if (name === 'vendors' && [1448, 768, 375, 320].includes(width)) {
          await page.getByRole('button', {name: copy.AddVendor.title, exact: true}).click(); await capture(page, `${locale}-add-vendor-${width}`); await close(page);
        }
      }
    }
  });
}
