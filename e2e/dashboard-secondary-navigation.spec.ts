import {expect, test, type Page} from '@playwright/test';
import en from '../messages/en.json' with {type: 'json'};
import ro from '../messages/ro.json' with {type: 'json'};
import {openFilters} from './support/filters';
import {createWorkspaceCompany, switchWorkspaceCompany, workspaceSection} from './support/company-workspace';
import {createDocumentFixtureFile} from '../src/features/documents/fixture-files';
import type {EmployeeState} from '../src/features/employees/types';
import type {readCompanyState} from '../src/features/companies/company-state';

async function uploadFile() {const file = createDocumentFixtureFile({id: 'dashboard-proof', filename: 'dashboard-proof.pdf', version: 1, createdAt: '2026-10-02T12:00:00Z'}); return {name: file.name, mimeType: file.type, buffer: Buffer.from(await file.arrayBuffer())};}
async function seedOwnedDocuments(page: Page, english: boolean) {
  const c = english ? en : ro; await page.goto(`${english ? '/en' : ''}/company/documents`);
  await page.getByRole('button', {name: c.CompanyDocuments.addDocuments, exact: true}).click(); let dialog = page.getByRole('dialog');
  await dialog.locator('#company-upload-name').fill('Company renewal proof'); await dialog.locator('#company-upload-type').selectOption('custom'); await dialog.locator('#company-upload-expires').fill('04.10.2026'); await dialog.locator('input[type=file]').setInputFiles(await uploadFile()); await dialog.getByRole('button', {name: c.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
  const companyTotal = await page.getByRole('region', {name: c.CompanyDocuments.summaryLabel}).locator('strong').first().innerText();
  await page.getByRole('navigation', {name: c.AppShell.navigationLabel}).getByRole('link', {name: c.Employees.title, exact: true}).click(); await page.getByRole('link', {name: 'Andrei Popescu', exact: true}).click();
  await page.getByRole('button', {name: c.EmployeeDocuments.add, exact: true}).first().click(); dialog = page.getByRole('dialog'); await dialog.locator('#company-upload-name').fill('Private personnel renewal'); await dialog.locator('#company-upload-type').selectOption('custom'); await dialog.locator('#company-upload-expires').fill('03.10.2026'); await dialog.locator('input[type=file]').setInputFiles(await uploadFile()); await dialog.getByRole('button', {name: c.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
  // Test-only required-rule scenario; production still has no automatic template assignment.
  await page.evaluate(() => {const owner = Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState; listeners: Set<() => void>}; owner.state = structuredClone(owner.state); owner.state.byCompany['demo-company'].documentWorkspaces!['employee:andrei-popescu'].requirements[0].required = true; owner.listeners.forEach((notify) => notify());});
  await workspaceSection(page, 'dashboard', english); return companyTotal;
}

for (const english of [false, true]) {
  const c = english ? en : ro, prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} domain cards and View All use existing locale-aware directories and sections`, async ({page}) => {
    for (const [index, route] of ['/vendors', '/company/documents', '/company/employees'].entries()) {await page.goto(prefix + '/dashboard'); const card = page.getByRole('region', {name: c.Dashboard.overview.summary}).getByRole('link').nth(index); await expect(card).toHaveAttribute('href', prefix + route); await card.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(prefix + route);}
    for (const [panel, route, anchor] of [['vendors', '/vendors', ''], ['company-documents', '/company/documents', ''], ['employees', '/company/employees', ''], ['activity', '/notifications', '#audit-title'], ['expirations', '/notifications', '#expiring-section']]) {await workspaceSection(page, 'dashboard', english); await page.locator(`[data-dashboard-panel="${panel}"]`).getByRole('link', {name: panel === 'activity' ? c.Dashboard.overview.viewAllActivity : panel === 'vendors' || panel === 'employees' ? c.Dashboard.overview.viewAllPeople : c.Dashboard.viewAll, exact: true}).click(); await expect(page).toHaveURL(prefix + route + anchor);}
  });
  test(`${english ? 'EN' : 'RO'} owned current document metrics, activity and expiry navigate to the exact existing contexts`, async ({page}) => {
    const companyTotal = await seedOwnedDocuments(page, english), summary = page.getByRole('region', {name: c.Dashboard.overview.summary});
    await expect(summary.locator('strong')).toHaveText(['24', companyTotal, '8']);
    const employee = page.locator('[data-dashboard-employee]').first(); await expect(employee).toContainText('Andrei Popescu'); await expect(employee).toContainText(c.EmployeeDocuments.tracking.attention);
    const expirations = page.locator('[data-dashboard-expiration]'); await expect(expirations).toHaveCount(5); await expect(expirations.nth(0)).toContainText('Private personnel renewal'); await expect(expirations.filter({hasText: 'Company renewal proof'})).toHaveCount(0);
    await page.locator('[data-dashboard-company-document]').getByRole('button', {name: /Company renewal proof/}).click(); const dialog = page.getByRole('dialog'); await expect(dialog.locator('dd').filter({hasText: /^Company renewal proof$/})).toBeVisible(); await expect(dialog.getByRole('button', {name: c.CompanyDocumentManagement.confirm, exact: true})).toBeVisible(); await expect(dialog.locator('[data-document-file-actions] button')).toHaveText([c.CompanyDocumentManagement.preview, c.DocumentManagement.download]); await dialog.getByRole('button', {name: c.CompanyDocumentManagement.confirm, exact: true}).click(); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await expect(expirations.nth(1)).toContainText('Company renewal proof');
    await expirations.nth(1).getByRole('button').click(); await expect(dialog.locator('dd').filter({hasText: /^Company renewal proof$/})).toBeVisible(); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    const activity = page.locator('[data-dashboard-event]').first(); await expect(activity).toContainText(c.EmployeeDocuments.events.document_upload); await expect(activity).toContainText('Andrei Popescu'); await activity.getByRole('link').click(); await expect(page).toHaveURL(prefix + '/company/employees/employee%3Aandrei-popescu');
    await workspaceSection(page, 'dashboard', english); await employee.getByRole('link').click(); await expect(page.getByRole('heading', {level: 2, name: 'Andrei Popescu'})).toBeVisible();
    await workspaceSection(page, 'dashboard', english); await page.screenshot({path: `artifacts/visual/e1c-007a/actionable-${english ? 'en' : 'ro'}.png`, fullPage: true});
  });
  test(`${english ? 'EN' : 'RO'} restricted personnel metadata never enters Dashboard metrics activity or expirations`, async ({page}) => {
    await seedOwnedDocuments(page, english);
    for (const role of ['reviewer', 'viewer'] as const) {
      await page.evaluate((role) => {const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>}; owner.state = {...owner.state, companies: owner.state.companies.map((company) => company.company.id === owner.state.activeCompanyId ? {...company, members: company.members.map((member) => member.isCurrentUser ? {...member, role} : member)} : company)}; owner.listeners.forEach((notify) => notify());}, role);
      await expect(page.locator('main')).not.toContainText('Private personnel renewal'); await expect(page.locator('[data-dashboard-panel="employees"]')).toContainText(c.EmployeeDocuments.restricted); await expect(page.locator('[data-dashboard-event^="employee:"]')).toHaveCount(0); await expect(page.locator('[data-dashboard-expiration^="employee:"]')).toHaveCount(0);
    }
  });
  test(`${english ? 'EN' : 'RO'} empty domains and company switch never reuse another company's data`, async ({page}) => {
    await createWorkspaceCompany(page, 'Workspace B', english); const summary = page.getByRole('region', {name: c.Dashboard.overview.summary}); await expect(summary.locator('strong')).toHaveText(['0', '0', '0']);
    for (const attribute of ['vendor', 'company-document', 'employee', 'event', 'expiration']) await expect(page.locator(`[data-dashboard-${attribute}]`)).toHaveCount(0);
    await expect(page.getByRole('button', {name: c.CompanyWorkspace.firstVendor})).toBeVisible(); await expect(page.locator('[data-dashboard-panel]')).toHaveCount(5);
    await switchWorkspaceCompany(page, 'Workspace B', 'Demo Company SRL', english); await expect(summary.locator('strong')).toHaveText(['24', '5', '8']); await page.locator('[data-dashboard-company-document]').first().getByRole('button').click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Workspace B', english); await expect(summary.locator('strong')).toHaveText(['0', '0', '0']); await expect(page.locator('main')).not.toContainText('Andrei Popescu');
  });
  test(`${english ? 'EN' : 'RO'} existing Documents attention deep links still expose the complete filtered result`, async ({page}) => {
    await page.goto(prefix + '/documents?attention=1'); await openFilters(page);
    for (const status of ['review', 'expiring', 'expired'] as const) await expect(page.getByRole('checkbox', {name: new RegExp(c.Documents.status[status])})).toBeChecked(); await expect(page.getByRole('checkbox', {name: new RegExp(c.Documents.status.valid)})).not.toBeChecked(); await page.keyboard.press('Escape');
    await expect(page.getByText(c.Documents.showing.replace('{start}', '1').replace('{end}', '8').replace('{count}', '10'))).toBeVisible(); await workspaceSection(page, 'vendors', english); await workspaceSection(page, 'documents', english); await openFilters(page); await expect(page.getByRole('checkbox', {name: new RegExp(c.Documents.status.review)})).not.toBeChecked();
  });
  test(`${english ? 'EN' : 'RO'} switching A to B and back discards an open Dashboard document context`, async ({page}) => {
    await page.goto(prefix + '/dashboard'); await page.locator('[data-dashboard-company-document]').first().getByRole('button').click(); await expect(page.getByRole('dialog')).toBeVisible();
    await page.evaluate(() => {const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>}; owner.state = {...owner.state, activeCompanyId: 'global-clean-services'}; owner.listeners.forEach((notify) => notify());});
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL', english); await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}
