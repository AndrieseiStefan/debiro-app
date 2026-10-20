import {expect, test, type Page} from '@playwright/test';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import {createDocumentFixtureFile} from '../src/features/documents/fixture-files';
import type {EmployeeState} from '../src/features/employees/types';
import type {readCompanyState} from '../src/features/companies/company-state';
import {switchWorkspaceCompany} from './support/company-workspace';

const panel = (page: Page) => page.locator('[data-global-search-panel]');
const search = (page: Page, english: boolean) => page.getByRole('combobox', {name: (english ? en : ro).AppShell.searchLabel, exact: true});
const employeeId = 'employee:alexandra-ionescu';
async function query(page: Page, value: string, english: boolean) {await search(page, english).fill(value); await expect(panel(page)).toBeVisible();}
async function employee(page: Page, id: string, english: boolean) {await query(page, id.replace('employee:', '').replace('-', '.'), english); await panel(page).locator(`[data-search-result="employee:${id}"]`).click(); await expect(page).toHaveURL(`${english ? '/en' : ''}/company/employees/${encodeURIComponent(id)}`);}
async function file(name: string) {const value = createDocumentFixtureFile({id: name, filename: name, version: 1, createdAt: '2026-10-02T12:00:00Z'}); return {name: value.name, mimeType: value.type, buffer: Buffer.from(await value.arrayBuffer())};}
async function upload(page: Page, english: boolean, domain: 'employee' | 'company', name: string) {
  const c = english ? en : ro;
  await page.getByRole('button', {name: domain === 'employee' ? c.EmployeeDocuments.add : c.CompanyDocuments.addDocuments, exact: true}).first().click();
  const dialog = page.getByRole('dialog'); await dialog.locator('#company-upload-name').fill(name); await dialog.locator('#company-upload-type').selectOption('custom'); await dialog.locator('#company-upload-issuer').fill('Search Authority');
  await dialog.locator('input[type=file]').setInputFiles(await file('search-original.pdf')); await dialog.getByRole('button', {name: c.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
}
async function role(page: Page, role: 'administrator' | 'viewer' | 'reviewer') {
  await page.evaluate((role) => {const session = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>}; session.state = {...session.state, companies: session.state.companies.map((company) => company.company.id === session.state.activeCompanyId ? {...company, members: company.members.map((member) => member.isCurrentUser ? {...member, role} : member)} : company)}; session.listeners.forEach((notify) => notify());}, role);
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '', c = english ? en : ro;
  test(`${english ? 'EN' : 'RO'} Employee profile fields, creation, edits, department and status stay live`, async ({page}) => {
    await page.goto(prefix + '/dashboard');
    for (const term of ['Alexandra', 'Ionescu', 'alexandra.ionescu@demo.ro', 'Specialist Marketing', 'Marketing']) {
      await query(page, term, english); await expect(panel(page).locator(`[data-search-result="employee:${employeeId}"]`)).toBeVisible();
    }
    await search(page, english).press('ArrowDown'); await search(page, english).press('Enter'); await expect(page).toHaveURL(prefix + '/company/employees/employee%3Aalexandra-ionescu');
    await page.getByRole('button', {name: c.Employees.edit, exact: true}).click(); let dialog = page.getByRole('dialog');
    await dialog.locator('#employee-jobTitle').fill('Search Updated Position'); const department = dialog.locator('#employee-department'); await department.fill('Financiar'); await department.press('ArrowDown'); await department.press('ArrowDown'); await department.press('Enter');
    await dialog.locator('#employee-status').selectOption('inactive'); await dialog.getByRole('button', {name: c.Employees.save, exact: true}).click(); await expect(dialog).toHaveCount(0);
    await query(page, 'Search Updated Position', english); await expect(panel(page).getByRole('option')).toContainText('Alexandra Ionescu'); await expect(panel(page).getByRole('option')).toContainText('Financiar');
    await page.keyboard.press('Escape'); await page.getByRole('navigation', {name: c.Employees.breadcrumbLabel}).getByRole('link', {name: c.Employees.title, exact: true}).click();
    await page.getByRole('button', {name: c.Employees.add, exact: true}).click(); dialog = page.getByRole('dialog');
    for (const [field, value] of Object.entries({firstName: 'Search', lastName: 'Created', email: 'search.created@example.test', jobTitle: 'Created Position', hireDate: '01.03.2026'})) await dialog.locator(`#employee-${field}`).fill(value);
    await dialog.getByRole('button', {name: c.Employees.add, exact: true}).click(); await expect(dialog).toHaveCount(0);
    await query(page, 'search.created@example.test', english); await expect(panel(page).getByRole('option')).toContainText('Search Created');
  });

  test(`${english ? 'EN' : 'RO'} Company current/missing results reuse Details and page contexts; upload and metadata edits stay live`, async ({page}) => {
    await page.goto(prefix + '/dashboard'); const originalUrl = page.url();
    await query(page, 'iso.pdf', english); await search(page, english).press('ArrowDown'); await search(page, english).press('Enter');
    let dialog = page.getByRole('dialog'); await expect(dialog.getByRole('heading', {name: c.DocumentManagement.detailsTitle, exact: true})).toBeVisible(); await expect(page).toHaveURL(originalUrl);
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(search(page, english)).toBeFocused(); await expect(panel(page)).toHaveCount(0);
    await query(page, english ? 'Tax clearance record' : 'Cazier', english); const missing = panel(page).locator('[data-search-result^="company_document:"]'); await expect(missing).toContainText(c.CompanyDocuments.status.missing); await missing.click();
    await expect(page).toHaveURL(prefix + '/company/documents'); await upload(page, english, 'company', 'Company Search Document');
    await query(page, 'Company Search Document', english); await panel(page).locator('[data-search-result^="company_document:"]').click(); dialog = page.getByRole('dialog');
    await dialog.getByRole('button', {name: c.CompanyDocumentManagement.metadataTitle, exact: true}).click();
    await dialog.locator('input').first().fill('Company Search Renamed'); await dialog.getByRole('button', {name: c.CompanyDocumentManagement.save, exact: true}).click();
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await query(page, 'Company Search Renamed', english); await expect(panel(page).locator('[data-search-result^="company_document:"]')).toHaveCount(1);
    await query(page, 'Search Authority', english); await expect(panel(page).locator('[data-search-result^="company_document:"]')).toHaveCount(1);
    await query(page, 'registration-v1', english); await expect(panel(page).getByRole('option')).toHaveCount(0);
  });

  test(`${english ? 'EN' : 'RO'} Employee current documents keep owners distinct, replace without history results and reveal existing Documents tab`, async ({page}) => {
    await page.goto(prefix + '/company/employees/employee%3Aalexandra-ionescu'); await upload(page, english, 'employee', 'Fișă Search Aptitudine');
    await employee(page, 'employee:andrei-popescu', english); await upload(page, english, 'employee', 'Fișă Search Aptitudine');
    await query(page, 'fisa search aptitudine', english); let documents = panel(page).locator('[data-search-result^="employee_document:"]'); await expect(documents).toHaveCount(2);
    const targets = await documents.evaluateAll((rows) => rows.map((row) => row.getAttribute('href'))); expect(new Set(targets).size).toBe(2);
    await documents.filter({hasText: 'Alexandra Ionescu'}).click(); await expect(page).toHaveURL(prefix + '/company/employees/employee%3Aalexandra-ionescu');
    await page.getByRole('tab', {name: c.EmployeeDocuments.activity, exact: true}).click();
    await query(page, 'fisa search aptitudine', english); await panel(page).locator('[data-search-result^="employee_document:"]').filter({hasText: 'Alexandra Ionescu'}).click();
    await expect(page.getByRole('tab', {name: c.EmployeeDocuments.documents, exact: true})).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('row', {name: /Fișă Search Aptitudine/}).getByRole('button', {name: 'Fișă Search Aptitudine', exact: true}).click(); let dialog = page.getByRole('dialog');
    await dialog.getByRole('button', {name: c.CompanyDocumentManagement.replaceTitle, exact: true}).click(); dialog = page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles(await file('search-replacement.pdf')); await dialog.getByRole('button', {name: c.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
    await query(page, 'search-replacement.pdf', english); documents = panel(page).locator('[data-search-result^="employee_document:"]'); await expect(documents).toHaveCount(1); await expect(documents).toContainText('Alexandra Ionescu');
    await query(page, 'search-original.pdf', english); documents = panel(page).locator('[data-search-result^="employee_document:"]'); await expect(documents).toHaveCount(1); await expect(documents).toContainText('Andrei Popescu');
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services', english); await expect(page).toHaveURL(prefix + '/dashboard'); await expect(panel(page)).toHaveCount(0); await expect(search(page, english)).toHaveValue('');
    await query(page, 'Search Aptitudine', english); await expect(panel(page).getByRole('option')).toHaveCount(0);
  });

  test(`${english ? 'EN' : 'RO'} restricted personnel never reaches matching/counts/DOM; stale activation is rejected`, async ({page}) => {
    await page.goto(prefix + '/company/employees/employee%3Aalexandra-ionescu'); await upload(page, english, 'employee', 'Private Personnel Needle');
    for (const value of ['viewer', 'reviewer'] as const) {
      await role(page, value); await query(page, 'Search Authority', english); await expect(panel(page).getByRole('option')).toHaveCount(0); await expect(panel(page)).not.toContainText('Private Personnel Needle');
      await expect(panel(page).getByRole('group')).toHaveCount(0); expect(await panel(page).innerHTML()).not.toContain('employee_document:');
      await query(page, 'alexandra.ionescu@demo.ro', english); await expect(panel(page).getByRole('option')).toContainText('Alexandra Ionescu');
    }
    await role(page, 'administrator'); await query(page, 'Search Authority', english); await expect(panel(page).getByRole('option')).toHaveCount(1);
    await page.evaluate(() => {document.addEventListener('click', () => {const session = Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState}; session.state = structuredClone(session.state); session.state.byCompany['demo-company'].employees = session.state.byCompany['demo-company'].employees.filter((item) => item.id !== 'employee:alexandra-ionescu');}, {capture: true, once: true});});
    const url = page.url(); await panel(page).getByRole('option').click(); await expect(page).toHaveURL(url); await expect(panel(page).getByRole('alert')).toHaveText(c.GlobalSearch.unavailable);
  });

  test(`${english ? 'EN' : 'RO'} new-domain navigation retains existing dirty Template confirmation`, async ({page}) => {
    await page.goto(prefix + '/requirements?template=software'); const name = page.locator('#requirement-template-name'); await name.fill('Unsaved Search Domain Edit');
    await query(page, 'alexandra.ionescu@demo.ro', english); await panel(page).getByRole('option').click();
    const confirm = page.getByRole('alertdialog'); await expect(confirm).toBeVisible();
    await confirm.getByRole('button', {name: english ? 'Continue editing' : 'Continuă editarea'}).click(); await expect(name).toHaveValue('Unsaved Search Domain Edit');
    await query(page, 'alexandra.ionescu@demo.ro', english); await panel(page).getByRole('option').click();
    await page.getByRole('alertdialog').getByRole('button', {name: english ? 'Discard changes' : 'Renunță la modificări'}).click();
    await expect(page).toHaveURL(prefix + '/company/employees/employee%3Aalexandra-ionescu'); await expect(panel(page)).toHaveCount(0);
  });

  test(`${english ? 'EN' : 'RO'} six groups remain keyboard reachable and visually contained at every required width`, async ({page}) => {
    await page.goto(prefix + '/company/employees/employee%3Aalexandra-ionescu'); await upload(page, english, 'employee', 'Search Personnel Aptitudine');
    const failures: string[] = []; page.on('pageerror', (error) => failures.push(error.message)); page.on('console', (message) => {if (message.type() === 'error' && /hydration/i.test(message.text())) failures.push(message.text());});
    for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [1024, 768], [768, 900], [375, 812], [320, 720]]) {
      await page.setViewportSize({width, height}); await query(page, 'a', english); await expect(panel(page).getByRole('group')).toHaveCount(6);
      for (const label of Object.values(c.GlobalSearch.groups)) await expect(panel(page).getByRole('heading', {name: new RegExp(`^${label} `)})).toHaveCount(1);
      await search(page, english).press('ArrowUp'); await expect(panel(page).getByRole('option').last()).toHaveAttribute('aria-selected', 'true');
      expect(await panel(page).evaluate((element) => {const bounds = element.getBoundingClientRect(); return bounds.left >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight && element.scrollWidth <= Math.ceil(bounds.width) && document.documentElement.scrollWidth <= innerWidth;})).toBe(true);
      await page.screenshot({path: `artifacts/visual/e1c-007c/${english ? 'en' : 'ro'}-${width}.png`});
      await query(page, 'ANAF', english); await expect(panel(page).locator('[data-search-result^="company_document:"]')).not.toHaveCount(0);
      expect(await panel(page).evaluate((element) => element.scrollTop === 0 && element.querySelector('h3')!.getBoundingClientRect().top >= element.querySelector('header')!.getBoundingClientRect().bottom - 1)).toBe(true);
      await page.screenshot({path: `artifacts/visual/e1c-007c/company-${english ? 'en' : 'ro'}-${width}.png`});
      await page.keyboard.press('Escape'); await expect(search(page, english)).toBeFocused();
    }
    expect(failures).toEqual([]);
  });
}
