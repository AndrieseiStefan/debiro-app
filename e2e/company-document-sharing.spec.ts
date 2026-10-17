import {expect, test, type Page} from '@playwright/test';
import {mkdir, readFile} from 'node:fs/promises';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import {createDocumentFixtureFile} from '../src/features/documents/fixture-files';
import type {CompanyDocumentsState} from '../src/features/company-documents/types';
import type {readCompanyState} from '../src/features/companies/company-state';
import {switchWorkspaceCompany} from './support/company-workspace';

async function companyPage(page: Page, locale: 'ro' | 'en') {
  const copy = locale === 'ro' ? ro : en, nav = page.getByRole('navigation', {name: copy.AppShell.navigationLabel});
  const parent = nav.getByRole('button', {name: copy.AppShell.navigation.company, exact: true});
  if (await parent.getAttribute('aria-expanded') !== 'true') await parent.click();
  await nav.getByRole('link', {name: copy.AppShell.navigation.companyDocuments, exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`${locale === 'en' ? '/en' : ''}/company/documents$`));
}

async function upload(page: Page, locale: 'ro' | 'en', name: string) {
  const copy = locale === 'ro' ? ro : en;
  await page.getByRole('button', {name: copy.CompanyDocuments.addDocuments, exact: true}).click();
  const dialog = page.getByRole('dialog');
  const file = createDocumentFixtureFile({id: 'sharing-test', filename: 'original-proof.pdf', createdAt: '2026-10-16T12:00:00Z', version: 1});
  await dialog.locator('input[type=file]').setInputFiles({name: file.name, mimeType: file.type, buffer: Buffer.from(await file.arrayBuffer())});
  await dialog.locator('#company-upload-name').fill(name); await dialog.locator('#company-upload-type').selectOption('tax');
  await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog).not.toBeVisible();
  return page.locator('[data-company-document-row]').filter({hasText: name});
}
async function close(page: Page) {await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);}

for (const locale of ['ro', 'en'] as const) {
  const copy = locale === 'ro' ? ro : en, t = copy.CompanyDocumentSharing, prefix = locale === 'en' ? '/en' : '';
  test(`${locale} all-row and mixed attachment selection keeps every preview item and never starts a partial download`, async ({page}) => {
    test.setTimeout(90_000); await mkdir('artifacts/visual/e1c-004a', {recursive: true});
    await page.goto(`${prefix}/company/documents`);
    const downloads: string[] = []; page.on('download', (download) => downloads.push(download.suggestedFilename()));
    const selectedCount = page.getByRole('status').filter({hasText: /^\d+ (selected|selectat|selectate)$/});
    const selectPage = page.getByRole('checkbox', {name: copy.CompanyDocuments.selectPage, exact: true});
    await selectPage.focus(); await page.keyboard.press('Space'); await expect(selectedCount).toContainText('6');
    const download = page.getByRole('button', {name: copy.CompanyDocuments.downloadSelected, exact: true});
    await expect(download).toHaveAttribute('aria-disabled', 'true'); await download.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('tooltip')).toHaveText(copy.CompanyDocuments.downloadSelectionUnavailable); expect(downloads).toEqual([]);
    await page.getByRole('button', {name: copy.CompanyDocuments.shareSelected, exact: true}).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', {checked: true})).toHaveCount(6); await expect(dialog.getByRole('status')).toHaveText(t.missingAttachments.replace('{count}', '6'));
    for (const checkbox of await dialog.getByRole('checkbox').all()) {await expect(checkbox).toBeEnabled(); await expect(checkbox).toHaveAccessibleDescription(t.missingAttachment);}
    await dialog.locator('#company-share-name').fill('Unattached documents'); await dialog.getByRole('button', {name: t.preparePreview}).click();
    let preview = dialog.getByRole('region', {name: t.previewTitle}); await expect(preview.getByRole('listitem')).toHaveCount(6); await expect(preview.getByText(t.missingAttachment)).toHaveCount(6);
    expect(await page.evaluate(() => (Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {files: Map<string, Map<string, Blob>>}).files.size)).toBe(0);
    await expect(dialog.getByRole('button', {name: t.generateLink, exact: true})).toHaveAttribute('aria-disabled', 'true');
    for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [768, 900], [375, 812], [320, 812]]) {
      await page.setViewportSize({width, height}); await page.evaluate(() => document.fonts.ready); await dialog.locator('#company-share-documents').scrollIntoViewIfNeeded();
      expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({path: `artifacts/visual/e1c-004a/${locale}-unattached-list-${width}.png`, animations: 'disabled'});
      await preview.scrollIntoViewIfNeeded(); await page.screenshot({path: `artifacts/visual/e1c-004a/${locale}-unattached-preview-${width}.png`, animations: 'disabled'});
    }
    await dialog.getByRole('checkbox', {checked: true}).first().uncheck(); await expect(preview).not.toBeVisible();
    await expect(dialog.getByRole('checkbox', {checked: true})).toHaveCount(5); await expect(dialog.getByRole('status')).toHaveText(t.missingAttachments.replace('{count}', '5'));
    await dialog.getByRole('button', {name: t.preparePreview}).click(); await expect(preview.getByRole('listitem')).toHaveCount(5); await close(page);
    await expect(selectedCount).toContainText('6');
    await page.setViewportSize({width: 1448, height: 900}); await selectPage.uncheck();
    await expect(selectedCount).toContainText('0'); await expect(download).toBeDisabled();
    const missingName = locale === 'ro' ? 'Cazier fiscal' : 'Tax clearance record';
    await page.getByRole('button', {name: copy.CompanyDocuments.shareDocument.replace('{name}', missingName), exact: true}).click(); dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', {checked: true})).toHaveCount(1); await expect(dialog.getByRole('checkbox', {checked: true})).toHaveAccessibleDescription(t.missingAttachment); await expect(dialog.getByRole('status')).toHaveCount(0); await close(page);
    const real = await upload(page, locale, 'Attached proof');
    await selectPage.check(); await expect(selectedCount).toContainText('7'); await expect(download).toHaveAttribute('aria-disabled', 'true');
    await download.focus(); await page.keyboard.press('Enter'); expect(downloads).toEqual([]);
    await page.getByRole('button', {name: copy.CompanyDocuments.shareSelected, exact: true}).click(); dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', {checked: true})).toHaveCount(7); await expect(dialog.getByRole('status')).toHaveText(t.missingAttachments.replace('{count}', '6'));
    const attached = dialog.locator('[data-share-document]').filter({hasText: 'Attached proof'}); await expect(attached.getByText(t.missingAttachment)).toHaveCount(0); await expect(attached).toContainText('application/pdf');
    await dialog.locator('#company-share-name').fill('Mixed documents'); await dialog.getByRole('button', {name: t.preparePreview}).click(); preview = dialog.getByRole('region', {name: t.previewTitle});
    await expect(preview.getByRole('listitem')).toHaveCount(7); await expect(preview.getByText(t.missingAttachment)).toHaveCount(6); await close(page);
    await page.getByRole('button', {name: copy.CompanyDocuments.bulkActions, exact: true}).click(); await page.getByRole('menuitem', {name: copy.CompanyDocuments.deselectAll, exact: true}).click();
    await real.getByRole('checkbox').check(); await expect(download).toBeEnabled();
    const pending = page.waitForEvent('download'); await download.click(); const downloaded = await pending;
    const expected = createDocumentFixtureFile({id: 'sharing-test', filename: 'original-proof.pdf', createdAt: '2026-10-16T12:00:00Z', version: 1});
    expect(await readFile((await downloaded.path())!)).toEqual(Buffer.from(await expected.arrayBuffer())); expect(downloads).toEqual(['original-proof.pdf']);
    await page.getByRole('button', {name: copy.CompanyDocuments.shareSelected, exact: true}).click(); dialog = page.getByRole('dialog'); await dialog.locator('#company-share-name').fill('Live attachment'); await dialog.getByRole('button', {name: t.preparePreview}).click();
    preview = dialog.getByRole('region', {name: t.previewTitle}); await expect(preview.getByText(t.missingAttachment)).toHaveCount(0);
    await page.evaluate(() => {
      const owner = Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState; files: Map<string, Map<string, Blob>>; listeners: Set<() => void>};
      owner.files.get('demo-company')!.clear(); owner.state = {...owner.state}; owner.listeners.forEach((notify) => notify());
    });
    await expect(preview.getByText(t.missingAttachment)).toBeVisible(); await expect(dialog.getByRole('checkbox', {checked: true})).toHaveCount(1); await close(page);
    await expect(real.getByRole('checkbox')).toBeChecked(); await expect(download).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('section[aria-label] [data-tone] strong').last()).toHaveText('0');
  });

  test(`${locale} header/bulk/row sharing uses one accessible, local-only package and preserves delivery input`, async ({page}) => {
    await page.goto(`${prefix}/company/documents`);
    const header = page.getByRole('button', {name: copy.CompanyDocuments.shareDocuments, exact: true});
    await header.focus(); await page.keyboard.press('Enter');
    let dialog = page.getByRole('dialog', {name: copy.CompanyDocuments.shareDocuments, exact: true});
    await expect(dialog.getByText(t.missingAttachment)).toHaveCount(6);
    await dialog.getByRole('button', {name: t.preparePreview}).click(); await expect(dialog.getByText(t.errors.empty)).toBeVisible();
    await close(page); await expect(header).toBeFocused();
    const a = await upload(page, locale, 'Sharing proof A'), b = await upload(page, locale, 'Sharing proof B');
    const originalState = await page.evaluate(() => JSON.stringify((Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state));
    await header.click(); dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Sharing proof A'), exact: true})).not.toBeChecked();
    await dialog.getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Sharing proof A'), exact: true}).check();
    await dialog.locator('#company-share-name').fill('  Tender documents  '); await dialog.locator('#company-share-recipient').fill('Recipient');
    await dialog.locator('#company-share-message').fill('Test message');
    await dialog.getByRole('switch', {name: t.passwordProtected, exact: true}).check(); await dialog.locator('#company-share-password').fill('test-secret-do-not-store');
    await dialog.getByRole('button', {name: t.email, exact: true}).click();
    await dialog.getByRole('button', {name: t.preparePreview}).click(); await expect(dialog.locator('#company-share-email')).toHaveAttribute('aria-invalid', 'true');
    await dialog.locator('#company-share-email').fill('recipient@example.org');
    await dialog.getByRole('switch', {name: t.allowDownload, exact: true}).uncheck();
    await dialog.getByRole('button', {name: t.link, exact: true}).click();
    await expect(dialog.locator('#company-share-name')).toHaveValue('  Tender documents  '); await expect(dialog.locator('#company-share-password')).toHaveValue('test-secret-do-not-store');
    await dialog.getByRole('button', {name: t.email, exact: true}).click(); await expect(dialog.locator('#company-share-email')).toHaveValue('recipient@example.org');
    await dialog.getByRole('button', {name: t.preparePreview}).click();
    const preview = dialog.getByRole('region', {name: t.previewTitle}); await expect(preview).toBeFocused(); await expect(preview).toContainText('Sharing proof A'); await expect(preview).not.toContainText('Sharing proof B'); await expect(preview).not.toContainText('test-secret-do-not-store');
    await expect(preview).toContainText('recipient@example.org'); await expect(preview).toContainText(t.previewNotice);
    const final = dialog.getByRole('button', {name: t.sendEmail, exact: true}); await expect(final).toHaveAttribute('aria-disabled', 'true'); await final.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('tooltip')).toHaveText(t.backendUnavailable); await expect(dialog.getByRole('link')).toHaveCount(0);
    await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', {name: copy.DocumentManagement.close})).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(final).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    expect(await page.evaluate(() => JSON.stringify((Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state))).toBe(originalState);
    await close(page); await expect(header).toBeFocused();
    await a.getByRole('checkbox').check(); await page.getByRole('button', {name: copy.CompanyDocuments.shareSelected, exact: true}).click(); dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Sharing proof A'), exact: true})).toBeChecked();
    await expect(dialog.getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Sharing proof B'), exact: true})).not.toBeChecked();
    await dialog.getByRole('button', {name: copy.DocumentManagement.cancel, exact: true}).click(); await expect(dialog).not.toBeVisible();
    const rowAction = b.getByRole('button', {name: copy.CompanyDocuments.shareDocument.replace('{name}', 'Sharing proof B'), exact: true});
    await rowAction.click(); dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Sharing proof B'), exact: true})).toBeChecked(); await expect(dialog.locator('#company-share-recipient')).toHaveValue('');
    await expect(dialog.locator('input[type=password]')).toHaveCount(0);
    await dialog.getByRole('button', {name: copy.DocumentManagement.close, exact: true}).click(); await expect(dialog).not.toBeVisible(); await expect(rowAction).toBeFocused();
    expect(await page.locator('section[aria-label] [data-tone] strong').allTextContents()).toEqual(['7', '6', '0']);
  });

  test(`${locale} stale, missing-byte and metadata-only selections are explained; company switch clears preparation`, async ({page}) => {
    await page.goto(`${prefix}/company/documents`);
    await page.getByRole('button', {name: copy.CompanyDocuments.shareDocument.replace('{name}', locale === 'ro' ? 'Certificat TVA' : 'VAT certificate'), exact: true}).click();
    let dialog = page.getByRole('dialog'); await expect(dialog.getByRole('checkbox', {checked: true})).toHaveCount(1); await expect(dialog.getByRole('checkbox', {checked: true})).toHaveAccessibleDescription(t.missingAttachment); await close(page);
    const row = await upload(page, locale, 'Private company proof'), rowId = (await row.getAttribute('data-company-document-row'))!, versionId = (await row.getAttribute('data-current-document'))!;
    await row.getByRole('button', {name: copy.CompanyDocuments.shareDocument.replace('{name}', 'Private company proof'), exact: true}).click(); dialog = page.getByRole('dialog');
    await dialog.locator('#company-share-name').fill('Private package');
    await page.evaluate(({rowId, versionId}) => {
      const owner = Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState; files: Map<string, Map<string, Blob>>; listeners: Set<() => void>};
      const workspace = owner.state.byCompany['demo-company'], previous = workspace.documents.find((item) => item.id === versionId)!;
      owner.state = {...owner.state, byCompany: {...owner.state.byCompany, 'demo-company': {...workspace,
        requirements: workspace.requirements.map((item) => item.id === rowId ? {...item, currentDocumentId: 'replacement'} : item),
        documents: [...workspace.documents.map((item) => item.id === versionId ? {...item, supersededById: 'replacement'} : item), {...previous, id: 'replacement', version: 2, previousDocumentId: versionId}]
      }}}; owner.files.get('demo-company')!.set('replacement', new Blob(['new bytes'], {type: 'application/pdf'})); owner.listeners.forEach((notify) => notify());
    }, {rowId, versionId});
    await expect(dialog.getByRole('alert')).toContainText(t.errors.stale);
    await dialog.getByRole('button', {name: t.preparePreview}).click(); await expect(dialog.getByRole('region', {name: t.previewTitle})).toHaveCount(0);
    await dialog.getByRole('button', {name: t.remove, exact: true}).click();
    await dialog.getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Private company proof'), exact: true}).check();
    await page.evaluate(() => {
      const owner = Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState; files: Map<string, Map<string, Blob>>; listeners: Set<() => void>};
      owner.files.get('demo-company')!.delete('replacement'); owner.state = {...owner.state}; owner.listeners.forEach((notify) => notify());
    });
    await expect(dialog.getByRole('checkbox', {checked: true})).toHaveAccessibleDescription(t.missingAttachment);
    await dialog.getByRole('switch', {name: t.passwordProtected, exact: true}).check(); await dialog.locator('#company-share-password').fill('private-never-stored');
    await page.evaluate(() => {
      const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
      owner.state = {...owner.state, activeCompanyId: 'global-clean-services'}; owner.listeners.forEach((notify) => notify());
    });
    await expect(page).toHaveURL(new RegExp(`${prefix}/dashboard$`)); await expect(page.getByRole('dialog')).toHaveCount(0);
    await companyPage(page, locale); await expect(page.getByText(copy.CompanyDocuments.empty, {exact: true})).toBeVisible();
    await page.getByRole('button', {name: copy.CompanyDocuments.shareDocuments, exact: true}).click(); dialog = page.getByRole('dialog'); await expect(dialog).not.toContainText('Private company proof'); await expect(dialog.locator('#company-share-name')).toHaveValue(''); await expect(dialog.locator('input[type=password]')).toHaveCount(0); await close(page);
    await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL', locale === 'en'); await companyPage(page, locale);
    await expect(page.locator(`[data-company-document-row="${rowId}"]`)).toBeVisible();
    expect(await page.evaluate((id) => (Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {files: Map<string, Map<string, Blob>>}).files.get('demo-company')!.has(id), versionId)).toBe(true);
  });

  test(`${locale} sharing drawer visual/control regression across desktop, short height, tablet and mobile`, async ({page}) => {
    test.setTimeout(120_000); await mkdir('artifacts/visual/e1c-004', {recursive: true});
    await page.goto(`${prefix}/company/documents`); const row = await upload(page, locale, 'Company sharing proof');
    await row.getByRole('button', {name: copy.CompanyDocuments.shareDocument.replace('{name}', 'Company sharing proof'), exact: true}).click();
    const dialog = page.getByRole('dialog'); await dialog.locator('#company-share-name').fill('Dosar ofertare');
    for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [1024, 768], [768, 900], [375, 812], [320, 640], [1280, 500]]) {
      await page.setViewportSize({width, height}); await page.evaluate(() => document.fonts.ready); await dialog.evaluate((element) => {element.scrollTop = 0;});
      await dialog.evaluate(async (element) => {await Promise.all(element.getAnimations().map((animation) => animation.finished));});
      const bounds = (await dialog.boundingBox())!; expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({path: `artifacts/visual/e1c-004/${locale}-drawer-${width}x${height}.png`, animations: 'disabled'});
      await dialog.getByRole('switch', {name: t.passwordProtected, exact: true}).check(); await dialog.locator('#company-share-password').fill('preview-password');
      const fields = await dialog.locator('#company-share-name, #company-share-recipient, #company-share-expires, #company-share-password').evaluateAll((elements) => elements.map((element) => {const css = getComputedStyle(element); return {height: css.height, fontSize: css.fontSize, radius: css.borderRadius, padding: css.padding};}));
      expect(fields.every((field) => JSON.stringify(field) === JSON.stringify(fields[0]))).toBe(true);
      expect(await dialog.locator('#company-share-message').evaluate((element) => getComputedStyle(element).fontSize)).toBe(fields[0].fontSize);
      await dialog.getByRole('button', {name: t.preparePreview}).click(); await expect(dialog.getByRole('region', {name: t.previewTitle})).toBeVisible();
      await dialog.getByRole('button', {name: t.generateLink, exact: true}).scrollIntoViewIfNeeded(); await expect(dialog.getByRole('button', {name: copy.DocumentManagement.cancel, exact: true})).toBeInViewport();
      await page.screenshot({path: `artifacts/visual/e1c-004/${locale}-preview-footer-${width}x${height}.png`, animations: 'disabled'});
      await dialog.getByRole('switch', {name: t.passwordProtected, exact: true}).uncheck();
    }
  });
}
