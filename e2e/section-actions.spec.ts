import {expect, test, type Locator} from '@playwright/test';
import {createWorkspaceCompany, switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

async function treatment(action: Locator) {
  return action.evaluate((element) => {
    const style = getComputedStyle(element), content = getComputedStyle(element.firstElementChild!);
    const icon = element.querySelector('svg')!;
    return {font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, color: style.color, lineHeight: style.lineHeight, padding: style.padding, gap: content.columnGap, iconWidth: icon.getAttribute('width'), iconHeight: icon.getAttribute('height')};
  });
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '', language = english ? 'EN' : 'RO';
  const all = english ? 'View all' : 'Vezi toate', less = english ? 'Show less' : 'Vezi mai puține';
  test(`${language} section actions share typography, directional icons and keyboard disclosure semantics`, async ({page}) => {
    await page.goto(prefix + '/notifications');
    const expiring = page.locator('#expiring-section'), recent = page.locator('#recent-section');
    const audit = page.getByRole('region', {name: english ? 'Audit journal' : 'Jurnal de audit'});
    const action = expiring.locator('button[aria-expanded]');
    await expect(action).toHaveText(all); await expect(action).toHaveAttribute('aria-expanded', 'false');
    await expect(action.locator('svg path')).toHaveAttribute('d', 'm5 9 7 7 7-7');
    await expect(page.locator('#missing-section button[aria-expanded]')).toHaveCount(0);
    await page.mouse.move(0, 0);
    const canonical = await treatment(action);
    expect(canonical).toMatchObject({size: '13px', weight: '550', gap: '8px', iconWidth: '16', iconHeight: '16'});
    await action.focus();
    expect(await action.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
    await page.keyboard.press('Enter');
    await expect(action).toHaveText(less); await expect(action).toHaveAttribute('aria-expanded', 'true');
    await expect(action).toBeFocused(); await expect(expiring.locator('tbody tr')).toHaveCount(5);
    expect(await action.locator('svg').evaluate((element) => getComputedStyle(element).transform)).toBe('matrix(-1, 0, 0, -1, 0, 0)');
    await recent.getByRole('button', {name: all, exact: true}).click();
    await expect(recent.locator('tbody tr')).toHaveCount(26);
    await action.focus(); await page.keyboard.press('Space');
    await expect(expiring.locator('tbody tr')).toHaveCount(3); await expect(action).toHaveText(all);
    await expect(recent.locator('tbody tr')).toHaveCount(26);
    await audit.getByRole('button', {name: all, exact: true}).click(); await expect(audit.locator('ol li')).toHaveCount(26);
    await audit.getByRole('button', {name: less, exact: true}).click(); await expect(audit.locator('ol li')).toHaveCount(6);
    const categories = page.getByRole('navigation', {name: english ? 'Activity filters' : 'Filtre activitate'});
    await categories.getByRole('button', {name: english ? /^Unread/ : /^Necitite/}).click();
    const range = page.getByRole('combobox', {name: english ? 'Activity and audit period' : 'Perioadă activitate și audit'});
    await range.selectOption('all');
    await expect(recent.getByRole('button', {name: all, exact: true})).toHaveCount(0);
    await action.click(); await action.click(); await expect(range).toHaveValue('all');
    await expect(categories.getByRole('button', {name: english ? /^Unread/ : /^Necitite/})).toHaveAttribute('aria-current', 'page');
    await expect(page).toHaveURL(prefix + '/notifications');

    const settings = page.getByRole('button', {name: english ? 'Company settings' : 'Setări companie', exact: true});
    await settings.click();
    await page.getByRole('link', {name: english ? 'Plan & billing' : 'Plan și facturare', exact: true}).click();
    await expect(page).toHaveURL(prefix + '/company/settings/billing');
    const invoice = page.getByRole('button', {name: all, exact: true});
    await page.mouse.move(0, 0); expect(await treatment(invoice)).toEqual(canonical);
    await expect(page.locator('#billing-invoice-rows tr')).toHaveCount(3);
    await expect(invoice).toHaveAttribute('aria-controls', 'billing-invoice-rows');
    await invoice.focus(); await page.keyboard.press('Space');
    const collapse = page.getByRole('button', {name: less, exact: true});
    await expect(collapse).toBeFocused(); await expect(page.locator('#billing-invoice-rows tr')).toHaveCount(4);
    await page.keyboard.press('Enter'); await expect(page.locator('#billing-invoice-rows tr')).toHaveCount(3);
    await expect(page.locator('#billing-invoice-rows td:first-child')).toHaveText(['INV-2026-009', 'INV-2026-008', 'INV-2026-007']);
    await expect(page.getByRole('button', {name: /Show more|Vezi mai multe/})).toHaveCount(0);

    await workspaceSection(page, 'dashboard', english);
    const attention = page.locator('[data-dashboard-panel="company-documents"]');
    const link = attention.getByRole('link', {name: all, exact: true});
    await page.mouse.move(0, 0); expect(await treatment(link)).toEqual(canonical);
    await expect(link).not.toHaveAttribute('aria-expanded');
    await expect(link).toHaveAttribute('href', prefix + '/company/documents');
    await expect(link.locator('svg path').first()).toHaveAttribute('d', 'M4 12h16');
    const before = await link.boundingBox(); await link.hover(); expect(await link.boundingBox()).toEqual(before);
    await link.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(prefix + '/company/documents');
  });

  test(`${language} section actions remain contained across desktop/tablet/mobile`, async ({page}) => {
    for (const width of [1448, 1024, 758, 600, 375, 320]) {
      await page.setViewportSize({width, height: 900}); await page.goto(prefix + '/notifications');
      for (const section of [page.locator('#expiring-section'), page.locator('#recent-section'), page.getByRole('region', {name: english ? 'Audit journal' : 'Jurnal de audit'})]) {
        const action = section.getByRole('button', {name: all, exact: true});
        await action.scrollIntoViewIfNeeded();
        const box = (await action.boundingBox())!, heading = (await section.getByRole('heading').boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(heading.x + heading.width); expect(box.x + box.width).toBeLessThanOrEqual(width);
        await action.focus(); await page.keyboard.press('Enter');
        const collapse = section.getByRole('button', {name: less, exact: true});
        await expect(collapse).toBeFocused(); await page.keyboard.press('Space');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px notification overflow`).toBeLessThanOrEqual(width);
      await page.goto(prefix + '/company/settings/billing');
      const action = page.getByRole('button', {name: all, exact: true}); await action.scrollIntoViewIfNeeded();
      const box = (await action.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      await action.click(); await expect(page.locator('#billing-invoice-rows tr')).toHaveCount(4);
      await page.getByRole('button', {name: less, exact: true}).click(); await expect(page.locator('#billing-invoice-rows tr')).toHaveCount(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px billing overflow`).toBeLessThanOrEqual(width);
    }
  });

  test(`${language} empty company has no disclosure controls or cross-company rows`, async ({page}) => {
    await createWorkspaceCompany(page, 'Sections Workspace', english);
    await workspaceSection(page, 'notifications', english);
    await expect(page.locator('main button[aria-expanded]')).toHaveCount(0);
    await expect(page.locator('main tbody tr, main [data-audit-id]')).toHaveCount(0);
    const settings = page.getByRole('button', {name: english ? 'Company settings' : 'Setări companie', exact: true});
    await settings.click(); await page.getByRole('link', {name: english ? 'Plan & billing' : 'Plan și facturare', exact: true}).click();
    await expect(page.getByRole('button', {name: all, exact: true})).toHaveCount(0);
    await expect(page.getByText(english ? 'No invoices yet.' : 'Nu există încă facturi.', {exact: true})).toBeVisible();
    await switchWorkspaceCompany(page, 'Sections Workspace', 'Demo Company SRL', english);
    await workspaceSection(page, 'notifications', english);
    await expect(page.locator('#expiring-section tbody tr')).toHaveCount(3);
    await expect(page.locator('#expiring-section').getByRole('button', {name: all, exact: true})).toBeVisible();
  });
}
