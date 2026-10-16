import {expect, test, type Page, type Locator} from '@playwright/test';
import {mkdir, readFile} from 'node:fs/promises';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import {createDocumentFixtureFile} from '../src/features/documents/fixture-files';
import {createWorkspaceCompany, switchWorkspaceCompany} from './support/company-workspace';
import type {readCompanyState} from '../src/features/companies/company-state';
import type {CompanyDocumentsState} from '../src/features/company-documents/types';

const copies = (english: boolean) => english ? en : ro;
async function file(version = 1) {const value = createDocumentFixtureFile({id: `company-e2e-${version}`, filename: 'company-proof.pdf', createdAt: '2026-10-02T12:00:00Z', version}); return {name: value.name, mimeType: value.type, buffer: Buffer.from(await value.arrayBuffer())};}
async function companyPage(page: Page, english = false) {
  const copy = copies(english), nav = page.getByRole('navigation', {name: copy.AppShell.navigationLabel});
  const group = nav.getByRole('button', {name: copy.AppShell.navigation.company, exact: true});
  if (await group.getAttribute('aria-expanded') !== 'true') await group.click();
  await nav.getByRole('link', {name: copy.AppShell.navigation.companyDocuments, exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`${english ? '/en' : ''}/company/documents$`));
}
async function simplifiedUpload(dialog: Locator) {
  await expect(dialog.locator('#company-template, #company-upload-requirement, input[type=checkbox], details')).toHaveCount(0);
  await expect(dialog).not.toContainText(/Document independent|Standalone document|Cerință a companiei|Company requirement/);
  await dialog.evaluate(async (element) => {await Promise.all(element.getAnimations().map((animation) => animation.finished));});
  const geometry = await dialog.evaluate((element) => {
    const title = element.querySelector('h2')!, close = element.querySelector('button')!, range = document.createRange(); range.selectNodeContents(title);
    const control = close.getBoundingClientRect();
    return [...range.getClientRects()].every((text) => text.right <= control.left || text.top >= control.bottom);
  });
  expect(geometry).toBe(true);
}
async function openAdd(page: Page, english = false) {const copy = copies(english); await page.getByRole('button', {name: copy.CompanyDocuments.addDocuments, exact: true}).click(); const dialog = page.getByRole('dialog', {name: copy.CompanyDocumentManagement.addTitle, exact: true}); await expect(dialog).toBeVisible(); await simplifiedUpload(dialog); return dialog;}
async function openTemplate(page: Page, english = false) {
  const copy = copies(english);
  await page.getByRole('button', {name: copy.VendorTemplates.title, exact: true}).focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {name: copy.VendorTemplates.title, exact: true}); await expect(dialog).toBeVisible(); return dialog;
}
async function close(page: Page) {await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);}
async function previewReady(page: Page, dialog: Locator, english: boolean) {
  if (await page.evaluate(() => navigator.pdfViewerEnabled)) await expect(dialog.getByTitle('company-proof.pdf')).toHaveAttribute('src', /^blob:/);
  else {await expect(dialog.getByText(copies(english).CompanyDocumentManagement.previewUnsupported, {exact: true})).toBeVisible(); await expect(dialog.getByRole('button', {name: copies(english).DocumentManagement.download, exact: true})).toBeEnabled();}
}
async function standalone(page: Page, name: string, english = false, version = 1) {const dialog = await openAdd(page, english); await dialog.locator('#company-upload-name').fill(name); await dialog.locator('#company-upload-type').selectOption('tax'); await dialog.locator('#company-upload-expires').fill('31.12.2027'); await dialog.locator('input[type=file]').setInputFiles(await file(version)); await dialog.getByRole('button', {name: copies(english).AddDocument.submit, exact: true}).click(); await expect(dialog).not.toBeVisible(); return page.locator('[data-company-document-row]').filter({hasText: name});}
async function details(page: Page, row: Locator, name: string, english = false) {await row.getByRole('button', {name, exact: true}).click(); await expect(page.getByRole('dialog', {name: copies(english).DocumentManagement.detailsTitle, exact: true})).toBeVisible(); return page.getByRole('dialog');}
async function downloadBytes(page: Page, button: Locator) {const pending = page.waitForEvent('download'); await button.click(); const download = await pending; expect(download.suggestedFilename()).toBe('company-proof.pdf'); return readFile((await download.path())!);}
async function role(page: Page, value: 'administrator' | 'reviewer' | 'viewer', active = true) {
  await page.evaluate(({value, active}) => {
    const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
    owner.state = {...owner.state, companies: owner.state.companies.map((company) => company.company.id === owner.state.activeCompanyId ? {...company, members: company.members.map((member) => member.isCurrentUser ? {...member, role: value, status: active ? 'active' as const : 'invited' as const} : member)} : company)};
    owner.listeners.forEach((notify) => notify());
  }, {value, active});
}

for (const english of [false, true]) {
  test(`${english ? 'EN' : 'RO'} company upload, metadata/review, failed replacement, rejected history, actual downloads and expiry`, async ({page}) => {
    test.setTimeout(90_000);
    const copy = copies(english), t = copy.CompanyDocumentManagement, common = copy.DocumentManagement, name = `Company lifecycle ${english ? 'EN' : 'RO'}`;
    await page.goto(`${english ? '/en' : ''}/company/documents`);
    const row = await standalone(page, name, english);
    const associated = await page.evaluate(() => {
      const workspace = (Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state.byCompany['demo-company'];
      const requirement = workspace.requirements.at(-1)!;
      return {companyId: requirement.companyId, required: requirement.required, associated: workspace.documents.find((item) => item.id === requirement.currentDocumentId)?.requirementId === requirement.id};
    });
    expect(associated).toEqual({companyId: 'demo-company', required: false, associated: true});
    await expect(row.locator('[data-tone][data-status]')).toHaveText(copy.CompanyDocuments.status.needs_review);
    const id = await row.getAttribute('data-current-document');
    let dialog = await details(page, row, name, english);
    await mkdir('artifacts/visual/e1c-003', {recursive: true});
    await page.screenshot({path: `artifacts/visual/e1c-003/${english ? 'en' : 'ro'}-pending.png`, animations: 'disabled'});
    expect(await downloadBytes(page, dialog.getByRole('button', {name: common.download, exact: true}))).toEqual((await file()).buffer);
    await dialog.getByRole('button', {name: t.preview, exact: true}).click();
    await previewReady(page, dialog, english);
    await page.screenshot({path: `artifacts/visual/e1c-003/${english ? 'en' : 'ro'}-preview.png`, animations: 'disabled'});
    await dialog.getByRole('button', {name: common.backToDetails}).click();
    await dialog.getByRole('button', {name: t.confirm, exact: true}).click();
    await expect(dialog.getByRole('status')).toContainText(t.success.approved);
    await page.screenshot({path: `artifacts/visual/e1c-003/${english ? 'en' : 'ro'}-approved.png`, animations: 'disabled'});
    await dialog.getByRole('button', {name: t.metadataTitle, exact: true}).click();
    await dialog.locator('#company-metadata-expiresAt').fill('31.02.2027');
    await dialog.getByRole('button', {name: t.save, exact: true}).click(); await expect(dialog.getByRole('alert')).toContainText(t.errors.date);
    await dialog.locator('#company-metadata-expiresAt').fill('31.12.2028'); await dialog.locator('#company-metadata-issuer').fill('Internal authority');
    await dialog.getByRole('button', {name: t.save, exact: true}).click(); await expect(dialog.getByRole('status')).toContainText(t.success.metadata);
    await dialog.getByRole('button', {name: t.confirm, exact: true}).click(); await close(page);
    await expect(row).toHaveAttribute('data-current-document', id!);
    await row.getByRole('checkbox').check();
    dialog = await details(page, row, name, english);
    await dialog.getByRole('button', {name: t.replaceTitle, exact: true}).click();
    dialog = page.getByRole('dialog', {name: t.replaceTitle, exact: true});
    await simplifiedUpload(dialog);
    await expect(dialog.locator('#company-upload-name')).toHaveValue(name); await expect(dialog.locator('#company-upload-name')).toHaveAttribute('readonly');
    await expect(dialog.locator('#company-upload-type')).toHaveValue(copy.CompanyDocuments.types.tax); await expect(dialog.locator('#company-upload-type')).toHaveAttribute('readonly');
    const before = await page.evaluate(() => JSON.stringify((Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state));
    await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog.getByRole('alert')).toContainText(t.errors.file);
    await dialog.locator('input[type=file]').setInputFiles(await file(2)); await dialog.locator('#company-upload-expires').fill('31.02.2027');
    await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog.getByRole('alert')).toContainText(t.errors.date);
    await page.screenshot({path: `artifacts/visual/e1c-003/${english ? 'en' : 'ro'}-replacement-error.png`, animations: 'disabled'});
    expect(await page.evaluate(() => JSON.stringify((Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state))).toBe(before);
    await dialog.locator('#company-upload-expires').fill('31.12.2028'); await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog).not.toBeVisible();
    await expect(row).not.toHaveAttribute('data-current-document', id!); await expect(page.getByRole('status').filter({hasText: /^0 (selected|selectate)$/})).toBeVisible();
    dialog = await details(page, row, name, english);
    await dialog.getByRole('button', {name: t.reject, exact: true}).click();
    const rejection = dialog.getByRole('form', {name: t.reject});
    await rejection.getByRole('button', {name: t.reject}).click(); await expect(dialog.getByRole('alert')).toContainText(t.errors.rejectionReason);
    await rejection.getByRole('textbox', {name: t.rejectionReason}).fill('  Incorrect content  '); await rejection.getByRole('button', {name: t.reject}).click();
    await expect(dialog.getByText(t.noCurrent, {exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: common.viewAll, exact: true}).click();
    await expect(dialog.locator('li[data-version]')).toHaveCount(2); await expect(dialog.locator('li[data-version]').first()).toHaveAttribute('data-version', '2');
    await expect(dialog.locator('li[data-version="2"]')).toContainText('Incorrect content');
    await page.screenshot({path: `artifacts/visual/e1c-003/${english ? 'en' : 'ro'}-rejected-history.png`, animations: 'disabled'});
    await dialog.locator('li[data-version="1"]').getByRole('button', {name: t.preview, exact: true}).click();
    await previewReady(page, dialog, english);
    await dialog.getByRole('button', {name: common.backToHistory, exact: true}).click(); await expect(dialog.locator('li[data-version]')).toHaveCount(2);
    expect(await downloadBytes(page, dialog.locator('li[data-version="1"]').getByRole('button', {name: common.download, exact: true}))).toEqual((await file()).buffer);
    expect(await downloadBytes(page, dialog.locator('li[data-version="2"]').getByRole('button', {name: common.download, exact: true}))).toEqual((await file(2)).buffer);
    await close(page); await row.getByRole('button', {name: copy.CompanyDocuments.upload, exact: true}).click();
    dialog = page.getByRole('dialog', {name: t.addTitle, exact: true}); await dialog.locator('input[type=file]').setInputFiles(await file(3)); await dialog.locator('#company-upload-expires').fill('31.12.2029');
    await simplifiedUpload(dialog); await expect(dialog.locator('#company-upload-name')).toHaveValue(name);
    await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog).not.toBeVisible();
    dialog = await details(page, row, name, english); await dialog.getByRole('button', {name: t.confirm, exact: true}).click();
    await dialog.getByRole('button', {name: common.markExpired, exact: true}).click();
    await expect(page.getByRole('alertdialog')).toContainText(t.expireDescription);
    await expect(page.getByRole('alertdialog')).not.toContainText(/furnizor|supplier|vendor/i);
    await page.getByRole('alertdialog').getByRole('button', {name: common.markExpired, exact: true}).click();
    await expect(dialog.getByRole('status')).toContainText(t.success.expired);
    await page.screenshot({path: `artifacts/visual/e1c-003/${english ? 'en' : 'ro'}-expired.png`, animations: 'disabled'});
    await expect(dialog.getByRole('button', {name: common.markExpired, exact: true})).toHaveCount(0);
    await dialog.getByRole('button', {name: common.viewAll, exact: true}).click(); await expect(dialog.locator('li[data-version]')).toHaveCount(3); await expect(dialog.locator('li[data-version="3"]')).toHaveAttribute('data-version-state', 'current');
    await expect(dialog.locator('li[data-version="3"]')).toContainText('2029'); await close(page);
    await expect(row.locator('[data-tone][data-status]')).toHaveText(copy.CompanyDocuments.status.expired);
    expect(await page.locator('section[aria-label] [data-tone] strong').allTextContents()).toEqual(['6', '5', '0']);
    await page.getByRole('button', {name: copy.CompanyDocuments.shareDocuments, exact: true}).click();
    await expect(page.getByRole('dialog')).toContainText(copy.CompanyDocumentSharing.backendUnavailable);
    await close(page);
  });

  test(`${english ? 'EN' : 'RO'} applies only Company templates idempotently and preserves required snapshot`, async ({page}) => {
    const copy = copies(english), t = copy.CompanyDocumentManagement;
    await page.goto(`${english ? '/en' : ''}/requirements`);
    for (const scope of ['company', 'employee']) {
      await page.locator('#requirement-template-scope').selectOption(scope);
      await page.getByRole('button', {name: english ? 'New Template' : 'Șablon nou', exact: true}).click(); await page.locator('#requirement-template-name').fill(`${scope} proof template`);
      await page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document', exact: true}).click();
      const drawer = page.getByRole('dialog', {name: english ? 'Add document' : 'Adaugă document', exact: true});
      await drawer.getByRole('button', {name: english ? /^Tax certificate/ : /^Certificat fiscal/}).click(); await drawer.getByRole('button', {name: english ? 'Add document' : 'Adaugă documentul', exact: true}).click(); await expect(drawer).not.toBeVisible();
      await page.getByRole('button', {name: english ? 'Save template' : 'Salvează șablon', exact: true}).click();
    }
    await companyPage(page, english);
    const trigger = page.getByRole('button', {name: copy.VendorTemplates.title, exact: true});
    let dialog = await openTemplate(page, english);
    await expect(dialog.locator('input[type=file], #company-upload-name')).toHaveCount(0);
    await expect(dialog.locator('#company-template option')).toHaveText([t.chooseTemplate, 'company proof template']);
    const documentsBefore = await page.evaluate(() => JSON.stringify((Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state.byCompany['demo-company'].documents));
    await dialog.locator('#company-template').selectOption({label: 'company proof template'}); await dialog.getByRole('button', {name: t.applyTemplate, exact: true}).click();
    await expect(dialog.getByRole('status')).toHaveText(t.templateApplied.replace('{count}', '1'));
    expect(await page.evaluate(() => JSON.stringify((Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state.byCompany['demo-company'].documents))).toBe(documentsBefore);
    await dialog.getByRole('button', {name: t.applyTemplate, exact: true}).click(); await expect(dialog.getByRole('status')).toHaveText(t.templateApplied.replace('{count}', '0'));
    const requirement = await page.evaluate(() => (Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state.byCompany['demo-company'].requirements.at(-1)!);
    expect(requirement.currentDocumentId).toBeNull(); expect(requirement.required).toBe(true);
    await mkdir('artifacts/visual/e1c-003b', {recursive: true});
    for (const width of [1448, 768, 375, 320]) {
      await page.setViewportSize({width, height: 900});
      await expect(dialog).toBeVisible(); expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-template-applied-${width}.png`, animations: 'disabled'});
    }
    await close(page); await expect(trigger).toBeFocused();
    await page.setViewportSize({width: 1448, height: 900});
    const row = page.locator(`[data-company-document-row="${requirement.id}"]`);
    const before = await page.evaluate(() => (Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state.byCompany['demo-company'].requirements.length);
    await row.getByRole('button', {name: copy.CompanyDocuments.upload, exact: true}).click(); dialog = page.getByRole('dialog', {name: t.addTitle, exact: true});
    await simplifiedUpload(dialog);
    await expect(dialog.locator('#company-upload-name')).toHaveValue(english ? 'Tax certificate' : 'Certificat fiscal');
    await expect(dialog.locator('#company-upload-name')).toHaveAttribute('readonly');
    await expect(dialog.locator('#company-upload-type')).toHaveValue(copy.CompanyDocuments.types.tax);
    await dialog.locator('input[type=file]').setInputFiles(await file()); await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => (Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state.byCompany['demo-company'].requirements.length)).toBe(before);
    await row.getByRole('button', {name: english ? 'Tax certificate' : 'Certificat fiscal', exact: true}).click();
    dialog = page.getByRole('dialog', {name: copy.DocumentManagement.detailsTitle, exact: true}); await expect(dialog.getByText(copy.DocumentManagement.required, {exact: true})).toBeVisible();
  });
}

test('upload errors preserve form state; Reviewer/Viewer/inactive memberships cannot gain company-management access', async ({page}) => {
  await page.goto('/en/company/documents'); let dialog = await openAdd(page, true);
  await dialog.locator('#company-upload-name').fill('Validation proof'); await dialog.locator('#company-upload-type').selectOption('tax');
  for (const payload of [{name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0)}, {name: 'bad.html', mimeType: 'text/html', buffer: Buffer.from('bad')}, {name: 'bad.pdf', mimeType: 'image/png', buffer: Buffer.from('bad')}, {name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1)}]) {
    await dialog.locator('input[type=file]').setInputFiles(payload); await expect(dialog.getByRole('alert')).toBeVisible(); await expect(dialog.locator('#company-upload-name')).toHaveValue('Validation proof');
  }
  await dialog.locator('input[type=file]').setInputFiles(await file()); await dialog.getByRole('button', {name: en.AddDocument.submit, exact: true}).click(); await expect(dialog).not.toBeVisible();
  await role(page, 'reviewer'); await expect(page.getByRole('button', {name: en.CompanyDocuments.addDocuments, exact: true})).toBeDisabled();
  await expect(page.getByRole('button', {name: en.VendorTemplates.title, exact: true})).toBeDisabled();
  const row = page.locator('[data-company-document-row]').filter({hasText: 'Validation proof'}); dialog = await details(page, row, 'Validation proof', true);
  await expect(dialog.getByRole('button', {name: en.CompanyDocumentManagement.replaceTitle, exact: true})).toBeDisabled(); await expect(dialog.getByRole('button', {name: en.CompanyDocumentManagement.confirm, exact: true})).toBeEnabled();
  await role(page, 'viewer'); await expect(dialog.getByRole('button', {name: en.CompanyDocumentManagement.confirm, exact: true})).toBeDisabled();
  expect(await downloadBytes(page, dialog.getByRole('button', {name: en.DocumentManagement.download, exact: true}))).toEqual((await file()).buffer);
  await role(page, 'viewer', false); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('table')).toHaveCount(0);
});

test('new company is empty; switching while a preview is open clears UI and preserves owned versions/bytes', async ({page}) => {
  await page.goto('/en/company/documents'); const row = await standalone(page, 'A private proof', true);
  const id = await row.getAttribute('data-current-document'); const dialog = await details(page, row, 'A private proof', true);
  await dialog.getByRole('button', {name: en.CompanyDocumentManagement.preview, exact: true}).click(); await previewReady(page, dialog, true);
  await page.evaluate(() => {
    const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
    owner.state = {...owner.state, activeCompanyId: 'global-clean-services'}; owner.listeners.forEach((notify) => notify());
  });
  await expect(page).toHaveURL(/\/en\/dashboard$/); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('iframe')).toHaveCount(0);
  await companyPage(page, true); await expect(page.getByText(en.CompanyDocuments.empty, {exact: true})).toBeVisible();
  await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL', true); await companyPage(page, true);
  const restored = page.locator(`[data-current-document="${id}"]`); await expect(restored).toBeVisible();
  expect(await downloadBytes(page, restored.getByRole('button', {name: 'Download A private proof', exact: true}))).toEqual((await file()).buffer);
  await createWorkspaceCompany(page, 'Company Management Empty', true); await companyPage(page, true); await expect(page.getByText(en.CompanyDocuments.empty, {exact: true})).toBeVisible();
  await standalone(page, 'First company file', true); expect(await page.locator('section[aria-label] [data-tone] strong').allTextContents()).toEqual(['1', '1', '0']);
  await page.reload(); await expect(page.getByText('First company file', {exact: true})).toHaveCount(0);
});

test('company switching closes the separate template drawer and respects target workspace permissions', async ({page}) => {
  await page.goto('/en/company/documents');
  await openTemplate(page, true);
  const before = await page.evaluate(() => JSON.stringify((Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state));
  await page.evaluate(() => {
    const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
    owner.state = {...owner.state, activeCompanyId: 'global-clean-services'}; owner.listeners.forEach((notify) => notify());
  });
  await expect(page).toHaveURL(/\/en\/dashboard$/); await expect(page.getByRole('dialog')).toHaveCount(0);
  await companyPage(page, true);
  await expect(page.getByRole('button', {name: en.VendorTemplates.title, exact: true})).toBeDisabled();
  await expect(page.getByRole('menuitem', {name: en.CompanyDocumentManagement.applyTemplate, exact: true})).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify((Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState}).state))).toBe(before);
});

test('RO/EN upload/details/history captures remain contained at all required widths', async ({page}) => {
  test.setTimeout(180_000); await mkdir('artifacts/visual/e1c-003b', {recursive: true});
  for (const english of [false, true]) for (const [width, height] of [[1448, 900], [1920, 1080], [1280, 800], [1024, 900], [768, 900], [375, 812], [320, 812]]) {
    const copy = copies(english); await page.setViewportSize({width, height}); await page.goto(`${english ? '/en' : ''}/company/documents`);
    const titleBounds = (await page.getByRole('heading', {level: 1}).boundingBox())!, actionsBounds = (await page.getByRole('button', {name: copy.CompanyDocuments.shareDocuments, exact: true}).boundingBox())!;
    expect(titleBounds.x + titleBounds.width <= actionsBounds.x || titleBounds.y + titleBounds.height <= actionsBounds.y).toBe(true);
    await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-page-${width}.png`, animations: 'disabled'});
    await openTemplate(page, english);
    await expect(page.getByRole('dialog').getByText(copy.CompanyDocumentManagement.noTemplates, {exact: true})).toBeVisible();
    await close(page);
    const missing = page.locator('[data-company-document-row="company-requirement:criminal-record"]');
    await missing.getByRole('button', {name: copy.CompanyDocuments.upload, exact: true}).click();
    let dialog = page.getByRole('dialog', {name: copy.CompanyDocumentManagement.addTitle, exact: true});
    await simplifiedUpload(dialog); await expect(dialog.locator('#company-upload-name')).not.toHaveValue('');
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-bound-upload-${width}.png`, animations: 'disabled'});
    if (width <= 375) {
      await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).scrollIntoViewIfNeeded();
      await expect(dialog.getByRole('button', {name: copy.AddDocument.cancel, exact: true})).toBeInViewport();
      const contained = await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).evaluate((button) => {const content = button.querySelector('span')!.getBoundingClientRect(), bounds = button.getBoundingClientRect(); return content.left >= bounds.left && content.right <= bounds.right;}); expect(contained).toBe(true);
      await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-bound-upload-end-${width}.png`, animations: 'disabled'});
    }
    await close(page);
    dialog = await openAdd(page, english);
    await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-upload-initial-${width}.png`, animations: 'disabled'});
    if (width <= 375) {
      await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).scrollIntoViewIfNeeded();
      await expect(dialog.getByRole('button', {name: copy.AddDocument.cancel, exact: true})).toBeInViewport();
      await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-upload-end-${width}.png`, animations: 'disabled'});
    }
    await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog.getByRole('alert').first()).toBeVisible();
    await dialog.evaluate(async (element) => {await Promise.all(element.getAnimations().map((animation) => animation.finished));});
    const bounds = (await dialog.boundingBox())!; expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-upload-${width}.png`}); await close(page);
    const name = `Responsive proof ${width}`; const row = await standalone(page, name, english); dialog = await details(page, row, name, english);
    await dialog.evaluate(async (element) => {await Promise.all(element.getAnimations().map((animation) => animation.finished));});
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-details-${width}.png`});
    await dialog.getByRole('button', {name: copy.DocumentManagement.viewAll, exact: true}).click();
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-history-${width}.png`});
    await dialog.getByRole('button', {name: copy.DocumentManagement.backToDetails}).click(); await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.replaceTitle, exact: true}).click();
    dialog = page.getByRole('dialog', {name: copy.CompanyDocumentManagement.replaceTitle, exact: true});
    await simplifiedUpload(dialog); expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path: `artifacts/visual/e1c-003b/${english ? 'en' : 'ro'}-replacement-${width}.png`, animations: 'disabled'}); await close(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
