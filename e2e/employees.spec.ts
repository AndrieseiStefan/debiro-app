import {expect, test, type Locator, type Page} from '@playwright/test';
import {createWorkspaceCompany, switchWorkspaceCompany} from './support/company-workspace';
import {openFilters} from './support/filters';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};

async function fields(dialog: Locator, email = 'ana.employee@example.test') {
  for (const [key, value] of Object.entries({firstName: 'Ana', lastName: 'Marinescu', email, phone: '+44 (0)20 1234 ext 9', jobTitle: 'Tehnician mentenanță', hireDate: '28.02.2026'})) await dialog.locator(`#employee-${key}`).fill(value);
}
async function employeeNavigation(page: Page, english = false) {
  const prefix = english ? '/en' : '';
  const nav = page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'});
  const company = nav.getByRole('button', {name: english ? 'Company' : 'Companie', exact: true});
  if (await company.getAttribute('aria-expanded') !== 'true') await company.click();
  await nav.locator(`a[href="${prefix}/company/employees"]`).click();
  await expect(page).toHaveURL(prefix + '/company/employees');
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '', copy = english ? en : ro, t = copy.Employees;
  test(`${english ? 'EN' : 'RO'} employee direct details and invalid ID are truthful and locale-aware`, async ({page}) => {
    await page.goto(prefix + '/company/employees/employee%3Aandrei-popescu');
    await expect(page.getByRole('heading', {level: 1})).toHaveText(copy.EmployeeDocuments.title);
    await expect(page.getByRole('navigation', {name: t.breadcrumbLabel})).toHaveText(`${copy.AppShell.navigation.company}${t.title}Andrei Popescu`);
    await page.getByRole('navigation', {name: t.breadcrumbLabel}).getByRole('link', {name: t.title}).click(); await expect(page).toHaveURL(prefix + '/company/employees');
    await page.goto(prefix + '/company/employees/not-owned'); await expect(page.locator('main').getByRole('alert')).toContainText(t.employeeUnavailable);
    await expect(page.locator('main')).not.toContainText('andrei.popescu@demo.ro'); await page.getByRole('link', {name: t.back}).click(); await expect(page.getByRole('table')).toBeVisible();
  });
  test(`${english ? 'EN' : 'RO'} employees create/free title/inline department/duplicate validation/edit/status and details survive client navigation`, async ({page}) => {
    await page.goto(prefix + '/company/employees');
    await expect(page.getByRole('navigation', {name: t.breadcrumbLabel})).toHaveText(`${copy.AppShell.navigation.company}${t.title}`);
    const metrics = page.getByRole('region', {name: t.summaryLabel}); await expect(metrics.locator('strong')).toHaveText(['8', '0', '0']);
    await page.getByRole('button', {name: t.add, exact: true}).click(); let dialog = page.getByRole('dialog', {name: t.add});
    await fields(dialog, 'bad-email');
    const department = dialog.locator('#employee-department'); await department.fill('Producție'); await department.press('ArrowDown'); await department.press('ArrowDown'); await department.press('Enter');
    await expect(dialog.getByText(t.departmentPending)).toBeVisible(); await dialog.getByRole('button', {name: t.add, exact: true}).click();
    await expect(dialog.getByText(t.errors.email)).toBeVisible(); await expect(dialog.locator('#employee-firstName')).toHaveValue('Ana');
    await dialog.locator('#employee-email').fill('ana.employee@example.test'); await dialog.getByRole('button', {name: t.add, exact: true}).dblclick(); await expect(page.getByRole('dialog')).toHaveCount(0);
    let row = page.getByRole('row', {name: /Ana Marinescu/}); await expect(row).toContainText('Producție'); await expect(row).toContainText(t.notConfigured); await expect(metrics.locator('strong')).toHaveText(['9', '0', '0']);
    await page.getByRole('button', {name: t.add, exact: true}).click(); dialog = page.getByRole('dialog'); await fields(dialog, 'ANA.EMPLOYEE@EXAMPLE.TEST');
    await dialog.getByRole('button', {name: t.add, exact: true}).click(); await expect(dialog.getByText(t.errors.duplicateEmail)).toBeVisible();
    await dialog.getByRole('button', {name: copy.DocumentManagement.cancel, exact: true}).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
    await row.getByRole('button', {name: t.employeeActions.replace('{name}', 'Ana Marinescu')}).click(); await page.getByRole('menuitem', {name: t.edit}).click(); dialog = page.getByRole('dialog', {name: t.edit});
    await expect(dialog.locator('#employee-department')).toHaveValue('Producție'); await expect(dialog.locator('#employee-hireDate')).toHaveValue('28.02.2026');
    await page.screenshot({path: `artifacts/visual/e1c-005/employee-edit-${english ? 'en' : 'ro'}.png`});
    await dialog.locator('#employee-jobTitle').fill('cont'); await dialog.locator('#employee-jobTitle').press('ArrowDown'); await dialog.locator('#employee-jobTitle').press('Enter'); await expect(dialog.locator('#employee-jobTitle')).toHaveValue('Contabil');
    await dialog.locator('#employee-department').fill('finan'); await dialog.locator('#employee-department').press('ArrowDown'); await dialog.locator('#employee-department').press('ArrowDown'); await dialog.locator('#employee-department').press('Enter');
    await dialog.locator('#employee-status').selectOption('inactive'); await dialog.getByRole('button', {name: t.save}).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
    row = page.getByRole('row', {name: /Ana Marinescu/}); await expect(row).toContainText('Financiar'); await expect(row).toContainText('Contabil'); await expect(row).toContainText(t.inactive);
    await row.getByRole('button', {name: t.employeeActions.replace('{name}', 'Ana Marinescu')}).click(); await page.getByRole('menuitem', {name: t.markActive}).click(); await expect(row).toHaveAttribute('data-lifecycle', 'active');
    await row.getByRole('link', {name: 'Ana Marinescu'}).click(); await expect(page).toHaveURL(new RegExp(`${prefix}/company/employees/employee%3A`));
    await expect(page.getByRole('heading', {level: 1})).toHaveText(copy.EmployeeDocuments.title); await expect(page.getByText(copy.EmployeeDocuments.empty)).toBeVisible();
    await page.getByRole('navigation', {name: t.breadcrumbLabel}).getByRole('link', {name: t.title}).click();
    await page.getByRole('searchbox', {name: t.search}).fill('  PRODUCTIE '); await expect(page.getByText(t.noMatches)).toBeVisible();
    await page.getByRole('button', {name: t.resetFilters}).click(); await expect(page.getByRole('row', {name: /Ana Marinescu/})).toBeVisible();
    await page.getByRole('navigation', {name: copy.AppShell.navigationLabel}).getByRole('link', {name: english ? 'Suppliers' : 'Furnizori', exact: true}).click();
    await employeeNavigation(page, english); await expect(page.getByRole('row', {name: /Ana Marinescu/})).toBeVisible();
  });

  test(`${english ? 'EN' : 'RO'} employee filters/sort/row navigation/keyboard close retain established semantics`, async ({page}) => {
    await page.goto(prefix + '/company/employees');
    await page.getByRole('searchbox', {name: t.search}).fill(' operational '); await openFilters(page); await page.locator('#employee-status-filter').selectOption('inactive'); await expect(page.locator('tbody tr')).toHaveCount(1); await expect(page.locator('tbody')).toContainText('Marius Radu');
    await page.locator('#employee-department-filter').selectOption('employee-department:finance'); await expect(page.getByText(t.noMatches)).toBeVisible(); await page.getByRole('dialog').getByRole('button', {name: copy.DataFilters.reset, exact: true}).click(); await page.keyboard.press('Escape'); await page.getByRole('searchbox', {name: t.search}).fill('');
    await page.getByRole('columnheader', {name: t.table.name}).getByRole('button').click(); await expect(page.locator('tbody tr').first()).toContainText('Vlad Ionescu');
    await expect(page.getByRole('checkbox')).toHaveCount(0); await expect(page.getByRole('button', {name: t.download})).toHaveCount(0); await expect(page.getByRole('button', {name: t.reminders})).toHaveCount(0);
    const add = page.getByRole('button', {name: t.add, exact: true}); await add.focus(); await add.press('Enter'); const dialog = page.getByRole('dialog');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden'); const job = dialog.locator('#employee-jobTitle'); await job.fill('cont'); await expect(page.getByRole('listbox')).toBeVisible();
    await job.press('Escape'); await expect(page.getByRole('listbox')).toHaveCount(0); await expect(dialog).toBeVisible(); await job.press('Escape'); await expect(dialog).toHaveCount(0); await expect(add).toBeFocused();
    await add.click(); await page.getByRole('dialog').getByRole('button', {name: copy.DocumentManagement.close, exact: true}).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
    await add.click(); await page.locator('#employee-jobTitle').fill('A completely new job'); await page.locator('#employee-jobTitle').press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await add.click(); await page.mouse.click(10, 10); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(add).toBeFocused();
  });

  test(`${english ? 'EN' : 'RO'} directory rows and native keyboard links navigate without reload while menu actions never navigate`, async ({page}) => {
    await page.goto(prefix + '/company/employees'); const origin = await page.evaluate(() => performance.timeOrigin);
    await expect(page.getByRole('checkbox')).toHaveCount(0); await expect(page.getByRole('columnheader')).toHaveCount(7);
    await expect(page.getByRole('button', {name: t.viewEmployee.replace('{name}', 'Andrei Popescu')})).toHaveCount(0);
    let row = page.getByRole('row', {name: /Andrei Popescu/}); await row.locator('td').nth(1).click(); await expect(page).toHaveURL(prefix + '/company/employees/employee%3Aandrei-popescu'); expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
    await page.goBack(); await expect(page).toHaveURL(prefix + '/company/employees'); row = page.getByRole('row', {name: /Andrei Popescu/});
    const name = row.getByRole('link', {name: 'Andrei Popescu', exact: true}); await name.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(name).toBeFocused(); await expect(name).toHaveCSS('outline-style', 'solid'); await page.keyboard.press('Enter'); await expect(page).toHaveURL(prefix + '/company/employees/employee%3Aandrei-popescu'); expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
    await page.goBack(); row = page.getByRole('row', {name: /Andrei Popescu/}); await row.getByRole('button', {name: t.employeeActions.replace('{name}', 'Andrei Popescu')}).click(); await expect(page).toHaveURL(prefix + '/company/employees');
    await page.getByRole('menuitem', {name: t.markInactive}).click(); await expect(row).toHaveAttribute('data-lifecycle', 'inactive'); await expect(page).toHaveURL(prefix + '/company/employees');
    await row.getByRole('button', {name: t.employeeActions.replace('{name}', 'Andrei Popescu')}).click(); await page.getByRole('menuitem', {name: t.edit}).click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page).toHaveURL(prefix + '/company/employees'); await page.keyboard.press('Escape');
    const search = page.getByRole('searchbox', {name: t.search});
    for (const needle of ['andrei.popescu@demo.ro', 'director general', 'management']) {await search.fill(needle); await expect(page.getByRole('row', {name: /Andrei Popescu/})).toBeVisible();}
    await search.fill(''); const filter = await openFilters(page); await filter.getByRole('combobox', {name: copy.EmployeeDocuments.trackingLabel}).selectOption('not_configured'); await expect(page.locator('tbody tr')).toHaveCount(8); await expect(page.getByRole('button', {name: `${copy.DataFilters.trigger} (1)`})).toBeVisible();
  });
}

test('employee isolation, empty company, no department, pagination and company-switch draft clearing', async ({page}) => {
  await createWorkspaceCompany(page, 'Employee Workspace'); await employeeNavigation(page); await expect(page.getByText(ro.Employees.empty)).toBeVisible();
  await page.screenshot({path: 'artifacts/visual/e1c-005/employees-empty.png', fullPage: true});
  for (let index = 0; index < 11; index++) {
    await page.getByRole('button', {name: ro.Employees.add, exact: true}).first().click(); const dialog = page.getByRole('dialog'); await fields(dialog, `employee${index}@example.test`); await dialog.locator('#employee-firstName').fill(`Person ${String(index).padStart(2, '0')}`);
    await dialog.getByRole('button', {name: ro.Employees.add, exact: true}).click(); await expect(dialog).toHaveCount(0);
  }
  await page.getByRole('button', {name: 'Pagina 1', exact: true}).click(); await expect(page.locator('tbody tr')).toHaveCount(10);
  await expect(page.getByRole('checkbox')).toHaveCount(0); await page.getByRole('button', {name: 'Pagina următoare'}).click(); await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('combobox', {name: ro.Employees.pageSize}).selectOption('20'); await expect(page.locator('tbody tr')).toHaveCount(11);
  const employeeHref = await page.locator('tbody a').first().getAttribute('href');
  await switchWorkspaceCompany(page, 'Employee Workspace', 'Global Clean Services'); await employeeNavigation(page); await expect(page.getByText(ro.Employees.empty)).toBeVisible(); await expect(page.getByRole('button', {name: ro.Employees.add, exact: true})).toHaveCount(0);
  await switchWorkspaceCompany(page, 'Global Clean Services', 'Employee Workspace'); await employeeNavigation(page); await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.locator(`a[href="${employeeHref}"]`).click(); await switchWorkspaceCompany(page, 'Employee Workspace', 'Demo Company SRL'); await expect(page).toHaveURL('/dashboard');
  await employeeNavigation(page); await expect(page.locator('tbody')).not.toContainText('Person 00');
  await page.getByRole('button', {name: ro.Employees.add, exact: true}).click(); await page.getByRole('dialog').locator('#employee-firstName').fill('Discard me');
  // The existing modal intentionally prevents interaction with the inert shell; external switches must still clear it.
  await page.evaluate(() => {
    const session = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: {activeCompanyId: string}; listeners: Set<() => void>};
    session.state = {...session.state, activeCompanyId: 'global-clean-services'}; session.listeners.forEach((notify) => notify());
  });
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('main')).not.toContainText('Discard me');
});

for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [1024, 768], [768, 900], [375, 812], [320, 720]]) {
  test(`employee visual containment and drawer at ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width, height}); await page.goto('/company/employees');
    await expect(page.getByRole('table')).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `artifacts/visual/e1c-005/employees-ro-${width}.png`, fullPage: true});
    const geometry = async () => page.evaluate(() => {
      const strong = document.querySelector('main section strong')!, card = strong.closest('[data-status]')!, table = document.querySelector('main table')!, th = table.querySelector('th')!, td = table.querySelector('td')!;
      const style = (element: Element) => {const value = getComputedStyle(element); return {size: value.fontSize, weight: value.fontWeight, color: value.color, padding: value.padding, border: value.borderBottom};};
      return {cardHeight: card.getBoundingClientRect().height, cardPadding: getComputedStyle(card).padding, label: style(strong.previousElementSibling!), value: style(strong), th: style(th), td: {...style(td), padding: getComputedStyle(td).padding}, rowHeight: table.querySelector('tbody tr')!.getBoundingClientRect().height};
    });
    const employeeGeometry = await geometry(); await expect(page.getByRole('checkbox')).toHaveCount(0);
    expect(await page.getByRole('region', {name: ro.Employees.summaryLabel}).evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(width > 1199 ? 3 : 2);
    if (width >= 1448) expect(await page.getByRole('region', {name: ro.Employees.tableRegion}).evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.getByRole('table').evaluate((table) => table.querySelector('thead')!.getBoundingClientRect().top - table.closest('[role="region"]')!.parentElement!.getBoundingClientRect().top)).toBeLessThanOrEqual(2);
    await page.screenshot({path: `artifacts/visual/e1c-006a/employees-ro-${width}.png`, fullPage: true}); await page.goto('/vendors'); expect(await geometry()).toEqual(employeeGeometry); await page.screenshot({path: `artifacts/visual/e1c-006a/vendors-ro-${width}.png`, fullPage: true}); await page.goto('/company/employees');
    await page.getByRole('button', {name: ro.Employees.add, exact: true}).click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
    await expect(dialog.locator('#employee-firstName')).toHaveCSS('height', '42px');
    await page.screenshot({path: `artifacts/visual/e1c-005/employee-add-ro-${width}.png`, fullPage: true});
    await dialog.getByRole('button', {name: ro.Employees.add, exact: true}).click(); await expect(dialog.locator('[aria-invalid="true"]').first()).toBeFocused();
    await page.screenshot({path: `artifacts/visual/e1c-005/employee-errors-ro-${width}.png`, fullPage: true});
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await fields(dialog); const department = dialog.locator('#employee-department'); await department.fill('Producție nouă'); await department.press('ArrowDown');
    await expect(page.getByRole('listbox')).toBeVisible(); await page.screenshot({path: `artifacts/visual/e1c-005/employee-suggestions-ro-${width}.png`});
    await department.press('ArrowDown'); await department.press('Enter'); await expect(dialog.getByText(ro.Employees.departmentPending)).toBeVisible();
    const cancel = dialog.getByRole('button', {name: ro.DocumentManagement.cancel, exact: true}); await cancel.scrollIntoViewIfNeeded(); await expect(cancel).toBeInViewport(); await page.screenshot({path: `artifacts/visual/e1c-005/employee-actions-ro-${width}.png`}); await cancel.click(); await expect(dialog).toHaveCount(0);
    await page.getByRole('link', {name: 'EN', exact: true}).filter({visible: true}).click(); await expect(page.getByRole('heading', {level: 1})).toHaveText(en.Employees.title);
    await page.screenshot({path: `artifacts/visual/e1c-005/employees-en-${width}.png`, fullPage: true});
    await page.getByRole('button', {name: en.Employees.add, exact: true}).click(); await page.screenshot({path: `artifacts/visual/e1c-005/employee-add-en-${width}.png`});
    await page.getByRole('dialog').getByRole('button', {name: en.DocumentManagement.cancel, exact: true}).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('row', {name: /Andrei Popescu/}).getByRole('button', {name: 'Actions for Andrei Popescu'}).click(); await page.getByRole('menuitem', {name: en.Employees.edit}).click();
    const edit = page.getByRole('dialog'), save = edit.getByRole('button', {name: en.Employees.save}); await save.scrollIntoViewIfNeeded();
    expect(await save.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true); expect(await edit.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({path: `artifacts/visual/e1c-005/employee-edit-en-${width}.png`}); await edit.getByRole('button', {name: en.DocumentManagement.cancel, exact: true}).click(); await expect(edit).toHaveCount(0);
  });
}
