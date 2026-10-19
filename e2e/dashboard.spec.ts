import {expect, test} from '@playwright/test';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import {boundaryViewports} from './support/viewports';
import type {readCompanyDocumentsState} from '../src/features/company-documents/company-documents-state';
import type {EmployeeState} from '../src/features/employees/types';

for (const english of [false, true]) {
  const copy = english ? en : ro, prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} canonical unified Dashboard uses three domain cards, five panels and the existing shell`, async ({page}) => {
    const response = await page.goto(prefix + '/dashboard'); expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(copy.Dashboard.overview.title);
    await expect(page.getByText(copy.Dashboard.overview.description)).toBeVisible();
    const summary = page.getByRole('region', {name: copy.Dashboard.overview.summary});
    await expect(summary.getByRole('link')).toHaveCount(3); await expect(summary.locator('strong')).toHaveText(['24', '5', '8']);
    await expect(page.locator('[data-dashboard-panel]')).toHaveCount(5); await expect(page.getByRole('table')).toHaveCount(0);
    for (const name of ['vendor', 'company-document', 'employee', 'event', 'expiration']) expect(await page.locator(`[data-dashboard-${name}]`).count()).toBeLessThanOrEqual(5);
    await expect(page.getByRole('img', {name: `${copy.Dashboard.supplierStatusTitle}: 24 ${copy.Dashboard.suppliersLower}`})).toBeVisible();
    await expect(page.locator('[data-dashboard-panel="employees"]')).toContainText(copy.EmployeeDocuments.tracking.not_configured);
    await expect(page.getByRole('button', {name: copy.Dashboard.addSupplier, exact: true})).toHaveCount(0);
    const search = page.getByRole('combobox'); await search.fill('Construct Pro'); await expect(page.getByRole('listbox')).toContainText('Construct Pro'); await page.keyboard.press('Escape');
    await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).filter({visible: true}).click();
    await expect(page.getByRole('heading', {level: 1})).toHaveText((english ? ro : en).Dashboard.overview.title);
  });
  test(`${english ? 'EN' : 'RO'} Dashboard desktop tablet mobile visual containment and keyboard navigation`, async ({page}) => {
    test.setTimeout(60_000); await page.goto(prefix + '/dashboard');
    for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [1024, 768], [768, 900], [375, 812], [320, 720], ...boundaryViewports.map(({width, height}) => [width, height])]) {
      await page.setViewportSize({width, height}); await page.evaluate(async () => {await document.fonts.ready; window.scrollTo(0, 0);});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const cards = page.getByRole('region', {name: copy.Dashboard.overview.summary}).getByRole('link');
      for (const card of await cards.all()) {expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);}
      if (width >= 1200) {const boxes = await cards.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().y)); expect(new Set(boxes).size).toBe(1); const panels = await page.locator('[data-dashboard-panel]').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().y)); expect(new Set(panels.slice(0, 3)).size).toBe(1); expect(panels[3]).toBe(panels[4]);}
      for (const badge of await page.locator('[data-dashboard-panel] [data-tone]').all()) expect(await badge.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({path: `artifacts/visual/e1c-007a/dashboard-${english ? 'en' : 'ro'}-${width}.png`, fullPage: true});
    }
    const first = page.getByRole('region', {name: copy.Dashboard.overview.summary}).getByRole('link').first(); await first.focus(); await expect(first).toBeFocused(); await expect(first).toHaveCSS('outline-style', 'solid'); await page.keyboard.press('Enter'); await expect(page).toHaveURL(prefix + '/vendors');
  });
  test(`${english ? 'EN' : 'RO'} long names stay readable and malformed domains fail locally without state repair`, async ({page}) => {
    await page.goto(prefix + '/dashboard');
    await page.evaluate(() => {
      const company = Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: ReturnType<typeof readCompanyDocumentsState>; listeners: Set<() => void>}; company.state = structuredClone(company.state);
      company.state.byCompany['demo-company'].documents.find((item) => item.id === 'company-document:vat')!.documentName = {ro: 'Certificat pentru o activitate administrativă cu o denumire foarte lungă', en: 'Certificate for an administrative activity with a particularly long name'};
      company.listeners.forEach((notify) => notify());
    });
    for (const width of [1448, 768, 375, 320]) {await page.setViewportSize({width, height: 900}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({path: `artifacts/visual/e1c-007a/long-names-${english ? 'en' : 'ro'}-${width}.png`, fullPage: true});}
    const before = await page.evaluate(() => {
      const company = Reflect.get(window, Symbol.for('debiro.company-documents-session')) as {state: ReturnType<typeof readCompanyDocumentsState>; listeners: Set<() => void>}; company.state = structuredClone(company.state); company.state.byCompany['demo-company'].documents[0].expiresAt = 'invalid'; company.listeners.forEach((notify) => notify());
      const employees = Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState; listeners: Set<() => void>}; employees.state = structuredClone(employees.state); employees.state.byCompany['demo-company'].documentWorkspaces = {'employee:andrei-popescu': null as never}; employees.listeners.forEach((notify) => notify()); return JSON.stringify([company.state, employees.state]);
    });
    for (const id of ['company-documents', 'employees']) await expect(page.locator(`[data-dashboard-panel="${id}"]`)).toContainText(copy.Foundation.errorTitle);
    await expect(page.locator('[data-dashboard-panel="vendors"] [role="img"]')).toBeVisible();
    expect(await page.evaluate(() => JSON.stringify([Reflect.get(window, Symbol.for('debiro.company-documents-session')).state, Reflect.get(window, Symbol.for('debiro.employees-session')).state]))).toBe(before);
  });
}

test('desktop sidebar brand navigation and organization remain in view while the redesigned Dashboard scrolls', async ({page}) => {
  await page.goto('/dashboard');
  for (const height of [900, 768, 600]) {
    await page.setViewportSize({width: 1448, height}); await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const geometry = await page.evaluate(() => {const sidebar = document.querySelector('aside[aria-label="Bară laterală aplicație"]')!.getBoundingClientRect(), organization = document.querySelector('button[aria-label="Demo Company SRL"]')!.getBoundingClientRect(); return {top: sidebar.top, bottom: sidebar.bottom, organization: organization.bottom, height: innerHeight};});
    // Sticky elements may land on fractional CSS pixels after scrolling/resizing.
    expect(geometry.top).toBeCloseTo(0, 0); expect(geometry.bottom).toBeCloseTo(geometry.height, 0); expect(geometry.organization).toBeLessThanOrEqual(geometry.height + 0.5);
  }
});
