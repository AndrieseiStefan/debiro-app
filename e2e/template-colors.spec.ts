import {expect, test, type Page, type Locator} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import type {readRequirementsState} from '../src/features/requirements/requirements-state';
import type {CompanyDocumentsState} from '../src/features/company-documents/types';
import type {readVendorRequirements} from '../src/features/vendors/vendor-requirements';
import {switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

const directory = 'artifacts/visual/e1c-003c';
const widths = [[1920, 1080], [1448, 900], [1280, 800], [1024, 900], [768, 900], [375, 812], [320, 812]];
async function capture(page: Page, name: string) {await mkdir(directory, {recursive: true}); await page.evaluate(() => document.fonts.ready); await page.screenshot({path: `${directory}/${name}.png`, animations: 'disabled'});}
async function colors(row: Locator) {return row.evaluate((element) => ({token: element.getAttribute('data-template-accent'), row: getComputedStyle(element).backgroundColor,
  sources: [...element.querySelectorAll('[data-template-id]')].map((badge) => ({id: badge.getAttribute('data-template-id'), token: badge.getAttribute('data-template-accent'), background: getComputedStyle(badge).backgroundColor, color: getComputedStyle(badge).color}))}));}
async function close(page: Page) {await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);}

for (const locale of ['ro', 'en'] as const) {
  const english = locale === 'en', prefix = english ? '/en' : '', copy = english ? en : ro;
  const goCompany = async (page: Page) => {const nav = page.getByRole('navigation', {name: copy.AppShell.navigationLabel}); const group = nav.getByRole('button', {name: copy.AppShell.navigation.company, exact: true}); if (await group.getAttribute('aria-expanded') !== 'true') await group.click(); await nav.getByRole('link', {name: copy.AppShell.navigation.companyDocuments, exact: true}).click(); await expect(page.getByRole('heading', {level: 1})).toHaveText(copy.CompanyDocuments.title);};
  test(`${locale} template colors, ordered multi-source rows, compact header and chip removal survive navigation`, async ({page}) => {
    test.setTimeout(120_000); await page.setViewportSize({width: 1448, height: 900}); await page.goto(`${prefix}/vendors/construct-pro`);
    const panel = page.getByRole('tabpanel'), row = panel.locator('[data-requirement-id="vendor-requirement:construct-pro:registration"]');
    const originalStatus = await row.locator('[data-tone]').last().evaluate((element) => ({text: element.textContent, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor}));
    await expect(panel.locator('[class*=appliedTemplates]')).toHaveCount(0); await expect(row).not.toHaveAttribute('data-template-accent');
    await panel.scrollIntoViewIfNeeded(); await capture(page, `${locale}-vendor-none`);
    async function apply(multiple: boolean) {
      await panel.getByRole('button', {name: copy.VendorTemplates.title, exact: true}).click();
      const selector = page.getByRole('dialog');
      await selector.getByRole('checkbox', {name: english ? /^Construction subcontractor/ : /^Subcontractor construcții/}).check();
      if (multiple) await selector.getByRole('checkbox', {name: english ? /^Maintenance services/ : /^Servicii de mentenanță/}).check();
      await selector.getByRole('button', {name: english ? `Apply ${multiple ? 2 : 1} template${multiple ? 's' : ''}` : `Aplică ${multiple ? '2 șabloane' : '1 șablon'}`, exact: true}).click();
      await page.getByRole('dialog', {name: copy.VendorTemplates.confirmTitle, exact: true}).getByRole('button', {name: copy.VendorTemplates.apply, exact: true}).click();
    }
    await apply(false); const single = await colors(row); expect(single.sources).toHaveLength(1); expect(single.token).toBe(single.sources[0].token);
    await capture(page, `${locale}-vendor-one`); await apply(true);
    const multiple = await colors(row); expect(multiple.sources.map((source) => source.id)).toEqual(['construction', 'maintenance']);
    expect(multiple.token).toBe(single.token); expect(multiple.sources[0].token).not.toBe(multiple.sources[1].token);
    expect(await row.locator('[data-tone][data-size=document]').evaluate((element) => ({text: element.textContent, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor}))).toEqual(originalStatus);
    const neutral = panel.locator('[data-requirement-id="vendor-requirement:construct-pro:tax"]'); await expect(neutral).not.toHaveAttribute('data-template-accent'); await expect(neutral).toContainText(copy.VendorTemplates.manualSource);
    // Existing grouping does not make new cells interactive; hover/focus remain independent of status.
    await row.hover(); expect((await colors(row)).row).not.toBe(multiple.row); await capture(page, `${locale}-vendor-hover`);
    await row.getByRole('link').focus(); expect(await row.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid'); await capture(page, `${locale}-vendor-focus`);
    await page.mouse.move(0, 0);
    // Reopening/cancelling clears only the existing success message, with no reserved feedback band.
    await panel.getByRole('button', {name: copy.VendorTemplates.title, exact: true}).click(); await close(page);
    const geometry = {};
    for (const [width, height] of widths) {
      await page.setViewportSize({width, height}); await panel.locator('[class*=panelHeader]').scrollIntoViewIfNeeded(); await capture(page, `${locale}-vendor-multiple-${width}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const header = panel.locator('[class*=panelHeader]'), applied = panel.locator('[class*=appliedTemplates]');
      expect(await applied.evaluate((element) => Boolean(element.closest('[class*=panelHeader]')))).toBe(true);
      expect(await header.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      for (const chip of await applied.locator('[data-size=template]').all()) expect(await chip.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      Reflect.set(geometry, width, await panel.evaluate((element) => ({headerHeight: element.querySelector('[class*=panelHeader]')!.getBoundingClientRect().height, tableTop: element.querySelector('table')!.getBoundingClientRect().top - element.getBoundingClientRect().top})));
    }
    await writeFile(`${directory}/${locale}-header-geometry.json`, JSON.stringify(geometry, null, 2));
    await page.setViewportSize({width: 1448, height: 900});
    await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).filter({visible: true}).click();
    await expect.poll(async () => (await colors(row)).sources).toEqual(multiple.sources); // labels change locale; identity does not.
    await page.getByRole('link', {name: english ? 'EN' : 'RO', exact: true}).filter({visible: true}).click();
    await workspaceSection(page, 'requirements', english);
    await page.getByRole('button', {name: english ? /^Construction subcontractor/ : /^Subcontractor construcții/}).first().click();
    await page.locator('#requirement-template-name').fill('Renamed source'); await page.getByRole('button', {name: copy.Requirements.saveTemplate, exact: true}).click();
    await workspaceSection(page, 'vendors', english); await page.getByRole('link', {name: english ? 'Details for Construct Pro SRL' : 'Detalii pentru Construct Pro SRL'}).click();
    await expect.poll(async () => (await colors(row)).sources).toEqual(multiple.sources); await expect(row).toContainText(english ? 'Construction subcontractor' : 'Subcontractor construcții'); // retained name snapshot
    const remove = panel.getByRole('button', {name: copy.VendorTemplates.removeAssociation.replace('{name}', english ? 'Construction subcontractor' : 'Subcontractor construcții'), exact: true});
    await remove.focus(); await page.keyboard.press('Enter'); await page.getByRole('alertdialog').getByRole('button', {name: copy.VendorTemplates.confirmRemoveAssociation, exact: true}).click();
    await expect(panel.locator('[data-size=template]')).toHaveCount(1); expect((await colors(row)).sources).toEqual(multiple.sources); // existing provenance-only removal
    await page.evaluate(() => {
      const owner = Reflect.get(window, Symbol.for('debiro.vendor-requirements-session')) as {state: ReturnType<typeof readVendorRequirements>; listeners: Set<() => void>};
      const workspace = owner.state['demo-company:construct-pro'];
      const name = 'A very long applied template name for comprehensive construction safety documentation';
      owner.state = {...owner.state, 'demo-company:construct-pro': {...workspace, appliedTemplates: workspace.appliedTemplates.map((item) => ({...item, title: {ro: name, en: name}}))}};
      owner.listeners.forEach((notify) => notify());
    });
    await page.setViewportSize({width: 320, height: 812}); await panel.locator('[class*=panelHeader]').scrollIntoViewIfNeeded();
    expect(await panel.locator('[class*=panelHeader]').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true); await capture(page, `${locale}-vendor-long-chip-320`);
    // Apply the same actual template to another owned vendor, without copying its accent.
    await page.setViewportSize({width: 1448, height: 900}); await workspaceSection(page, 'vendors', english);
    await page.locator('main input[type=search]').fill('Alpha Construction');
    await page.getByRole('link', {name: english ? 'Details for Alpha Construction SRL' : 'Detalii pentru Alpha Construction SRL'}).click();
    await panel.getByRole('button', {name: copy.VendorTemplates.title, exact: true}).click();
    await page.getByRole('dialog').getByRole('checkbox', {name: /^Renamed source/}).check();
    await page.getByRole('dialog').getByRole('button', {name: english ? 'Apply 1 template' : 'Aplică 1 șablon', exact: true}).click();
    await page.getByRole('dialog', {name: copy.VendorTemplates.confirmTitle, exact: true}).getByRole('button', {name: copy.VendorTemplates.apply, exact: true}).click();
    await expect(panel.locator('tbody tr[data-template-accent]').first()).toHaveAttribute('data-template-accent', single.token!);
  });

  test(`${locale} Company Source column reuses template colors and preserves status selection sorting and company ownership`, async ({page}) => {
    test.setTimeout(120_000); await page.setViewportSize({width: 1448, height: 900}); await page.goto(`${prefix}/requirements`);
    for (const name of ['Company certificates', 'Company permits']) {
      await page.locator('#requirement-template-scope').selectOption('company');
      await page.getByRole('button', {name: english ? 'New Template' : 'Șablon nou', exact: true}).click(); await page.locator('#requirement-template-name').fill(name);
      await page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document', exact: true}).click();
      const drawer = page.getByRole('dialog'); await drawer.getByRole('button', {name: english ? /^Tax certificate/ : /^Certificat fiscal/}).click();
      await drawer.getByRole('button', {name: english ? 'Add document' : 'Adaugă documentul', exact: true}).click();
      await page.getByRole('button', {name: english ? 'Save template' : 'Salvează șablon', exact: true}).click();
    }
    await goCompany(page); await expect(page.getByRole('columnheader', {name: copy.VendorTemplates.source, exact: true})).toBeVisible();
    const manual = page.locator('[data-company-document-row="company-requirement:vat"]'); await expect(manual).toContainText(copy.VendorTemplates.manualSource); await expect(manual).not.toHaveAttribute('data-template-accent');
    for (const name of ['Company certificates', 'Company permits']) {
      await page.getByRole('button', {name: copy.VendorTemplates.title, exact: true}).click(); const dialog = page.getByRole('dialog');
      await dialog.locator('#company-template').selectOption({label: name}); await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.applyTemplate, exact: true}).click(); await expect(dialog.getByRole('status')).toBeVisible(); await close(page);
    }
    const grouped = page.locator('tbody tr[data-template-accent]'); await expect(grouped).toHaveCount(2);
    const first = grouped.filter({hasText: 'Company certificates'}), second = grouped.filter({hasText: 'Company permits'}), initial = await colors(first);
    expect(initial.token).not.toBe((await colors(second)).token);
    await first.getByRole('button', {name: copy.CompanyDocuments.upload, exact: true}).click(); let dialog = page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles({name: 'accent-proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF sample test file')});
    await dialog.getByRole('button', {name: copy.AddDocument.submit, exact: true}).click();
    await first.getByRole('checkbox').check(); await expect(first).toHaveAttribute('aria-selected', 'true');
    expect((await colors(first)).row).not.toBe(initial.row); await capture(page, `${locale}-company-selected`);
    await first.getByRole('checkbox').uncheck(); await first.locator('td').nth(1).getByRole('button').click(); dialog = page.getByRole('dialog');
    await dialog.getByRole('button', {name: copy.CompanyDocumentManagement.confirm, exact: true}).click();
    await dialog.getByRole('button', {name: copy.DocumentManagement.markExpired, exact: true}).click(); await page.getByRole('alertdialog').getByRole('button', {name: copy.DocumentManagement.markExpired, exact: true}).click(); await close(page);
    await expect(first.locator('[data-status=expired][data-tone=danger]')).toBeVisible(); expect((await colors(first)).token).toBe(initial.token);
    await page.locator('#company-document-sort').selectOption('name:descending'); expect((await colors(first)).sources).toEqual(initial.sources);
    await page.getByRole('searchbox').fill(english ? 'Tax certificate' : 'Certificat fiscal'); expect((await colors(first)).sources).toEqual(initial.sources); await page.getByRole('searchbox').fill('');
    for (const [width, height] of widths) {
      await page.setViewportSize({width, height}); await page.getByRole('table').scrollIntoViewIfNeeded(); await capture(page, `${locale}-company-mixed-${width}`); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (width <= 768) {
        const region = page.getByRole('region', {name: copy.CompanyDocuments.tableRegion});
        await region.evaluate((element) => {element.scrollLeft = (element.querySelector('tbody td:nth-child(3)') as HTMLElement).offsetLeft - 20;});
        await capture(page, `${locale}-company-sources-${width}`); await region.evaluate((element) => {element.scrollLeft = 0;});
      }
    }
    await page.setViewportSize({width: 1448, height: 900}); await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).filter({visible: true}).click();
    await expect(page.getByRole('heading', {level: 1})).toHaveText(english ? ro.CompanyDocuments.title : en.CompanyDocuments.title);
    await expect.poll(async () => (await colors(first)).sources).toEqual(initial.sources);
    await page.getByRole('link', {name: english ? 'EN' : 'RO', exact: true}).filter({visible: true}).click();
    await expect(page.getByRole('heading', {level: 1})).toHaveText(copy.CompanyDocuments.title);
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services', english); await goCompany(page); await expect(page.locator('[data-template-id]')).toHaveCount(0); await expect(page.getByText('Company certificates')).toHaveCount(0);
    await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL', english); await goCompany(page); await expect.poll(async () => (await colors(first)).sources).toEqual(initial.sources);
    // Deleted/invalid/foreign references stay neutral without inventing manual provenance or leaking names.
    await page.evaluate(() => {
      const templates = Reflect.get(window, Symbol.for('debiro.requirements-session')) as {state: ReturnType<typeof readRequirementsState>; listeners: Set<() => void>};
      templates.state = {...templates.state, byCompany: {...templates.state.byCompany, 'demo-company': {...templates.state.byCompany['demo-company'], templates: templates.state.byCompany['demo-company'].templates.filter((item) => item.title.en !== 'Company certificates')}}}; templates.listeners.forEach((notify) => notify());
      const documents = Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: CompanyDocumentsState; listeners: Set<() => void>};
      documents.listeners.forEach((notify) => notify());
    });
    await expect(grouped).toHaveCount(1); await expect(page.getByText(copy.VendorTemplates.sourceUnavailable, {exact: true})).toHaveCount(1);
  });
}
