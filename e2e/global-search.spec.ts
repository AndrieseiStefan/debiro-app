import {expect, test, type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import type {readCompanyState} from '../src/features/companies/company-state';
import type {readRequirementsState} from '../src/features/requirements/requirements-state';
import type {getVendorState} from '../src/features/vendors/created-vendors';
import type {readDocumentRecords} from '../src/features/documents/created-documents';
import {switchWorkspaceCompany} from './support/company-workspace';

const panel = (page: Page) => page.locator('[data-global-search-panel]');
const input = (page: Page, en = false) => page.getByRole('combobox', {name: en ? 'Search vendors, documents or templates' : 'Caută furnizori, documente sau șabloane', exact: true});
async function query(page: Page, value: string, en = false) {await input(page, en).fill(value); await expect(panel(page)).toBeVisible();}
async function open(page: Page, id: string) {await page.locator(`[data-search-result="${id}"]`).click(); await expect(panel(page)).toHaveCount(0);}

// Test-only role/volume/edge-state scenarios use the existing tab-local registry, not product fixtures or APIs.
async function scenario(page: Page, options: {role?: 'viewer' | 'reviewer'; draft?: boolean; volume?: boolean; stale?: boolean}) {
  await page.evaluate((options) => {
    type Session<T> = {state: T; listeners: Set<() => void>};
    const companies = Reflect.get(window, Symbol.for('debiro.company-session')) as Session<ReturnType<typeof readCompanyState>>;
    const requirements = Reflect.get(window, Symbol.for('debiro.requirements-session')) as Session<ReturnType<typeof readRequirementsState>>;
    const vendors = Reflect.get(window, Symbol.for('debiro.vendor-session')) as Session<ReturnType<typeof getVendorState>>;
    const companyId = companies.state.activeCompanyId!;
    if (options.role) {
      companies.state = {...companies.state, companies: companies.state.companies.map((record) => record.company.id === companyId ? {...record, members: record.members.map((member) => member.isCurrentUser ? {...member, role: options.role!} : member)} : record)};
      companies.listeners.forEach((notify) => notify());
    }
    if (options.draft) {
      requirements.state = {...requirements.state, byCompany: {...requirements.state.byCompany, [companyId]: {...requirements.state.byCompany[companyId], draft: {id: 'search-draft', scope: 'vendor', name: 'Șablon general Search', description: 'Incomplete search setup', categoryId: '', iconKey: 'file', iconColorKey: 'blue', documents: [], isNew: true, isDirty: true}}}};
      requirements.listeners.forEach((notify) => notify());
    }
    if (options.volume) {
      const base = vendors.state.fixtureVendors[0];
      vendors.state = {...vendors.state, fixtureVendors: [...vendors.state.fixtureVendors, ...Array.from({length: 51}, (_, index) => ({...base, id: `search-volume-${index}`, name: `Search Volume ${index}`}))]};
      vendors.listeners.forEach((notify) => notify());
    }
    if (options.stale) {
      // Change after focus but before React activation, deliberately withholding notification.
      document.addEventListener('click', () => {
        vendors.state = {...vendors.state, fixtureVendors: vendors.state.fixtureVendors.filter((vendor) => vendor.id !== 'construct-pro')};
      }, {capture: true, once: true});
    }
  }, options);
}

for (const en of [false, true]) {
  const prefix = en ? '/en' : '';
  test(`${en ? 'EN' : 'RO'} live groups, counts, normalization and keyboard navigation`, async ({page}) => {
    await page.goto(`${prefix}/dashboard`);
    const search = input(page, en), url = page.url();
    const bounds = await search.locator('..').boundingBox(); expect(bounds?.height).toBe(45);
    for (const shortcut of ['Meta+k', 'Control+k']) {
      await page.keyboard.press(shortcut); await expect(search).toBeFocused(); await expect(panel(page)).toBeVisible();
      await expect(panel(page).getByRole('option')).toHaveCount(0);
      await page.keyboard.press('Escape'); await expect(panel(page)).toHaveCount(0); await expect(search).toBeFocused();
    }
    await query(page, '  a  ', en); await expect(page).toHaveURL(url);
    const groups = panel(page).getByRole('group'); await expect(groups).toHaveCount(3);
    let count = 0;
    for (const group of await groups.all()) {
      const rows = await group.getByRole('option').count(); count += rows;
      await expect(group.getByRole('heading')).toContainText(`(${rows})`);
    }
    await expect(panel(page).getByRole('status')).toContainText(String(count));
    await expect(panel(page).getByText(/Vezi toate|View all/)).toHaveCount(0);
    await query(page, en ? 'IT services' : 'Servicii IT', en);
    await expect(panel(page).getByRole('heading', {name: en ? 'Templates (1)' : 'Șabloane (1)'})).toBeVisible();
    await expect(panel(page).getByRole('status')).toHaveText(en ? 'Found 1 result: 1 template' : 'Am găsit 1 rezultat: 1 șablon');
    await query(page, 'zzzzz-no-match', en); await expect(panel(page).getByRole('group')).toHaveCount(0);
    await expect(panel(page).getByText(en ? 'No results found' : 'Nu am găsit rezultate', {exact: true})).toHaveCount(1);
    await expect(panel(page)).toContainText(en ? 'No vendors, documents or templates match your search.' : 'Nu există furnizori, documente sau șabloane care să corespundă căutării.');
    await panel(page).getByRole('button', {name: en ? 'Close search' : 'Închide căutarea'}).click();
    await expect(panel(page)).toHaveCount(0); await expect(search).toBeFocused();
    await query(page, '  CONSTRUCT   PRO ', en);
    await expect(panel(page).getByRole('option')).toHaveCount(1);
    await expect(panel(page).locator('mark')).toHaveText('Construct Pro');
    await search.press('Enter'); await expect(page).toHaveURL(url);
    await search.press('ArrowDown'); await expect(panel(page).getByRole('option')).toHaveAttribute('aria-selected', 'true');
    await search.press('Enter'); await expect(page).toHaveURL(`${prefix}/vendors/construct-pro`);
    await expect(page.getByRole('heading', {name: 'Construct Pro SRL', exact: true})).toBeVisible();
    await page.goBack(); await expect(page).toHaveURL(url);
    await query(page, en ? 'maintenance' : 'intretinere', en); await expect(panel(page).getByRole('group')).toHaveCount(1);
    await page.getByRole('button', {name: en ? 'Clear search' : 'Șterge căutarea'}).click();
    await expect(panel(page).getByRole('option')).toHaveCount(0); await expect(panel(page)).not.toContainText(en ? 'No results found' : 'Nu am găsit rezultate');
    await query(page, '  \t  ', en); await expect(panel(page).getByRole('option')).toHaveCount(0);
    await page.getByRole('navigation', {name: en ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: 'Dashboard', exact: true}).click(); await expect(panel(page)).toHaveCount(0);
    await page.keyboard.press('Control+k'); await expect(search).toHaveValue(''); await search.press('Tab');
    await expect(panel(page)).toHaveCount(0);
  });

  test(`${en ? 'EN' : 'RO'} current documents reuse Review and Details/History`, async ({page}) => {
    await page.goto(`${prefix}/dashboard`);
    const records = await page.evaluate(() => (Reflect.get(window, Symbol.for('debiro.document-session')) as {documents: ReturnType<typeof readDocumentRecords>}).documents.filter((doc) => !doc.supersededById && doc.reviewOutcome !== 'rejected'));
    for (const status of ['review', 'valid', 'expiring', 'expired']) {
      const document = records.find((doc) => doc.status === status)!;
      await query(page, document.filename, en); await open(page, `document:${document.id}`);
      if (status === 'review') {
        await expect(page).toHaveURL(`${prefix}/documents/${document.id}/review`);
        await expect(page.getByRole('button', {name: en ? 'Confirm and save' : 'Confirmă și salvează', exact: true})).toBeVisible();
        await page.goBack();
      } else {
        await expect(page).toHaveURL(`${prefix}/documents?document=${encodeURIComponent(document.id)}`);
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('dialog').getByRole('button', {name: en ? 'Close' : 'Închide', exact: true}).first().click();
      }
    }
    await query(page, 'Autorizatie_ISU_v1.pdf', en); await expect(panel(page).getByRole('option')).toHaveCount(0);
    await query(page, 'Autorizatie_ISU.pdf', en); await open(page, 'document:construct-pro-fire-2024');
    const details = page.getByRole('dialog'); await expect(details.getByRole('heading', {name: en ? 'Version history (2)' : 'Istoric versiuni (2)'})).toBeVisible();
    await details.getByRole('button', {name: en ? 'View all' : 'Vezi toate'}).click();
    await expect(details.locator('[data-version]')).toHaveCount(2);
    await details.getByRole('button', {name: en ? 'Back to document details' : 'Înapoi la detalii document'}).click();
    await expect(details.locator('[data-preview-version]')).toHaveCount(2);
  });

  test(`${en ? 'EN' : 'RO'} template entry, current dirty edit and incomplete draft are preserved`, async ({page}) => {
    await page.goto(`${prefix}/dashboard`); await query(page, en ? 'IT services' : 'Servicii IT', en); await open(page, 'requirement:software');
    await expect(page).toHaveURL(`${prefix}/requirements?template=software`);
    const name = page.locator('#requirement-template-name'); await expect(name).toHaveValue(en ? 'IT services' : 'Servicii IT');
    await name.fill('Unsaved Search Edit');
    await query(page, en ? 'IT services' : 'Servicii IT', en); await open(page, 'requirement:software');
    await expect(name).toHaveValue('Unsaved Search Edit'); await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await query(page, en ? 'Construction' : 'Construcții', en); await page.locator('[data-search-result="requirement:construction"]').click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', {name: en ? 'Continue editing' : 'Continuă editarea'}).click(); await expect(name).toHaveValue('Unsaved Search Edit');
    await page.keyboard.press('Escape');
    await scenario(page, {draft: true});
    await query(page, 'sablon general', en); await expect(panel(page)).toContainText(en ? 'Draft' : 'Ciornă'); await open(page, 'requirement:search-draft');
    await expect(name).toHaveValue('Șablon general Search'); await expect(page.locator('#requirement-template-category')).toHaveValue('');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('button', {name: en ? 'Save template' : 'Salvează șablon'})).toHaveAttribute('aria-disabled', 'true');
    expect(await page.evaluate(() => (Reflect.get(window, Symbol.for('debiro.requirements-session')) as {state: ReturnType<typeof readRequirementsState>}).state.byCompany['demo-company'].draft?.id)).toBe('search-draft');
  });
}

for (const en of [false, true]) for (const role of ['viewer', 'reviewer'] as const) {
  const prefix = en ? '/en' : '';
  test(`${en ? 'EN' : 'RO'} ${role} uses existing allowed document and read-only Requirement destinations`, async ({page}) => {
    await page.goto(`${prefix}/dashboard`); await scenario(page, {role});
    await query(page, 'Certificat_fiscal_CP_2024.pdf', en); await open(page, 'document:construct-pro-tax-2024');
    if (role === 'viewer') {
      await expect(page).toHaveURL(`${prefix}/documents?document=construct-pro-tax-2024`);
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('link', {name: en ? 'Review document' : 'Revizuiește documentul'})).toHaveCount(0);
      await page.getByRole('dialog').getByRole('button', {name: en ? 'Close' : 'Închide', exact: true}).first().click();
    } else {
      await expect(page).toHaveURL(`${prefix}/documents/construct-pro-tax-2024/review`);
      await expect(page.getByRole('button', {name: en ? 'Confirm and save' : 'Confirmă și salvează', exact: true})).toBeVisible(); await page.goBack();
    }
    await query(page, en ? 'IT services' : 'Servicii IT', en); await open(page, 'requirement:software');
    await expect(page.locator('[data-requirement-readonly]')).toBeVisible();
    await expect(page.getByRole('heading', {name: en ? 'IT services' : 'Servicii IT', exact: true})).toBeVisible();
    await expect(page.locator('#requirement-template-name')).toHaveCount(0);
    await expect(page.getByRole('button', {name: en ? 'Save template' : 'Salvează șablon'})).toHaveCount(0);
  });
}

test('an incomplete draft opens from Dashboard without finalizing; mobile selection remains usable', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812}); await page.goto('/dashboard'); await scenario(page, {draft: true});
  await query(page, 'Incomplete search setup'); await open(page, 'requirement:search-draft');
  await expect(page).toHaveURL('/requirements?template=search-draft');
  await expect(page.locator('#requirement-template-name')).toHaveValue('Șablon general Search');
  await expect(page.locator('#requirement-template-category')).toHaveValue('');
  await expect(page.getByRole('button', {name: 'Salvează șablon'})).toHaveAttribute('aria-disabled', 'true');
  await query(page, 'sablon general'); await input(page).press('ArrowDown'); await input(page).press('Enter');
  await expect(panel(page)).toHaveCount(0); await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('search reopens a same-URL template and confirmed dirty navigation still opens the chosen result', async ({page}) => {
  await page.goto('/requirements?template=software');
  const name = page.locator('#requirement-template-name'); await expect(name).toHaveValue('Servicii IT');
  await page.locator('[data-template-id="construction"]').click(); await expect(name).toHaveValue('Subcontractor construcții');
  await query(page, 'Servicii IT'); await open(page, 'requirement:software'); await expect(name).toHaveValue('Servicii IT');
  await name.fill('Unsaved guarded edit');
  await query(page, 'Construct Pro'); await page.locator('[data-search-result="vendor:construct-pro"]').click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page).toHaveURL('/vendors/construct-pro'); await expect(panel(page)).toHaveCount(0);
});

test('company switch closes/clears search and cannot leak Demo results; stale activation is rejected', async ({page}) => {
  await page.goto('/dashboard'); await query(page, 'Construct Pro');
  await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services');
  await expect(panel(page)).toHaveCount(0); await expect(input(page)).toHaveValue('');
  await query(page, 'construct'); await expect(panel(page).getByRole('option')).toHaveCount(0);
  await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL');
  await query(page, 'Construct Pro'); await expect(panel(page).getByRole('option')).toHaveCount(1);
  await scenario(page, {stale: true}); await page.locator('[data-search-result="vendor:construct-pro"]').click();
  await expect(page).toHaveURL('/dashboard'); await expect(panel(page).getByRole('alert')).toBeVisible();
  await query(page, 'Construct Pro'); await expect(panel(page).getByRole('option')).toHaveCount(0);
});

test('all 51 results are internally scrollable and keyboard reachable without growing the page', async ({page}) => {
  await page.goto('/dashboard'); await scenario(page, {volume: true});
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await query(page, 'Search Volume'); await expect(panel(page).getByRole('option')).toHaveCount(51);
  await expect(panel(page).getByRole('status')).toContainText('51');
  expect(await panel(page).evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
  await input(page).press('ArrowUp'); await expect(panel(page).getByRole('option').last()).toHaveAttribute('aria-selected', 'true');
  expect(await panel(page).evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await panel(page).getByRole('option').last().focus(); await page.keyboard.press('Escape'); await expect(panel(page)).toHaveCount(0); await expect(input(page)).toBeFocused();
});

test('responsive RO/EN visual captures keep shell geometry and panel inside the viewport', async ({page}) => {
  await mkdir('artifacts/visual/e1-032bf', {recursive: true});
  for (const en of [false, true]) {
    await page.goto(en ? '/en/dashboard' : '/dashboard');
    for (const width of [1672, 1024, 768, 600, 375, 320]) {
      await page.setViewportSize({width, height: width === 1672 ? 1086 : 812});
      await query(page, 'a', en); await expect(panel(page).getByRole('group')).toHaveCount(3);
      const box = await panel(page).boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(width === 1672 ? 1086 : 812);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await panel(page).evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(Math.ceil(box!.width));
      await page.screenshot({path: `artifacts/visual/e1-032bf/${en ? 'en' : 'ro'}-${width}.png`});
      if ([1672, 768, 375, 320].includes(width)) {
        await query(page, en ? 'certificate' : 'certificat', en);
        await page.screenshot({path: `artifacts/visual/e1-032bf/${en ? 'en' : 'ro'}-documents-${width}.png`});
        await query(page, en ? 'IT services' : 'Servicii IT', en);
        await page.screenshot({path: `artifacts/visual/e1-032bf/${en ? 'en' : 'ro'}-requirements-${width}.png`});
      }
      await input(page, en).press('Escape');
    }
  }
});
