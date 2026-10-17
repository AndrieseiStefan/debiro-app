import {expect, test, type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import type {CompanyDocumentsState} from '../src/features/company-documents/types';
import type {readCompanyState} from '../src/features/companies/company-state';
import type {readDocumentRecords} from '../src/features/documents/created-documents';
import {createWorkspaceCompany, switchWorkspaceCompany} from './support/company-workspace';

async function scenario(page: Page, options: {files?: boolean; volume?: boolean; malformed?: boolean; role?: 'reviewer' | 'viewer'; noAccess?: boolean}) {
  await expect.poll(() => page.evaluate(() => Boolean(Reflect.get(window, Symbol.for('debiro.company-documents-session'))))).toBe(true);
  await page.evaluate((options) => {
    type Session = {state: CompanyDocumentsState; files: Map<string, Map<string, Blob>>; listeners: Set<() => void>};
    const owner = Reflect.get(window, Symbol.for('debiro.company-documents-session')) as Session;
    const companies = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
    const companyId = companies.state.activeCompanyId!;
    const state = structuredClone(owner.state), workspace = state.byCompany[companyId];
    if (options.volume) {
      const requirement = workspace.requirements[0], record = workspace.documents[0];
      workspace.requirements = Array.from({length: 23}, (_, index) => ({...requirement, id: `company-test-requirement-${index}`, currentDocumentId: `company-test-document-${index}`, name: {ro: `Document ${index}`, en: `Document ${index}`}}));
      workspace.documents = workspace.requirements.map((item, index) => ({...record, id: item.currentDocumentId!, documentName: item.name, issuer: index < 3 ? 'ONRC' : 'Other'}));
    }
    if (options.files) owner.files.set(companyId, new Map(workspace.documents.filter((record) => !record.supersededById).map((record) => [record.id, new Blob(['Actual test-only bytes'], {type: 'application/pdf'})])));
    if (options.malformed) Reflect.set(workspace, 'documents', [null]);
    owner.state = state; owner.listeners.forEach((notify) => notify());
    if (options.role || options.noAccess) {
      companies.state = {...companies.state, companies: companies.state.companies.map((company) => company.company.id === companyId ? {...company, members: company.members.map((member) => member.isCurrentUser ? {...member, ...(options.role && {role: options.role}), ...(options.noAccess && {status: 'invited' as const})} : member)} : company)};
      companies.listeners.forEach((notify) => notify());
    }
  }, options);
}
const rowIds = (page: Page) => page.locator('[data-company-document-row]').evaluateAll((items) => items.map((item) => item.getAttribute('data-company-document-row')));

for (const en of [false, true]) {
  const prefix = en ? '/en' : '';
  test(`${en ? 'EN' : 'RO'} Company group, listing semantics, locale entry and Employees placeholder`, async ({page}) => {
    await page.goto(`${prefix}/company/documents`);
    const navigation = page.getByRole('navigation', {name: en ? 'Application navigation' : 'Navigare în aplicație'});
    const company = navigation.getByRole('button', {name: en ? 'Company' : 'Companie', exact: true});
    await expect(company).toHaveAttribute('aria-expanded', 'true');
    await expect(navigation.locator('a[aria-current="page"]')).toHaveCount(1);
    await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute('href', `${prefix}/company/documents`);
    await expect(page.getByRole('navigation', {name: en ? 'Page navigation' : 'Navigare pe pagină'})).toHaveText(en ? 'CompanyCompany Documents' : 'CompanieDocumente companie');
    await expect(page.getByRole('heading', {level: 1})).toHaveText(en ? 'Company Documents' : 'Documente companie');
    expect(await page.locator('section[aria-label] [data-tone] strong').allTextContents()).toEqual(['5', '4', '0']);
    await expect(page.locator('[data-company-document-row]')).toHaveCount(6);
    await expect(page.locator('tbody [data-tone][data-status="missing"]')).toHaveCount(1);
    await expect(page.locator('tbody [data-tone][data-status="needs_review"]')).toHaveCount(1);
    await expect(page.locator('tbody [data-tone][data-status="valid"]')).toHaveCount(2);
    await expect(page.getByText(en ? 'Uploaded' : 'Încărcat', {exact: true})).toHaveCount(0);
    for (const checkbox of await page.getByRole('checkbox').all()) await expect(checkbox).toBeEnabled();
    await expect(page.getByRole('status')).toHaveText(en ? '0 selected' : '0 selectate');
    const add = page.getByRole('button', {name: en ? 'Add Documents' : 'Adaugă documente', exact: true});
    await add.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', {name: en ? 'Add Document' : 'Adaugă document', exact: true})).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(add).toBeFocused();
    const download = page.getByRole('button', {name: en ? 'Download VAT certificate' : 'Descarcă Certificat TVA', exact: true});
    await download.hover(); await expect(page.getByRole('tooltip')).toContainText(en ? 'not available' : 'nu este disponibil');
    await page.keyboard.press('Escape');
    await navigation.getByRole('link', {name: en ? 'Employees' : 'Angajați', exact: true}).click();
    await expect(page).toHaveURL(`${prefix}/company/employees`);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(en ? 'Employees' : 'Angajați');
    await expect(page.getByText(en ? 'Employee management will be available soon.' : 'Gestionarea angajaților va fi disponibilă în curând.')).toBeVisible();
    await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute('href', `${prefix}/company/employees`);
    await company.click(); await expect(company).toHaveAttribute('aria-expanded', 'false');
    await company.press('Enter'); await expect(company).toHaveAttribute('aria-expanded', 'true');
    await navigation.locator(`a[href="${prefix}/documents"]`).click();
    await expect(company).toHaveAttribute('aria-expanded', 'true');
    await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute('href', `${prefix}/documents`);
    await navigation.getByRole('button', {name: en ? 'Company settings' : 'Setări companie', exact: true}).click();
    await expect(company).toHaveAttribute('aria-expanded', 'true');
    await navigation.locator(`a[href="${prefix}/company/documents"]`).click();
    await expect(page.getByRole('heading', {level: 1})).toHaveText(en ? 'Company Documents' : 'Documente companie');
    await page.getByRole('link', {name: en ? 'RO' : 'EN', exact: true}).filter({visible: true}).click();
    await expect(page.getByRole('heading', {level: 1})).toHaveText(en ? 'Documente companie' : 'Company Documents');
    await expect(page.getByRole('searchbox')).toHaveAttribute('aria-label', en ? 'Caută documente ale companiei' : 'Search company documents');
  });

  test(`${en ? 'EN' : 'RO'} combined normalized search/filter/reset and deterministic column sorting`, async ({page}) => {
    await page.goto(`${prefix}/company/documents`);
    const before = await rowIds(page);
    expect(before[0]).toBe('company-requirement:vat'); expect(before.at(-1)).toBe('company-requirement:criminal-record');
    await page.getByRole('searchbox').fill(en ? '  PROFESSIONAL  ' : '  POLITA  '); await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('searchbox').fill(' ANAF ');
    await page.locator('#company-document-type').selectOption('tax');
    await page.locator('#company-document-status').selectOption('expiring_soon');
    expect(await rowIds(page)).toEqual(['company-requirement:tax']);
    await page.locator('#company-document-type').selectOption('insurance');
    await expect(page.getByText(en ? 'No documents match the selected filters.' : 'Nu am găsit documente pentru filtrele selectate.')).toBeVisible();
    await page.getByRole('button', {name: en ? 'Reset Filters' : 'Resetează filtrele', exact: true}).click();
    await expect(page.getByRole('searchbox')).toHaveValue(''); await expect(page.locator('tbody tr')).toHaveCount(6);
    await page.locator('#company-document-status').selectOption('expired');
    await page.getByRole('button', {name: en ? /Filter/ : /Filtrează/}).click();
    const filter = page.getByRole('dialog'); await expect(filter).toBeVisible();
    await filter.getByRole('button', {name: en ? 'Reset' : 'Resetează', exact: true}).click();
    await expect(page.locator('#company-document-status')).toHaveValue('all'); await page.keyboard.press('Escape');
    for (const [column, label] of [['name', en ? 'Document' : 'Document'], ['status', 'Status'], ['expiresAt', en ? 'Expiration Date' : 'Data expirării'], ['updatedAt', en ? 'Updated by' : 'Actualizat de']]) {
      const header = page.getByRole('columnheader', {name: label, exact: true});
      await header.getByRole('button').click(); await expect(header).toHaveAttribute('aria-sort', 'ascending');
      await header.getByRole('button').click(); await expect(header).toHaveAttribute('aria-sort', 'descending');
      await expect(page.locator('#company-document-sort')).toHaveValue(`${column}:descending`);
      if (column === 'expiresAt' || column === 'updatedAt') expect((await rowIds(page)).at(-1)).toBe('company-requirement:criminal-record');
    }
    await page.locator('#company-document-sort').selectOption('expiresAt:ascending'); expect(await rowIds(page)).toEqual(before);
  });
}

test('real test-only file eligibility, pagination, selection across pages and local sharing preparation', async ({page}) => {
  await page.goto('/en/company/documents'); await scenario(page, {volume: true});
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('checkbox', {name: 'Select all documents on this page', exact: true}).check();
  await expect(page.getByRole('status')).toHaveText('10 selected');
  await page.getByRole('button', {name: 'Next page', exact: true}).click();
  await expect(page.getByRole('checkbox', {name: 'Select all documents on this page', exact: true})).not.toBeChecked();
  await page.getByRole('checkbox', {name: 'Select all documents on this page', exact: true}).check();
  await expect(page.getByRole('status')).toHaveText('20 selected');
  await page.getByRole('button', {name: 'Next page', exact: true}).click(); await expect(page.locator('tbody tr')).toHaveCount(3);
  await page.getByRole('checkbox', {name: 'Select all documents on this page', exact: true}).check(); await expect(page.getByRole('status')).toHaveText('23 selected');
  const share = page.getByRole('button', {name: 'Share Selected', exact: true});
  await expect(share).toBeEnabled(); await share.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog').getByText('Selected Documents (23)', {exact: true})).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('External sharing will be available once the secure sharing service is enabled.');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', {name: 'Selected document actions'}).click(); await page.getByRole('menuitem', {name: 'Deselect all'}).click();
  await expect(page.getByRole('status')).toHaveText('0 selected');
  await page.getByRole('searchbox').fill('ONRC'); await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByRole('button', {name: 'Page 1', exact: true})).toHaveAttribute('aria-current', 'page');
  await page.getByRole('searchbox').fill(''); await page.getByRole('combobox', {name: 'Documents per page'}).selectOption('20'); await expect(page.locator('tbody tr')).toHaveCount(20);
  await mkdir('artifacts/visual/e1c-002', {recursive: true});
  await page.getByRole('checkbox', {name: 'Select all documents on this page', exact: true}).check();
  await page.screenshot({path: 'artifacts/visual/e1c-002/test-only-multiple-selection.png', fullPage: true});
});

test('company switching clears transient state, preserves company-owned records and never mixes vendor documents', async ({page}) => {
  await page.goto('/documents');
  const vendorIds = await page.locator('[data-document-id]').evaluateAll((items) => items.map((item) => item.getAttribute('data-document-id')));
  const records = await page.evaluate(() => (Reflect.get(window, Symbol.for('debiro.document-session')) as {documents: ReturnType<typeof readDocumentRecords>}).documents.map((record) => ({id: record.id, companyId: record.companyId, vendorId: record.vendorId, status: record.status})));
  await page.getByRole('button', {name: 'Companie', exact: true}).click(); await page.getByRole('link', {name: 'Documente companie', exact: true}).click();
  await scenario(page, {files: true}); await page.getByRole('checkbox', {name: 'Selectează toate documentele de pe pagină', exact: true}).check();
  await expect(page.getByRole('status')).toHaveText('6 selectate'); await page.getByRole('searchbox').fill('ANAF');
  await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services');
  await page.getByRole('link', {name: 'Documente companie', exact: true}).click();
  await expect(page.getByText('Nu există documente ale companiei.', {exact: true})).toBeVisible();
  expect(await page.locator('section[aria-label] [data-tone] strong').allTextContents()).toEqual(['0', '0', '0']);
  await expect(page.getByRole('status')).toHaveText('0 selectate'); await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.locator('#company-document-type option')).toHaveCount(1);
  await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL');
  await page.getByRole('link', {name: 'Documente companie', exact: true}).click(); await expect(page.locator('tbody tr')).toHaveCount(6);
  await expect(page.getByRole('status')).toHaveText('0 selectate'); await expect(page.getByRole('searchbox')).toHaveValue('');
  const nav = page.getByRole('navigation', {name: 'Navigare în aplicație'}); await nav.locator('a[href="/documents"]').click();
  await expect(page.locator('[data-document-id]')).toHaveCount(vendorIds.length);
  expect(await page.locator('[data-document-id]').evaluateAll((items) => items.map((item) => item.getAttribute('data-document-id')))).toEqual(vendorIds);
  expect(await page.evaluate(() => (Reflect.get(window, Symbol.for('debiro.document-session')) as {documents: ReturnType<typeof readDocumentRecords>}).documents.map((record) => ({id: record.id, companyId: record.companyId, vendorId: record.vendorId, status: record.status})))).toEqual(records);
  await createWorkspaceCompany(page, 'Company Documents Empty');
  await page.getByRole('button', {name: 'Companie', exact: true}).click();
  await page.getByRole('link', {name: 'Documente companie', exact: true}).click(); await expect(page.getByText('Nu există documente ale companiei.', {exact: true})).toBeVisible();
});

test('malformed listing stays inside the existing error boundary; read-only and inaccessible memberships are respected', async ({page}) => {
  await page.goto('/company/documents'); await scenario(page, {malformed: true});
  await expect(page.getByRole('main').getByRole('alert')).toContainText('A apărut o problemă'); await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'})).toBeVisible();
  await page.goto('/company/documents');
  for (const role of ['reviewer', 'viewer'] as const) {
    await scenario(page, {role}); await expect(page.locator('tbody tr')).toHaveCount(6);
    await expect(page.getByRole('button', {name: 'Adaugă documente', exact: true})).toBeDisabled();
  }
  await scenario(page, {noAccess: true}); await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('Nu există date pentru această companie în demonstrația locală.', {exact: true})).toBeVisible();
});

test('RO/EN company listing captures and compact navigation stay viewport-contained', async ({page}) => {
  test.setTimeout(120_000); await mkdir('artifacts/visual/e1c-002', {recursive: true});
  for (const en of [false, true]) for (const [width, height] of [[1448, 900], [1920, 1080], [1280, 800], [1024, 900], [768, 900], [375, 812], [320, 812]]) {
    await page.setViewportSize({width, height}); await page.goto(`${en ? '/en' : ''}/company/documents`);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(en ? 'Company Documents' : 'Documente companie');
    if (width > 800) {
      const company = (await page.getByRole('button', {name: en ? 'Company' : 'Companie', exact: true}).boundingBox())!;
      const reports = (await page.getByRole('button', {name: en ? 'Reports' : 'Rapoarte', exact: true}).boundingBox())!;
      expect(company.width).toBeCloseTo(reports.width, 2); expect(company.height).toBe(reports.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${en ? 'EN' : 'RO'} ${width}px overflow`).toBeLessThanOrEqual(width);
    const tableRegion = page.getByRole('region', {name: en ? 'Company documents table' : 'Tabel documente companie'});
    // The added Source column uses the same focusable inner scroller when usable width is below its minimum.
    const geometry = await tableRegion.evaluate((element) => ({available: element.clientWidth, actual: element.scrollWidth, minimum: parseFloat(getComputedStyle(element.querySelector('table')!).minWidth)}));
    expect(geometry.actual).toBeLessThanOrEqual(Math.max(geometry.available, geometry.minimum) + 1);
    if (width >= 1448) expect(geometry.actual - geometry.available).toBeLessThanOrEqual(1);
    const active = page.locator('#company-subnav a[aria-current="page"]'); await active.scrollIntoViewIfNeeded();
    const bounds = (await active.boundingBox())!; expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.screenshot({path: `artifacts/visual/e1c-002/${en ? 'en' : 'ro'}-${width}.png`, fullPage: true});
  }
});
