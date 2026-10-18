import {expect, test, type Locator, type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import {createDocumentFixtureFile} from '../src/features/documents/fixture-files';
import type {EmployeeState} from '../src/features/employees/types';
import type {readCompanyState} from '../src/features/companies/company-state';
import {switchWorkspaceCompany} from './support/company-workspace';
import {openFilters} from './support/filters';

// Full Chromium also verifies native PDF rendering; existing Company suites cover the plugin-less fallback.
test.use({channel: 'chromium'});

const employeeId = 'employee:andrei-popescu';
async function file(version = 1) {const value = createDocumentFixtureFile({id: 'employee-test', filename: 'employee-proof.pdf', version, createdAt: '2026-10-02T12:00:00Z'}); return {name: value.name, mimeType: value.type, buffer: Buffer.from(await value.arrayBuffer())};}
async function employeeList(page: Page, english = false) {
  const copy = english ? en : ro, nav = page.getByRole('navigation', {name: copy.AppShell.navigationLabel}), company = nav.getByRole('button', {name: copy.AppShell.navigation.company, exact: true});
  if (await company.getAttribute('aria-expanded') !== 'true') await company.click();
  await nav.getByRole('link', {name: copy.Employees.title, exact: true}).click(); await expect(page).toHaveURL(`${english ? '/en' : ''}/company/employees`);
}
async function employeeDetails(page: Page, english = false, name = 'Andrei Popescu') {await employeeList(page, english); await page.getByRole('link', {name, exact: true}).click(); await expect(page.getByRole('heading', {level: 1})).toHaveText((english ? en : ro).EmployeeDocuments.title);}
async function createTemplate(page: Page, english = false, scope: 'company' | 'employee' = 'employee') {
  const copy = english ? en : ro; await page.goto(`${english ? '/en' : ''}/requirements`); await page.locator('#requirement-template-scope').selectOption(scope);
  await page.getByRole('button', {name: copy.Requirements.newTemplate, exact: true}).click(); await page.locator('#requirement-template-name').fill(scope === 'employee' ? 'Dosar standard angajat' : 'Company only template');
  await page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document', exact: true}).click(); const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', {name: english ? /^Tax certificate/ : /^Certificat fiscal/}).click(); await dialog.getByRole('button', {name: english ? 'Add document' : 'Adaugă documentul', exact: true}).click(); await expect(dialog).toHaveCount(0);
  await page.getByRole('button', {name: copy.Requirements.saveTemplate, exact: true}).click(); await expect(page.locator('[data-template-id][data-selected="true"]')).toBeVisible();
  return (await page.locator('[data-template-id][data-selected="true"]').getAttribute('data-template-id'))!;
}
async function close(page: Page) {await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);}
async function add(page: Page, english = false, name = 'Document individual') {
  const copy = english ? en : ro; await page.getByRole('button', {name: copy.EmployeeDocuments.add, exact: true}).first().click(); const dialog = page.getByRole('dialog');
  await dialog.locator('#company-upload-name').fill(name); await dialog.locator('#company-upload-type').selectOption('custom'); await dialog.locator('input[type=file]').setInputFiles(await file());
  await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0); return page.getByRole('row', {name: new RegExp(name)});
}
async function details(page: Page, row: Locator, name: string) {await row.getByRole('button', {name, exact: true}).click(); await expect(page.getByRole('dialog')).toBeVisible(); return page.getByRole('dialog');}
async function role(page: Page, role: 'administrator' | 'reviewer' | 'viewer') {
  await page.evaluate((role) => {const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>}; owner.state = {...owner.state, companies: owner.state.companies.map((company) => company.company.id === owner.state.activeCompanyId ? {...company, members: company.members.map((member) => member.isCurrentUser ? {...member, role} : member)} : company)}; owner.listeners.forEach((notify) => notify());}, role);
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '', copy = english ? en : ro;
  test(`${english ? 'EN' : 'RO'} reminder stays visible in empty, configured and uploaded document states at every toolbar breakpoint`, async ({page}) => {
    test.setTimeout(60_000);
    const templateId = await createTemplate(page, english); await employeeDetails(page, english);
    const panel = page.getByRole('tabpanel', {name: copy.EmployeeDocuments.documents, exact: true});
    const download = panel.getByRole('button', {name: copy.CompanyDocuments.downloadSelected, exact: true});
    const reminder = panel.getByRole('button', {name: copy.EmployeeDocuments.sendReminder, exact: true});
    const template = panel.getByRole('button', {name: copy.VendorTemplates.title, exact: true}).first();
    const snapshot = () => page.evaluate(() => JSON.stringify({employees: Reflect.get(window, Symbol.for('debiro.employees-session')).state, audit: Reflect.get(window, Symbol.for('debiro.local-audit-session')).events, read: [...Reflect.get(window, Symbol.for('debiro.notification-session')).readIds]}));
    async function verify(state: string) {
      const before = await snapshot();
      for (const width of [1448, 768, 375, 320]) {
        await page.setViewportSize({width, height: 900});
        await expect(reminder).toBeVisible(); await expect(reminder).toBeEnabled(); await expect(reminder).not.toHaveAttribute('aria-disabled');
        expect(await reminder.getAttribute('disabled')).toBeNull();
        expect(await download.evaluate((element) => element.nextElementSibling?.textContent)).toBe(copy.EmployeeDocuments.sendReminder);
        expect(await reminder.evaluate((element) => element.nextElementSibling?.textContent)).toBe(copy.VendorTemplates.title);
        await download.focus(); await page.keyboard.press('Tab'); await expect(reminder).toBeFocused(); await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog', {name: copy.EmployeeDocuments.sendReminder}); await expect(dialog).toBeVisible();
        await expect(dialog.locator('#employee-reminder-message')).toHaveValue('');
        const send = dialog.getByRole('button', {name: copy.EmployeeReminder.send, exact: true}); await expect(send).toHaveAttribute('aria-disabled', 'true'); await send.focus(); await expect(page.getByRole('tooltip')).toHaveText(copy.EmployeeReminder.sendUnavailable);
        expect(await snapshot()).toBe(before); await close(page); await expect(reminder).toBeFocused();
        await reminder.locator('..').evaluate((element) => element.scrollIntoView({block: 'center'}));
        const rects = [];
        for (const control of [download, reminder, template]) {
          await expect(control).toBeInViewport(); expect(await control.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
          const rect = await control.boundingBox(); expect(rect).not.toBeNull(); rects.push(rect!);
        }
        for (let index = 0; index < rects.length - 1; index++) {
          const first = rects[index], second = rects[index + 1];
          expect(first.x + first.width <= second.x + 1 || first.y + first.height <= second.y + 1).toBe(true);
        }
        if (width === 1448) expect(new Set(rects.map((rect) => Math.round(rect.y))).size).toBe(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({path: `artifacts/visual/e1c-006a1/${state}-${english ? 'en' : 'ro'}-${width}.png`});
      }
    }
    await expect(page.getByText(copy.EmployeeDocuments.empty)).toBeVisible(); await verify('empty');
    await page.setViewportSize({width: 1448, height: 900}); await template.click(); await page.locator('#company-template').selectOption(templateId);
    await page.getByRole('dialog').getByRole('button', {name: copy.CompanyDocumentManagement.applyTemplate, exact: true}).click(); await close(page);
    await expect(page.locator('tbody tr')).toHaveCount(1); await expect(download).toHaveAttribute('aria-disabled', 'true'); await verify('configured');
    await page.setViewportSize({width: 1448, height: 900}); await add(page, english, 'Reminder proof');
    await expect(page.locator('tbody tr')).toHaveCount(2); await expect(download).toHaveAttribute('aria-disabled', 'true'); await verify('uploaded');
    // A client-side list/details round trip must use the same current action contract as direct entry.
    await page.setViewportSize({width: 1448, height: 900}); await employeeList(page, english); await employeeDetails(page, english); await expect(reminder).toBeVisible();
  });

  test(`${english ? 'EN' : 'RO'} empty employee documents, scoped template preview, duplicate apply, source and required upload`, async ({page}) => {
    const templateId = await createTemplate(page, english); await employeeDetails(page, english);
    await expect(page.getByText(copy.EmployeeDocuments.empty)).toBeVisible(); await expect(page.getByRole('region', {name: copy.EmployeeDocuments.summaryLabel}).locator('strong')).toHaveText(['0', '0', '0', '0']);
    await page.getByRole('button', {name: copy.VendorTemplates.title, exact: true}).first().click(); const picker = page.getByRole('dialog');
    await expect(picker.locator('#company-template option')).toHaveCount(2); await picker.locator('#company-template').selectOption(templateId); await picker.locator('summary').click(); await expect(picker.locator('li')).toContainText([english ? 'Tax certificate' : 'Certificat fiscal']);
    await picker.getByRole('button', {name: copy.CompanyDocumentManagement.applyTemplate, exact: true}).click(); await picker.getByRole('button', {name: copy.CompanyDocumentManagement.applyTemplate, exact: true}).click(); await close(page);
    let row = page.locator('tbody tr'); await expect(row).toHaveCount(1); await expect(row).toHaveAttribute('data-template-accent', /blue|green|orange|violet|teal|rose|indigo|cyan/); await expect(row).toContainText('Dosar standard angajat');
    await expect(row.locator('[data-tone][data-status]')).toHaveText(copy.CompanyDocuments.status.missing); await expect(page.getByRole('region', {name: copy.EmployeeDocuments.summaryLabel}).locator('strong')).toHaveText(['1', '0', '0', '1']);
    await row.getByRole('button', {name: copy.CompanyDocuments.upload, exact: true}).click(); let dialog = page.getByRole('dialog'); await expect(dialog.locator('#company-upload-name')).toHaveAttribute('readonly'); await expect(dialog.locator('#company-upload-type')).toHaveAttribute('readonly'); await expect(dialog.locator('#company-template, input[type=checkbox]')).toHaveCount(0);
    await dialog.locator('input[type=file]').setInputFiles({name: 'blocked.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('blocked')}); await expect(dialog.getByRole('alert')).toBeVisible();
    await dialog.locator('input[type=file]').setInputFiles(await file()); await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
    row = page.locator('tbody tr'); await expect(row).toHaveCount(1); await expect(row.locator('[data-tone][data-status]')).toHaveText(copy.CompanyDocuments.status.needs_review);
    const name = await row.locator('td').nth(1).getByRole('button').innerText(); dialog = await details(page, row, name); await expect(dialog).toContainText('Dosar standard angajat'); await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.confirm, exact: true}).click(); await close(page);
    await expect(page.getByRole('region', {name: copy.EmployeeDocuments.summaryLabel}).locator('strong')).toHaveText(['1', '1', '0', '0']);
    await page.getByRole('button', {name: copy.EmployeeDocuments.sendReminder, exact: true}).click(); await expect(page.getByRole('dialog').locator('#employee-reminder-message')).toHaveValue(''); await expect(page.getByRole('dialog').locator('input[type=file]')).toHaveCount(0); await close(page);
    await employeeList(page, english); const employee = page.getByRole('row', {name: /Andrei Popescu/}); await expect(employee).toContainText(english ? '1/1 documents' : '1/1 documente'); await expect(employee).toContainText(copy.EmployeeDocuments.tracking.complete);
    await employee.getByRole('link', {name: 'Andrei Popescu'}).click(); await page.getByRole('tab', {name: copy.EmployeeDocuments.activity, exact: true}).click(); await expect(page.locator('[data-event-type="template_applied"]')).toHaveCount(1); await expect(page.locator('[data-event-type="document_upload"]')).toHaveCount(1);
    await expect(page.locator('main')).not.toContainText(copy.Employees.documentsDeferred); await page.screenshot({path: `artifacts/visual/e1c-006/activity-${english ? 'en' : 'ro'}.png`, fullPage: true});
    await expect(page).toHaveURL(new RegExp(`${prefix}/company/employees/employee%3Aandrei-popescu`));
  });

  test(`${english ? 'EN' : 'RO'} standalone review, exact downloads, replacement rejection/history, metadata and manual expiry`, async ({page}) => {
    await page.goto(prefix + '/company/employees/employee%3Aandrei-popescu'); const row = await add(page, english); await expect(row).toContainText(copy.VendorTemplates.manualSource);
    let dialog = await details(page, row, 'Document individual'); const download = page.waitForEvent('download'); await dialog.getByRole('button', {name: copy.DocumentManagement.download, exact: true}).click(); const saved = await download; expect(await readFile((await saved.path())!)).toEqual((await file()).buffer);
    await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.preview, exact: true}).click();
    if (!(await page.evaluate(() => navigator.pdfViewerEnabled))) await expect(dialog.getByText(copy.CompanyDocumentManagement.previewUnsupported, {exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: copy.DocumentManagement.backToDetails, exact: true}).click(); await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.confirm, exact: true}).click();
    await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.replaceTitle, exact: true}).click(); dialog = page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles(await file(2)); await dialog.locator('#company-upload-expires').fill('31.02.2026'); await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog.getByRole('alert')).toBeVisible(); await expect(dialog.locator('#company-upload-expires')).toHaveValue('31.02.2026');
    await dialog.locator('#company-upload-expires').fill('01.11.2026'); await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
    dialog = await details(page, row, 'Document individual'); await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.reject, exact: true}).click(); const rejection = dialog.getByRole('form', {name: copy.CompanyDocumentManagement.reject}); await rejection.getByRole('button').click(); await expect(dialog.getByRole('alert')).toContainText(copy.CompanyDocumentManagement.errors.rejectionReason);
    await rejection.getByRole('textbox').fill('Wrong version'); await rejection.getByRole('button').click(); await expect(dialog.getByText(copy.CompanyDocumentManagement.noCurrent, {exact: true})).toBeVisible(); await dialog.getByRole('button', {name: copy.DocumentManagement.viewAll, exact: true}).click(); await expect(dialog.locator('[data-version]')).toHaveCount(2); await expect(dialog).toContainText('Wrong version');
    const historyDownload = page.waitForEvent('download'); await dialog.locator('[data-version="1"]').getByRole('button', {name: copy.DocumentManagement.download, exact: true}).click(); expect(await readFile((await (await historyDownload).path())!)).toEqual((await file()).buffer); await close(page);
    await row.getByRole('button', {name: copy.CompanyDocuments.upload, exact: true}).click(); dialog = page.getByRole('dialog'); await dialog.locator('input[type=file]').setInputFiles(await file(3)); await dialog.locator('#company-upload-expires').fill('01.12.2026'); await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
    dialog = await details(page, row, 'Document individual'); await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.confirm, exact: true}).click(); await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.metadataTitle, exact: true}).click(); await dialog.locator('#company-metadata-issuer').fill('Internal administration'); await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.save, exact: true}).click(); await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.confirm, exact: true}).click();
    await dialog.getByRole('button', {name: copy.DocumentManagement.markExpired, exact: true}).click(); await page.getByRole('alertdialog').getByRole('button', {name: copy.DocumentManagement.markExpired, exact: true}).click(); await expect(dialog).toContainText(copy.CompanyDocuments.status.expired); await close(page);
    await expect(page.getByRole('region', {name: copy.EmployeeDocuments.summaryLabel}).locator('strong')).toHaveText(['1', '0', '0', '0']); // Standalone is optional.
    await page.getByRole('tab', {name: copy.EmployeeDocuments.activity, exact: true}).click(); await expect(page.locator('[data-event-type="document_replaced"]')).toHaveCount(1); await expect(page.locator('[data-event-type="document_marked_expired"]')).toHaveCount(1);
  });

  test(`${english ? 'EN' : 'RO'} document-only selection, exact bulk download and independent reminder composition stay inside the employee workspace`, async ({page}) => {
    test.setTimeout(60_000); const templateId = await createTemplate(page, english); await employeeDetails(page, english);
    const main = page.locator('main'), download = main.getByRole('button', {name: copy.CompanyDocuments.downloadSelected, exact: true}), reminder = main.getByRole('button', {name: copy.EmployeeDocuments.sendReminder, exact: true});
    await expect(download).toHaveAttribute('aria-disabled', 'true'); await expect(reminder).toBeEnabled(); expect(await download.evaluate((element) => element.nextElementSibling?.textContent)).toContain(copy.EmployeeDocuments.sendReminder);
    const state = () => page.evaluate(() => JSON.stringify({employees: Reflect.get(window, Symbol.for('debiro.employees-session')).state, audit: Reflect.get(window, Symbol.for('debiro.local-audit-session')).events, read: [...Reflect.get(window, Symbol.for('debiro.notification-session')).readIds]}));
    const before = await state(); await reminder.click(); await expect(page.getByRole('dialog').locator('#employee-reminder-message')).toHaveValue(''); expect(await state()).toBe(before); await close(page);
    await main.getByRole('button', {name: copy.VendorTemplates.title, exact: true}).first().click(); await page.locator('#company-template').selectOption(templateId); await page.getByRole('dialog').getByRole('button', {name: copy.CompanyDocumentManagement.applyTemplate, exact: true}).click(); await close(page);
    for (let index = 0; index < 11; index++) await add(page, english, `Proof ${String(index).padStart(2, '0')}`);
    await main.getByRole('button', {name: copy.DataPagination.pageNumber.replace('{page}', '1'), exact: true}).click(); await main.getByRole('checkbox', {name: copy.CompanyDocuments.selectPage, exact: true}).check(); await expect(main.getByRole('status').filter({hasText: /^(10 selected|10 selectate)$/})).toBeVisible();
    await main.getByRole('button', {name: copy.DataPagination.nextPage, exact: true}).click(); await main.getByRole('checkbox', {name: copy.CompanyDocuments.selectPage, exact: true}).check(); await expect(main.getByRole('status').filter({hasText: /^(12 selected|12 selectate)$/})).toBeVisible(); await expect(download).toHaveAttribute('aria-disabled', 'true'); await page.screenshot({path: `artifacts/visual/e1c-006a/missing-selected-${english ? 'en' : 'ro'}.png`});
    await main.getByRole('combobox', {name: copy.DataPagination.pageSize}).selectOption('20'); const missing = page.locator('tbody tr').filter({has: page.locator('[data-tone][data-status="missing"]')}); await missing.getByRole('checkbox').uncheck(); await expect(download).not.toHaveAttribute('aria-disabled');
    await main.getByRole('button', {name: copy.CompanyDocuments.bulkActions, exact: true}).click(); await page.getByRole('menuitem', {name: copy.CompanyDocuments.deselectAll, exact: true}).click(); for (const name of ['Proof 00', 'Proof 01']) await page.getByRole('row', {name: new RegExp(name)}).getByRole('checkbox').check(); await expect(main.getByRole('status').filter({hasText: /^(2 selected|2 selectate)$/})).toBeVisible();
    const downloads: import('@playwright/test').Download[] = []; page.on('download', (value) => downloads.push(value)); await download.click(); await expect.poll(() => downloads.length).toBe(2); for (const item of downloads) expect(await readFile((await item.path())!)).toEqual((await file()).buffer);
    const populatedBefore = await state(); await reminder.click(); await expect(page.getByRole('dialog').locator('#employee-reminder-message')).toHaveValue(''); expect(await state()).toBe(populatedBefore); await close(page); await expect(main.getByRole('status').filter({hasText: /^(2 selected|2 selectate)$/})).toBeVisible();
    for (const width of [1448, 768, 375, 320]) {
      await page.setViewportSize({width, height: 900}); await reminder.locator('..').scrollIntoViewIfNeeded();
      await download.focus(); await page.keyboard.press('Tab'); await expect(reminder).toBeFocused();
      await page.keyboard.press('Enter'); await expect(page.getByRole('dialog')).toBeVisible(); await close(page);
      await reminder.locator('..').evaluate((element) => element.scrollIntoView({block: 'center'}));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await reminder.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({path: `artifacts/visual/e1c-006a/selected-${english ? 'en' : 'ro'}-${width}.png`});
    }
    await page.setViewportSize({width: 1448, height: 900}); await employeeList(page, english); const filters = await openFilters(page); await filters.getByRole('combobox', {name: copy.EmployeeDocuments.trackingLabel}).selectOption('attention'); await expect(page.locator('tbody tr')).toHaveCount(1); await expect(page.locator('tbody')).toContainText('Andrei Popescu'); await page.keyboard.press('Escape'); await expect(main.getByRole('button', {name: copy.EmployeeDocuments.sendReminder, exact: true})).toHaveCount(0);
  });

  test(`${english ? 'EN' : 'RO'} reminder validation, local email preview and close never send or retain a draft`, async ({page}) => {
    await page.goto(prefix + '/company/employees/employee%3Aandrei-popescu');
    const trigger = page.getByRole('button', {name: copy.EmployeeDocuments.sendReminder, exact: true});
    const before = await page.evaluate(() => JSON.stringify({employee: Reflect.get(window, Symbol.for('debiro.employees-session')).state, audit: Reflect.get(window, Symbol.for('debiro.local-audit-session')).events, read: [...Reflect.get(window, Symbol.for('debiro.notification-session')).readIds]}));
    const requests: string[] = []; page.on('request', (request) => {if (/\/employees\/[^/]+\/reminders/.test(request.url())) requests.push(request.url());});
    await trigger.focus(); await page.keyboard.press('Enter'); const dialog = page.getByRole('dialog', {name: copy.EmployeeDocuments.sendReminder});
    await expect(dialog.getByText('Andrei Popescu', {exact: true})).toBeVisible(); await expect(dialog.getByText('andrei.popescu@demo.ro', {exact: true})).toBeVisible();
    const subject = dialog.locator('#employee-reminder-subject'), message = dialog.locator('#employee-reminder-message');
    await expect(subject).toHaveValue(copy.EmployeeReminder.defaultSubject.replace('{company}', 'Demo Company SRL')); await expect(message).toHaveValue('');
    await expect(subject).toHaveAttribute('maxlength', '150'); await expect(message).toHaveAttribute('maxlength', '5000'); await expect(dialog.locator('input[type=email], input[type=file]')).toHaveCount(0);
    await subject.fill('  '); await message.fill('\n \t'); await dialog.getByRole('button', {name: copy.EmployeeReminder.preview, exact: true}).click(); await expect(dialog.getByRole('alert')).toHaveCount(2); await expect(subject).toBeFocused();
    const text = 'Bună, Andrei!\n\nAdministrative update.\n<script>not executable</script>\n';
    await subject.fill('  Administrative notice  '); await message.fill(text); await dialog.getByRole('button', {name: copy.EmployeeReminder.preview, exact: true}).click();
    const preview = dialog.getByRole('region', {name: copy.EmployeeReminder.preview}); await expect(preview).toBeFocused(); await expect(preview.getByText('Administrative notice', {exact: true})).toBeVisible(); expect(await preview.textContent()).toContain(text); await expect(preview.locator('script')).toHaveCount(0);
    const send = dialog.getByRole('button', {name: copy.EmployeeReminder.send, exact: true}); await send.hover(); await expect(page.getByRole('tooltip')).toHaveText(copy.EmployeeReminder.sendUnavailable); await send.focus(); await expect(send).toHaveAttribute('aria-describedby', (await page.getByRole('tooltip').getAttribute('id'))!); await page.keyboard.press('Enter'); await send.click({force: true});
    expect(await page.evaluate(() => JSON.stringify({employee: Reflect.get(window, Symbol.for('debiro.employees-session')).state, audit: Reflect.get(window, Symbol.for('debiro.local-audit-session')).events, read: [...Reflect.get(window, Symbol.for('debiro.notification-session')).readIds]}))).toBe(before); expect(requests).toEqual([]);
    await dialog.getByRole('button', {name: copy.EmployeeReminder.back, exact: true}).click(); await expect(subject).toHaveValue('Administrative notice'); await expect(message).toHaveValue(text); await dialog.getByRole('button', {name: copy.DocumentManagement.cancel, exact: true}).click(); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
    await trigger.click(); await expect(message).toHaveValue(''); await expect(subject).toHaveValue(copy.EmployeeReminder.defaultSubject.replace('{company}', 'Demo Company SRL')); await dialog.getByRole('button', {name: copy.DocumentManagement.close, exact: true}).click(); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  });

  test(`${english ? 'EN' : 'RO'} reminder closes on permission or company change and resolves the next employee afresh`, async ({page}) => {
    await page.goto(prefix + '/company/employees/employee%3Aandrei-popescu'); const trigger = page.getByRole('button', {name: copy.EmployeeDocuments.sendReminder, exact: true});
    await trigger.click(); await page.locator('#employee-reminder-message').fill('Private unsent message'); await role(page, 'viewer'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(trigger).toHaveCount(0);
    await role(page, 'administrator'); await trigger.click(); await expect(page.locator('#employee-reminder-message')).toHaveValue('');
    await page.evaluate(() => {const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>}; owner.state = {...owner.state, activeCompanyId: 'global-clean-services'}; owner.listeners.forEach((notify) => notify());}); await expect(page).toHaveURL(prefix + '/dashboard'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL', english); await employeeDetails(page, english, 'Cristina Mihai'); await trigger.click(); await expect(page.getByRole('dialog').getByText('cristina.mihai@demo.ro', {exact: true})).toBeVisible(); await expect(page.locator('#employee-reminder-message')).toHaveValue(''); await close(page);
  });
}

for (const english of [false, true]) for (const [width, height] of [[1448, 900], [1280, 800], [768, 900], [400, 812], [376, 812], [375, 812], [320, 720]]) {
  test(`${english ? 'EN' : 'RO'} reminder drawer edit/errors/preview visual containment at ${width}x${height}`, async ({page}) => {
    const copy = english ? en : ro, locale = english ? 'en' : 'ro'; await page.setViewportSize({width, height}); await page.goto(`${english ? '/en' : ''}/company/employees/employee%3Aandrei-popescu`);
    const trigger = page.getByRole('button', {name: copy.EmployeeDocuments.sendReminder, exact: true}); await trigger.click(); const dialog = page.getByRole('dialog', {name: copy.EmployeeDocuments.sendReminder});
    await expect(dialog).toBeVisible(); await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    // Check text/icon bounds too: page containment alone misses labels spilling into adjacent buttons.
    for (const button of await dialog.locator('form button').all()) expect(await button.evaluate((element) => {const outer = element.getBoundingClientRect(), inner = element.querySelector('span')!.getBoundingClientRect(); return inner.left >= outer.left && inner.right <= outer.right;})).toBe(true);
    const subject = dialog.locator('#employee-reminder-subject'), message = dialog.locator('#employee-reminder-message');
    const style = (control: Locator) => control.evaluate((element) => {const s = getComputedStyle(element); return {size: s.fontSize, weight: s.fontWeight, family: s.fontFamily, radius: s.borderRadius, border: s.borderColor, left: s.paddingLeft, right: s.paddingRight};}); expect(await style(message)).toEqual(await style(subject));
    await page.screenshot({path: `artifacts/visual/e1c-006a2/edit-${locale}-${width}.png`}); await dialog.getByRole('button', {name: copy.EmployeeReminder.preview, exact: true}).click(); await expect(message).toBeFocused(); await page.screenshot({path: `artifacts/visual/e1c-006a2/errors-${locale}-${width}.png`});
    await subject.fill('Informare administrativă / Administrative notice'); await message.fill('Bună!\n\nThis is a personalized administrative reminder.\nMulțumim.'); await dialog.getByRole('button', {name: copy.EmployeeReminder.preview, exact: true}).click();
    const preview = dialog.getByRole('region', {name: copy.EmployeeReminder.preview}); await expect(preview).toBeFocused(); await expect(preview.locator('p').last()).toHaveCSS('white-space', 'pre-wrap');
    const send = dialog.getByRole('button', {name: copy.EmployeeReminder.send, exact: true}); await send.scrollIntoViewIfNeeded(); await expect(send).toBeInViewport(); await page.screenshot({path: `artifacts/visual/e1c-006a2/preview-${locale}-${width}.png`}); await send.focus();
    const explanation = page.getByRole('tooltip'); await expect(explanation).toHaveText(copy.EmployeeReminder.sendUnavailable); await expect(explanation).toBeInViewport();
    // Visibility/text assertions alone do not detect a tooltip painted behind the modal drawer.
    await expect.poll(() => explanation.evaluate((element) => {const rect = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));})).toBe(true);
    await explanation.hover(); await expect(explanation).toBeVisible(); await page.screenshot({path: `artifacts/visual/e1c-006a2/unavailable-${locale}-${width}.png`});
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  });
}

test('employee document privacy, stale owner/permission boundaries and company switch preserve records', async ({page}) => {
  await page.goto('/en/company/employees/employee%3Aandrei-popescu'); const row = await add(page, true, 'Private personnel file'); await details(page, row, 'Private personnel file');
  await role(page, 'reviewer'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByText(en.EmployeeDocuments.restrictedDescription)).toBeVisible(); await expect(page.locator('main')).not.toContainText('Private personnel file'); await expect(page.getByRole('tab')).toHaveCount(0);
  await employeeList(page, true); await expect(page.getByRole('region', {name: en.Employees.summaryLabel}).locator('strong')).toHaveText(['8', '—', '—']); await expect(page.locator('tbody')).toContainText(en.EmployeeDocuments.restricted);
  await role(page, 'administrator'); await employeeDetails(page, true, 'Cristina Mihai'); await expect(page.getByText(en.EmployeeDocuments.empty)).toBeVisible();
  await employeeDetails(page, true); await expect(page.getByRole('row', {name: /Private personnel file/})).toBeVisible();
  await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services', true); await expect(page).toHaveURL('/en/dashboard'); await employeeList(page, true); await expect(page.getByText(en.Employees.empty)).toBeVisible();
  await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL', true); await employeeDetails(page, true); await expect(page.getByRole('row', {name: /Private personnel file/})).toBeVisible();
  await page.getByRole('button', {name: en.EmployeeDocuments.add, exact: true}).click(); await page.getByRole('dialog').locator('#company-upload-name').fill('Unsaved private draft');
  await page.evaluate(() => {const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>}; owner.state = {...owner.state, activeCompanyId: 'global-clean-services'}; owner.listeners.forEach((notify) => notify());}); await expect(page).toHaveURL('/en/dashboard'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('main')).not.toContainText('Unsaved private draft');
});

test('employee list counts active attention/current expiring requirements and preserves inactive history through edit', async ({page}) => {
  const templateId = await createTemplate(page, true); await employeeDetails(page, true); await page.getByRole('button', {name: en.VendorTemplates.title, exact: true}).first().click(); await page.locator('#company-template').selectOption(templateId); await page.getByRole('dialog').getByRole('button', {name: en.CompanyDocumentManagement.applyTemplate, exact: true}).click(); await close(page);
  const row = page.locator('tbody tr'); await row.getByRole('button', {name: en.CompanyDocuments.upload, exact: true}).click(); let dialog = page.getByRole('dialog'); await dialog.locator('input[type=file]').setInputFiles(await file()); await dialog.locator('#company-upload-expires').fill('01.11.2026'); await dialog.getByRole('button', {name: en.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
  const name = await row.locator('td').nth(1).getByRole('button').innerText(); dialog = await details(page, row, name); await dialog.getByRole('button', {name: en.CompanyDocumentManagement.confirm, exact: true}).click(); await close(page);
  await employeeList(page, true); const summary = page.getByRole('region', {name: en.Employees.summaryLabel}); await expect(summary.locator('strong')).toHaveText(['8', '1', '1']); await page.getByRole('row', {name: /Andrei Popescu/}).getByRole('button', {name: 'Actions for Andrei Popescu'}).click(); await page.getByRole('menuitem', {name: en.Employees.markInactive}).click(); await expect(summary.locator('strong')).toHaveText(['8', '0', '0']);
  await page.getByRole('link', {name: 'Andrei Popescu', exact: true}).click(); await page.getByRole('button', {name: en.Employees.edit, exact: true}).click(); dialog = page.getByRole('dialog'); await expect(dialog.getByRole('note')).toHaveCount(0); await dialog.locator('#employee-status').selectOption('active'); await dialog.getByRole('button', {name: en.Employees.save, exact: true}).click(); await expect(dialog).toHaveCount(0); await expect(page.locator('tbody tr')).toHaveCount(1); await employeeList(page, true); await expect(summary.locator('strong')).toHaveText(['8', '1', '1']);
});

for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [1024, 768], [768, 900], [375, 812], [320, 720]]) {
  test(`employee details and document drawers visual containment at ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width, height}); await page.goto('/company/employees/employee%3Aandrei-popescu'); await expect(page.getByText(ro.EmployeeDocuments.empty)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const text of ['Management', 'andrei.popescu@demo.ro']) expect(await page.locator('main').getByText(text, {exact: true}).evaluate((element) => {const range = document.createRange(); range.selectNodeContents(element); return new Set([...range.getClientRects()].map((rect) => rect.top)).size;})).toBe(1);
    await page.screenshot({path: `artifacts/visual/e1c-006/empty-ro-${width}.png`, fullPage: true});
    const row = await add(page, false, 'Document angajat'); await expect(row).toBeVisible(); await page.screenshot({path: `artifacts/visual/e1c-006/details-ro-${width}.png`, fullPage: true}); let dialog = await details(page, row, 'Document angajat');
    await page.screenshot({path: `artifacts/visual/e1c-006/document-ro-${width}.png`}); expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true); await close(page);
    await page.getByRole('button', {name: ro.EmployeeDocuments.add, exact: true}).click(); dialog = page.getByRole('dialog'); await dialog.getByRole('button', {name: ro.AddDocument.submit, exact: true}).click(); await expect(dialog.getByRole('alert').first()).toBeVisible(); await page.screenshot({path: `artifacts/visual/e1c-006/upload-errors-ro-${width}.png`});
    await dialog.locator('#company-upload-name').fill('Responsiv'); await dialog.getByRole('button', {name: ro.AddDocument.submit, exact: true}).scrollIntoViewIfNeeded(); await expect(dialog.getByRole('button', {name: ro.AddDocument.submit, exact: true})).toBeInViewport(); await expect(dialog.getByRole('button', {name: ro.AddDocument.cancel, exact: true})).toBeInViewport(); await page.screenshot({path: `artifacts/visual/e1c-006/upload-footer-ro-${width}.png`}); expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true); await close(page);
    await page.getByRole('link', {name: 'EN', exact: true}).filter({visible: true}).click(); await expect(page.getByRole('heading', {level: 1})).toHaveText(en.EmployeeDocuments.title); await expect(page.locator('tbody tr')).toHaveCount(1); await page.screenshot({path: `artifacts/visual/e1c-006/details-en-${width}.png`, fullPage: true});
  });
}

test('employee metadata corruption is unavailable without resetting other employees or company documents', async ({page}) => {
  await page.goto('/en/company/employees/employee%3Aandrei-popescu'); await add(page, true);
  await page.evaluate((employeeId) => {const owner = Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState; listeners: Set<() => void>}; owner.state = structuredClone(owner.state); owner.state.byCompany['demo-company'].documentWorkspaces![employeeId].documents[0].employeeId = 'employee:cristina-mihai'; owner.listeners.forEach((notify) => notify());}, employeeId);
  await expect(page.locator('main').getByRole('alert')).toContainText(en.EmployeeDocuments.unavailable); await expect(page.getByRole('table')).toHaveCount(0); await employeeDetails(page, true, 'Cristina Mihai'); await expect(page.getByText(en.EmployeeDocuments.empty)).toBeVisible();
});

test.describe('real employee file viewer', () => {
  test('renders original PDF bytes and revokes the private preview immediately on permission loss', async ({page}) => {
    await page.goto('/en/company/employees/employee%3Aandrei-popescu'); const row = await add(page, true);
    const dialog = await details(page, row, 'Document individual');
    await page.evaluate(() => {const original = URL.revokeObjectURL.bind(URL); Reflect.set(window, 'employeePreviewRevoked', []); URL.revokeObjectURL = (url) => {Reflect.get(window, 'employeePreviewRevoked').push(url); original(url);};});
    await dialog.getByRole('button', {name: en.CompanyDocumentManagement.preview, exact: true}).click();
    await expect.poll(() => page.frames().filter((frame) => frame.url().startsWith('chrome-extension://')).length).toBe(1);
    const viewer = page.frames().find((frame) => frame.url().startsWith('chrome-extension://'))!;
    await expect.poll(() => viewer.locator('pdf-viewer').evaluate((element) => Reflect.get(element, 'initialLoadComplete_'))).toBe(true);
    await viewer.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const url = await dialog.getByTitle('employee-proof.pdf').getAttribute('src'); expect(url).toMatch(/^blob:/);
    await page.screenshot({path: 'artifacts/visual/e1c-006/native-pdf.png'});
    await role(page, 'viewer'); await expect(page.locator('iframe')).toHaveCount(0); await expect(dialog).toHaveCount(0);
    await expect.poll(() => page.evaluate((url) => (Reflect.get(window, 'employeePreviewRevoked') as string[]).includes(url!), url)).toBe(true);
  });

  test('renders uploaded raster bytes and reports missing bytes without generating substitute files', async ({page}) => {
    await page.goto('/en/company/employees/employee%3Aandrei-popescu');
    const png = await page.evaluate(() => {const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180; const context = canvas.getContext('2d')!; context.fillStyle = '#e5f0ff'; context.fillRect(0, 0, 320, 180); context.fillStyle = '#142448'; context.font = '20px sans-serif'; context.fillText('Synthetic employee document', 10, 45); return canvas.toDataURL('image/png').split(',')[1];});
    await page.getByRole('button', {name: en.EmployeeDocuments.add, exact: true}).first().click(); let dialog = page.getByRole('dialog');
    await dialog.locator('#company-upload-name').fill('Employee image'); await dialog.locator('#company-upload-type').selectOption('custom'); await dialog.locator('input[type=file]').setInputFiles({name: 'employee-image.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64')});
    await dialog.getByRole('button', {name: en.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
    dialog = await details(page, page.locator('tbody tr'), 'Employee image'); await dialog.getByRole('button', {name: en.CompanyDocumentManagement.preview, exact: true}).click();
    const image = dialog.getByRole('img', {name: 'employee-image.png'}); await expect(image).toBeVisible(); await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(320);
    await page.screenshot({path: 'artifacts/visual/e1c-006/raster-preview.png'}); await close(page);
    await page.evaluate(() => {const owner = Reflect.get(window, Symbol.for('debiro.employees-session')) as {files: Map<string, unknown>; listeners: Set<() => void>}; owner.files.clear();});
    dialog = await details(page, page.locator('tbody tr'), 'Employee image'); await expect(dialog.getByText(en.CompanyDocumentManagement.previewUnavailable, {exact: true})).toBeVisible();
    await expect(dialog.getByRole('button', {name: en.DocumentManagement.download, exact: true})).toBeDisabled(); await expect(dialog.getByRole('button', {name: en.CompanyDocumentManagement.preview, exact: true})).toHaveCount(0); await expect(dialog.locator('iframe, img')).toHaveCount(0);
  });
});
