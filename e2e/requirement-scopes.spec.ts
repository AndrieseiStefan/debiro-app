import {expect, test, type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import type {readRequirementsState} from '../src/features/requirements/requirements-state';
import type {readCompanyState} from '../src/features/companies/company-state';
import {switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

async function createScoped(page: Page, scope: 'company' | 'employee', name: string, en = false) {
  await page.locator('#requirement-template-scope').selectOption(scope);
  await page.getByRole('button', {name: en ? 'New Template' : 'Șablon nou', exact: true}).click();
  await expect(page.locator('#requirement-template-category')).toHaveCount(0);
  await page.locator('#requirement-template-name').fill(name);
  await page.getByRole('button', {name: en ? 'Change icon and color' : 'Schimbă iconița și culoarea'}).click();
  await page.getByRole('dialog', {name: en ? 'Choose appearance' : 'Alege aspectul'}).getByRole('button', {name: 'Violet', exact: true}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: en ? 'Add document' : 'Adaugă document', exact: true}).click();
  const drawer = page.getByRole('dialog', {name: en ? 'Add document' : 'Adaugă document', exact: true});
  await drawer.getByRole('button', {name: en ? /^Tax certificate/ : /^Certificat fiscal/}).click();
  await drawer.getByRole('button', {name: en ? 'Add document' : 'Adaugă documentul', exact: true}).click();
  await expect(drawer).not.toBeVisible();
  await page.getByRole('button', {name: en ? 'Save template' : 'Salvează șablon', exact: true}).click();
  await expect(page.getByRole('heading', {name, exact: true})).toBeVisible();
  await expect(page.locator('[data-template-id][data-selected="true"] [data-color]')).toHaveAttribute('data-color', 'violet');
  return (await page.locator('[data-template-id][data-selected="true"]').getAttribute('data-template-id'))!;
}

for (const en of [false, true]) {
  test(`${en ? 'EN' : 'RO'} scoped creation, filtering, editing, preview, cancellation and vendor exclusion`, async ({page}) => {
    await page.goto(en ? '/en/requirements' : '/requirements');
    const vendorIds = await page.locator('[data-template-id]').evaluateAll((items) => items.map((item) => item.getAttribute('data-template-id')));
    expect(vendorIds).toHaveLength(6);
    await expect(page.locator('#requirement-template-scope option')).toHaveText(en ? ['Vendors', 'Company', 'Employees'] : ['Furnizori', 'Companie', 'Angajați']);
    await page.locator('#requirement-template-scope').selectOption('company');
    await expect(page.getByText(en ? 'No templates in this category yet.' : 'Nu există șabloane pentru această categorie.', {exact: true})).toBeVisible();
    await expect(page.locator('[data-starter-id]')).toHaveCount(0);
    const companyId = await createScoped(page, 'company', 'Scope Company', en);
    const employeeId = await createScoped(page, 'employee', 'Scope Employee', en);
    expect(companyId).not.toBe(employeeId);
    await expect(page.locator('[data-template-id]')).toHaveCount(1);
    await expect(page.locator(`[data-template-id="${companyId}"]`)).toHaveCount(0);
    await page.locator('#requirement-template-name').fill('Scope Employee Edited');
    await page.getByRole('button', {name: en ? 'Change icon and color' : 'Schimbă iconița și culoarea'}).click();
    await page.getByRole('dialog', {name: en ? 'Choose appearance' : 'Alege aspectul'}).getByRole('button', {name: en ? 'Green' : 'Verde', exact: true}).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name: en ? 'Save template' : 'Salvează șablon', exact: true}).click();
    await expect(page.locator('[data-template-id][data-selected="true"] [data-color]')).toHaveAttribute('data-color', 'green');
    await page.getByRole('tab', {name: en ? 'Preview' : 'Previzualizare', exact: true}).click();
    await expect(page.locator('[data-supplier-context]')).toHaveCount(0);
    await expect(page.locator('[data-supplier-requirements] [data-status]')).toHaveAttribute('data-status', 'missing');
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await page.locator('#requirement-template-scope').selectOption('company');
    await expect(page.locator('#requirement-template-name')).toHaveValue('Scope Company');
    await page.getByRole('button', {name: en ? 'New Template' : 'Șablon nou', exact: true}).click();
    await page.locator('#requirement-template-name').fill('Abandoned scoped draft');
    await page.locator('#requirement-template-scope').selectOption('employee');
    await page.getByRole('alertdialog').getByRole('button', {name: en ? 'Continue editing' : 'Continuă editarea'}).click();
    await expect(page.locator('#requirement-template-scope')).toHaveValue('company');
    await expect(page.locator('#requirement-template-name')).toHaveValue('Abandoned scoped draft');
    await page.locator('#requirement-template-scope').selectOption('employee');
    await page.getByRole('alertdialog').getByRole('button', {name: en ? 'Discard changes' : 'Renunță la modificări'}).click();
    await expect(page.locator('#requirement-template-name')).toHaveValue('Scope Employee Edited');
    await page.locator('#requirement-template-scope').selectOption('vendor');
    expect(await page.locator('[data-template-id]').evaluateAll((items) => items.map((item) => item.getAttribute('data-template-id')))).toEqual(vendorIds);
    await expect(page.locator('#requirement-template-category')).toHaveValue('construction');
    await page.getByRole('combobox', {name: en ? 'Search vendors, documents or templates' : 'Caută furnizori, documente sau șabloane', exact: true}).fill('Scope Company');
    await page.locator(`[data-search-result="requirement:${companyId}"]`).click();
    await expect(page.locator('#requirement-template-scope')).toHaveValue('company');
    await expect(page.locator('#requirement-template-name')).toHaveValue('Scope Company');
    await workspaceSection(page, 'vendors', en);
    await page.locator(`a[href="${en ? '/en' : ''}/vendors/construct-pro"]`).first().click();
    await page.getByRole('button', {name: en ? 'Set Documents from Template' : 'Setează documente din șablon', exact: true}).click();
    const drawer = page.getByRole('dialog', {name: en ? 'Set Documents from Template' : 'Setează documente din șablon', exact: true});
    await expect(drawer.getByText('Scope Company', {exact: true})).toHaveCount(0);
    await expect(drawer.getByText('Scope Employee Edited', {exact: true})).toHaveCount(0);
    await expect(drawer.getByRole('checkbox')).toHaveCount(6);
  });
}

test('scoped company state survives client/locale navigation and A/B company switching', async ({page}) => {
  await page.goto('/requirements');
  const a = await createScoped(page, 'company', 'Company A only');
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await page.getByRole('dialog', {name: 'Meniu profil'}).getByRole('link', {name: /Companiile mele/}).click();
  await page.locator('#create-company-form input').nth(0).fill('Scoped B');
  await page.locator('#create-company-form select').nth(0).selectOption('professional');
  await page.locator('#create-company-form input').nth(1).fill('RO-SCOPED-B');
  await page.locator('#create-company-form select').nth(1).selectOption('RO');
  await page.getByRole('button', {name: 'Creează compania', exact: true}).click();
  await workspaceSection(page, 'requirements');
  await page.locator('#requirement-template-scope').selectOption('company');
  await expect(page.locator('[data-template-id]')).toHaveCount(0);
  await createScoped(page, 'company', 'Company B only');
  await switchWorkspaceCompany(page, 'Scoped B', 'Demo Company SRL');
  await workspaceSection(page, 'requirements');
  await expect(page.locator('#requirement-template-scope')).toHaveValue('company');
  await expect(page.locator('#requirement-template-name')).toHaveValue('Company A only');
  await expect(page.locator(`[data-template-id="${a}"]`)).toBeVisible();
  await page.getByRole('link', {name: 'EN', exact: true}).filter({visible: true}).click();
  await expect(page).toHaveURL(/\/en\/requirements$/);
  await expect(page.locator('#requirement-template-scope')).toHaveValue('company');
  await expect(page.locator('#requirement-template-name')).toHaveValue('Company A only');
  await switchWorkspaceCompany(page, 'Demo Company SRL', 'Scoped B', true);
  await workspaceSection(page, 'requirements', true);
  await expect(page.locator('#requirement-template-name')).toHaveValue('Company B only');
  await expect(page.locator(`[data-template-id="${a}"]`)).toHaveCount(0);
});

test('legacy and malformed session entries are read safely without rewriting other data', async ({page}) => {
  await page.goto('/requirements');
  const ids = await page.locator('[data-template-id]').evaluateAll((items) => items.map((item) => item.getAttribute('data-template-id')));
  await page.evaluate(() => {
    const owner = Reflect.get(window, Symbol.for('debiro.requirements-session')) as {state: ReturnType<typeof readRequirementsState>; listeners: Set<() => void>};
    const workspace = owner.state.byCompany['demo-company'];
    workspace.templates.forEach((template) => Reflect.deleteProperty(template, 'scope'));
    Reflect.deleteProperty(workspace, 'selectedScope');
    owner.listeners.forEach((notify) => notify());
  });
  await expect(page.locator('#requirement-template-scope')).toHaveValue('vendor');
  expect(await page.locator('[data-template-id]').evaluateAll((items) => items.map((item) => item.getAttribute('data-template-id')))).toEqual(ids);
  await expect(page.locator('#requirement-template-category')).toHaveValue('construction');
  expect(await page.evaluate(() => {
    const owner = Reflect.get(window, Symbol.for('debiro.requirements-session')) as {state: ReturnType<typeof readRequirementsState>};
    return owner.state.byCompany['demo-company'].templates.every((template) => template.scope === undefined);
  })).toBe(true);
  await page.evaluate(() => {
    const owner = Reflect.get(window, Symbol.for('debiro.requirements-session')) as {state: ReturnType<typeof readRequirementsState>; listeners: Set<() => void>};
    owner.state = {...owner.state, byCompany: {...owner.state.byCompany, 'demo-company': {...owner.state.byCompany['demo-company'], templates: [null, {scope: 'invalid', id: 'broken'}] as unknown as ReturnType<typeof readRequirementsState>['byCompany'][string]['templates']}}};
    owner.listeners.forEach((notify) => notify());
  });
  // Notify with a new snapshot, as real session mutations do.
  await expect(page.locator('[data-template-id]')).toHaveCount(0);
  await expect(page.getByText('Nu există șabloane pentru această categorie.', {exact: true})).toBeVisible();
});

test('read-only roles cannot create or edit through new scopes', async ({page}) => {
  await page.goto('/requirements'); await createScoped(page, 'company', 'Read-only Company');
  for (const role of ['viewer', 'reviewer'] as const) {
    await page.evaluate((role) => {
      const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
      owner.state = {...owner.state, companies: owner.state.companies.map((company) => company.company.id === owner.state.activeCompanyId ? {...company, members: company.members.map((member) => member.isCurrentUser ? {...member, role} : member)} : company)};
      owner.listeners.forEach((notify) => notify());
    }, role);
    await page.locator('#requirement-template-scope').selectOption('company');
    await expect(page.locator('[data-requirement-readonly]')).toBeVisible();
    await expect(page.locator('#requirement-template-name')).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Șablon nou', exact: true})).toBeDisabled();
    await expect(page.getByRole('button', {name: /Adaugă șablon nou/})).toBeDisabled();
    await page.locator('#requirement-template-scope').selectOption('employee');
    await expect(page.getByRole('button', {name: 'Șablon nou', exact: true})).toBeDisabled();
  }
});

test('scoped editor reuses contained responsive controls in RO/EN', async ({page}) => {
  test.setTimeout(90_000);
  await mkdir('artifacts/visual/e1c-001', {recursive: true});
  await page.goto('/requirements'); await createScoped(page, 'employee', 'Responsive employee template');
  for (const language of ['ro', 'en']) {
    if (language === 'en') {
      await page.getByRole('link', {name: 'EN', exact: true}).filter({visible: true}).click();
      await expect(page).toHaveURL(/\/en\/requirements$/);
      await expect(page.getByRole('combobox', {name: 'Template destination', exact: true})).toBeVisible();
    }
    for (const width of [1448, 1024, 768, 375, 320]) {
      await page.setViewportSize({width, height: 900});
      await expect(page.locator('#requirement-template-category')).toHaveCount(0);
      await expect(page.locator('#requirement-template-scope')).toHaveValue('employee');
      await expect(page.locator('#requirement-template-scope')).toBeVisible();
      const bounds = await page.locator('#requirement-template-scope').boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({path: `artifacts/visual/e1c-001/${language}-${width}.png`, fullPage: true});
    }
  }
});
