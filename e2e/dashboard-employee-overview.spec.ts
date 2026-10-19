import {expect, test, type Page} from '@playwright/test';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import type {EmployeeState} from '../src/features/employees/types';
import type {CompanyDocumentsState} from '../src/features/company-documents/types';
import type {readCompanyState} from '../src/features/companies/company-state';

type StaffCase = {name: string; status: 'valid' | 'expired' | 'expiring_soon' | 'missing' | 'not_configured'; date?: string; inactive?: boolean; optional?: boolean};
const cases: StaffCase[] = [
  {name: 'A Expired later', status: 'expired'}, {name: 'Z Expired earlier', status: 'expired', date: '2026-09-01'},
  {name: 'A Missing', status: 'missing'}, {name: 'B Missing', status: 'missing'},
  {name: 'Z Soon later', status: 'expiring_soon'}, {name: 'A Soon earlier', status: 'expiring_soon', date: '2026-10-04'},
  {name: 'Complete', status: 'valid'}, {name: 'Not configured', status: 'not_configured'},
  {name: 'Inactive expired', status: 'expired', inactive: true}, {name: 'Optional expired', status: 'expired', optional: true}
];
const sizes = [[1920, 1080], [1448, 900], [1280, 800], [1024, 768], [768, 900], [375, 812], [320, 720]];

/** Metadata-only test scenarios; never introduces application fixtures, uploads, events or deliveries. */
async function configureStaff(page: Page, cases: StaffCase[]) {
  await page.evaluate((cases) => {
    const owner = Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState; listeners: Set<() => void>};
    const company = Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState};
    const sample = company.state.byCompany['demo-company'].documents.find((record) => !record.previousDocumentId && !record.supersededById)!;
    const state = structuredClone(owner.state), owned = state.byCompany['demo-company'], employee = owned.employees[0];
    owned.employees = cases.map((item, index) => ({...employee, id: `employee:overview-${index}`, firstName: item.name, lastName: 'Person', email: `overview-${index}@example.test`, employmentStatus: item.inactive ? 'inactive' : 'active'}));
    owned.activity = [];
    owned.documentWorkspaces = Object.fromEntries(cases.map((item, index) => {
      const employeeId = owned.employees[index].id, id = `overview-document-${index}`, requirementId = `overview-requirement-${index}`;
      const name = {ro: `Document personal ${index}`, en: `Personnel proof ${index}`};
      return [employeeId, {requirements: item.status === 'not_configured' ? [] : [{id: requirementId, companyId: 'demo-company', employeeId, sourceTemplateIds: [], name, documentType: 'custom', issuer: null, required: !item.optional, expiryWarningDays: 30, currentDocumentId: item.status === 'missing' ? null : id}],
        documents: item.status === 'missing' || item.status === 'not_configured' ? [] : [{...sample, id, employeeId, requirementId, documentName: name, version: 1, versionGroupId: id, previousDocumentId: undefined, supersededById: undefined, manuallyExpiredAt: undefined,
          reviewApplicability: 'not_required', reviewOutcome: 'not_required', reviewedAt: null, reviewedBy: null, rejectionReason: null, expiresAt: item.date ?? (item.status === 'expired' ? '2026-10-01' : item.status === 'expiring_soon' ? '2026-10-18' : '2099-01-01')}]}];
    }));
    owner.state = state; owner.listeners.forEach((notify) => notify());
  }, cases);
}
async function renameCompany(page: Page, name: string) {
  await page.evaluate((name) => {
    const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
    owner.state = {...owner.state, companies: owner.state.companies.map((record) => record.company.id === 'demo-company' ? {...record, company: {...record.company, name}} : record)};
    owner.listeners.forEach((notify) => notify());
  }, name);
}

for (const english of [false, true]) {
  const c = english ? en : ro, prefix = english ? '/en' : '', lang = english ? 'en' : 'ro';
  test(`${lang} employee chart reuses Vendor presentation, active tracking and urgency-only native navigation`, async ({page}) => {
    await page.goto(prefix + '/dashboard'); await configureStaff(page, cases);
    const panel = page.locator('[data-dashboard-panel="employees"]'), summary = page.getByRole('region', {name: c.Dashboard.overview.summary});
    await expect(summary.locator('strong')).toHaveText(['24', '5', '10']);
    const chart = panel.getByRole('img'); await expect(chart).toHaveAccessibleName(`${c.EmployeeDocuments.trackingLabel}: 9 ${c.Dashboard.overview.activeEmployees}`);
    await expect(panel.locator('[data-chart-segment] strong')).toHaveText(['2', '6', '1']);
    const rows = panel.locator('[data-dashboard-employee]'); await expect(rows).toHaveCount(5);
    expect(await rows.evaluateAll((items) => items.map((item) => item.getAttribute('data-dashboard-employee')))).toEqual(['employee:overview-1', 'employee:overview-0', 'employee:overview-2', 'employee:overview-3', 'employee:overview-5']);
    await expect(panel).not.toContainText('Inactive expired'); await expect(panel).not.toContainText('Optional expired'); await expect(panel).not.toContainText('Not configured Person');
    await expect(rows.first()).toContainText(english ? '1 expired document' : '1 document expirat');
    await expect(rows.last()).toContainText(english ? '1 document expiring soon' : '1 document expiră curând');
    const vendor = page.locator('[data-dashboard-panel="vendors"] [role="img"]');
    expect(await chart.evaluate((element) => element.className)).toBe(await vendor.evaluate((element) => element.className));
    expect((await chart.boundingBox())?.width).toBe((await vendor.boundingBox())?.width);
    await expect(vendor).toHaveAccessibleName(`${c.Dashboard.supplierStatusTitle}: 24 ${c.Dashboard.suppliersLower}`);
    for (const [width, height] of sizes) {
      await page.setViewportSize({width, height}); await page.evaluate(async () => {await document.fonts.ready; window.scrollTo(0, 0);});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const image of [chart, vendor]) expect(await image.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({path: `artifacts/visual/e1c-007a1/dashboard-attention-${lang}-${width}.png`, fullPage: true});
    }
    await rows.first().getByRole('link').focus(); await expect(rows.first().getByRole('link')).toHaveCSS('outline-style', 'solid'); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(prefix + '/company/employees/employee%3Aoverview-1'); await expect(page.getByRole('heading', {name: 'Z Expired earlier Person', exact: true})).toBeVisible();
  });

  test(`${lang} all Not Configured, complete, no active employees and no employees retain truthful empty previews`, async ({page}) => {
    await page.goto(prefix + '/dashboard'); const panel = page.locator('[data-dashboard-panel="employees"]');
    await expect(panel.locator('[data-chart-segment] strong')).toHaveText(['0', '0', '7']);
    await expect(panel.getByText(c.Dashboard.overview.noEmployeeAttention)).toBeVisible(); await expect(panel.locator('[data-dashboard-employee]')).toHaveCount(0);
    await page.screenshot({path: `artifacts/visual/e1c-007a1/dashboard-not-configured-${lang}.png`, fullPage: true});
    for (const [scenario, total, counts] of [[[{name: 'Complete', status: 'valid'}], '1', ['1', '0', '0']], [[{name: 'Inactive', status: 'expired', inactive: true}], '1', ['0', '0', '0']], [[], '0', ['0', '0', '0']]] as const) {
      await configureStaff(page, [...scenario]); await expect(page.getByRole('region', {name: c.Dashboard.overview.summary}).locator('strong').last()).toHaveText(total);
      await expect(panel.locator('[data-chart-segment] strong')).toHaveText([...counts]); await expect(panel.getByText(c.Dashboard.overview.noEmployeeAttention)).toBeVisible(); await expect(panel.locator('[data-dashboard-employee]')).toHaveCount(0);
      if (counts.every((count) => count === '0')) await expect(panel.getByRole('img')).toHaveAttribute('data-empty');
      await page.screenshot({path: `artifacts/visual/e1c-007a1/empty-preview-${lang}-${total}-${counts.join('-')}.png`, fullPage: true});
    }
    await panel.getByRole('link', {name: c.Dashboard.overview.viewAllPeople, exact: true}).click(); await expect(page).toHaveURL(prefix + '/company/employees');
  });

  test(`${lang} restricted personnel tracking never appears in chart, attention, DOM or tooltips`, async ({page}) => {
    await page.goto(prefix + '/dashboard'); await configureStaff(page, cases);
    for (const role of ['reviewer', 'viewer'] as const) {
      await page.evaluate((role) => {const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>}; owner.state = {...owner.state, companies: owner.state.companies.map((record) => record.company.id === 'demo-company' ? {...record, members: record.members.map((member) => member.isCurrentUser ? {...member, role} : member)} : record)}; owner.listeners.forEach((notify) => notify());}, role);
      const panel = page.locator('[data-dashboard-panel="employees"]'); await expect(panel.getByText(c.EmployeeDocuments.restricted, {exact: true})).toBeVisible();
      await expect(panel.getByRole('img')).toHaveCount(0); await expect(panel.locator('[data-chart-segment], [data-dashboard-employee]')).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText(/Personnel proof|Document personal|Z Expired earlier/);
      await expect(page.getByRole('region', {name: c.Dashboard.overview.summary}).locator('strong').last()).toHaveText('10');
    }
  });

  test(`${lang} Company Documents identity follows rename, locale-safe navigation, missing names and workspace switches`, async ({page}) => {
    test.setTimeout(90_000); await page.goto(prefix + '/dashboard');
    const navigation = page.getByRole('navigation', {name: c.AppShell.navigationLabel}), group = navigation.getByRole('button', {name: c.AppShell.navigation.company, exact: true});
    if (await group.getAttribute('aria-expanded') !== 'true') await group.click();
    const link = navigation.getByRole('link', {name: c.CompanyDocuments.title, exact: true}), companyPanel = page.locator('[data-dashboard-panel="company-documents"]');
    await expect(companyPanel.getByText('Demo Company SRL', {exact: true})).toBeVisible(); await expect(link).toHaveAccessibleDescription('Demo Company SRL');
    const longName = 'Compania de servicii administrative și operaționale internaționale cu o denumire foarte lungă SRL';
    await renameCompany(page, longName); await expect(companyPanel.getByText(longName, {exact: true})).toBeVisible(); await expect(link).toHaveAccessibleDescription(longName);
    await page.screenshot({path: `artifacts/visual/e1c-007a1/dashboard-company-identity-${lang}.png`, fullPage: true});
    await page.keyboard.press('Tab'); await link.focus(); await expect(link).toHaveCSS('outline-style', 'solid'); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(prefix + '/company/documents');
    const heading = page.getByRole('heading', {level: 1, name: c.CompanyDocuments.title, exact: true});
    await expect(heading.locator('..').getByText(longName, {exact: true})).toBeVisible(); await expect(heading.locator('..').getByText(c.CompanyDocuments.description, {exact: true})).toBeVisible();
    await expect(page.getByRole('region', {name: c.CompanyDocuments.summaryLabel}).locator('strong')).toHaveText(['5', '4', '0']);
    await expect(page.getByRole('button', {name: c.CompanyDocuments.addDocuments, exact: true})).toBeEnabled(); await expect(page.getByRole('button', {name: c.CompanyDocuments.shareDocuments, exact: true})).toBeEnabled();
    const secondary = link.locator('small'); await expect(secondary).toHaveAttribute('title', longName); await expect(secondary).toHaveCSS('text-overflow', 'ellipsis');
    const contrast = await secondary.evaluate((element) => {
      const luminance = (color: string) => {const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => value / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];};
      return (luminance(getComputedStyle(element).color) + .05) / (luminance(getComputedStyle(element.closest('a')!).backgroundColor) + .05);
    }); expect(contrast).toBeGreaterThanOrEqual(4.5);
    for (const [width, height] of sizes) {
      await page.setViewportSize({width, height}); await link.scrollIntoViewIfNeeded(); await link.focus();
      expect(await secondary.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const geometry = await link.evaluate((element) => {const link = element.getBoundingClientRect(), nav = element.parentElement!.getBoundingClientRect(); return {width: link.width, available: nav.width, height: link.height, textHeight: element.querySelector('span')!.getBoundingClientRect().height};});
      expect(geometry.width).toBeLessThanOrEqual(geometry.available + 1); expect(geometry.textHeight).toBeLessThanOrEqual(geometry.height);
      await page.screenshot({path: `artifacts/visual/e1c-007a1/company-identity-${lang}-${width}.png`, fullPage: true});
    }
    await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).filter({visible: true}).click();
    await expect(page.getByRole('heading', {level: 1, name: (english ? ro : en).CompanyDocuments.title, exact: true}).locator('..').getByText(longName, {exact: true})).toBeVisible();
    await page.getByRole('link', {name: english ? 'EN' : 'RO', exact: true}).filter({visible: true}).click(); await expect(heading).toBeVisible();
    await renameCompany(page, ''); await expect(secondary).toHaveCount(0); await expect(heading.locator('..').locator('span')).toHaveCount(0);
    await navigation.getByRole('link', {name: 'Dashboard', exact: true}).click(); await expect(companyPanel.getByRole('heading', {level: 2, name: c.CompanyDocuments.title, exact: true}).locator('..').locator('small')).toHaveCount(0);
    await link.click();
    await renameCompany(page, longName);
    await page.getByRole('button', {name: longName, exact: true}).click(); await page.getByRole('dialog', {name: c.Companies.switchTitle}).locator('[data-company-switch-id="global-clean-services"]').click();
    await expect(page).toHaveURL(prefix + '/dashboard'); await expect(companyPanel.getByText('Global Clean Services', {exact: true})).toBeVisible(); await expect(link).toHaveAccessibleDescription('Global Clean Services');
    await expect(page.locator('main')).not.toContainText(longName);
    // This workspace membership is Reviewer: even an empty private population is not inferred.
    await expect(page.locator('[data-dashboard-panel="employees"]')).toContainText(c.EmployeeDocuments.restricted); await expect(page.locator('[data-dashboard-panel="employees"] [data-chart-segment]')).toHaveCount(0);
    await link.click(); await expect(heading.locator('..').getByText('Global Clean Services', {exact: true})).toBeVisible(); await expect(page.getByRole('table')).toHaveCount(0);
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
    await page.getByRole('button', {name: 'Global Clean Services', exact: true}).click(); await page.getByRole('dialog', {name: c.Companies.switchTitle}).locator('[data-company-switch-id="demo-company"]').click();
    await expect(page).toHaveURL(prefix + '/dashboard'); await expect(companyPanel.getByText(longName, {exact: true})).toBeVisible(); await expect(link).toHaveAccessibleDescription(longName);
    await expect(page.locator('[data-dashboard-panel="employees"] [data-chart-segment] strong')).toHaveText(['0', '0', '7']); await expect(page.getByRole('region', {name: c.Dashboard.overview.summary}).locator('strong')).toHaveText(['24', '5', '8']);
  });
}
