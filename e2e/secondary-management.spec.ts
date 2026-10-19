import {expect, test, type Page} from '@playwright/test';
import {openFilters} from './support/filters';

async function changeRole(page: Page, name: string, role: string, english: boolean) {
  await page.getByRole('row', {name: new RegExp(name)}).getByRole('button', {name: english ? `Actions for ${name}` : `Acțiuni pentru ${name}`}).click();
  await page.getByRole('menuitem', {name: english ? 'Change role' : 'Schimbă rolul'}).click();
  const drawer = page.getByRole('dialog', {name: english ? 'Change member role' : 'Schimbă rolul membrului', exact: true});
  await drawer.getByRole('radio', {name: new RegExp(`^${role}`)}).check();
  await drawer.getByRole('button', {name: english ? 'Change role' : 'Schimbă rolul', exact: true}).click();
  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toContainText(name); await expect(confirmation).toContainText(role);
  await confirmation.getByRole('button', {name: english ? 'Change role' : 'Schimbă rolul', exact: true}).click();
  await expect(drawer).not.toBeVisible();
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} existing Vendor status entry filters work and the Dashboard domain card clears stale filters`, async ({page}) => {
    for (const status of ['all', 'compliant', 'attention', 'noncompliant']) {
      await page.goto(prefix + '/vendors' + (status === 'all' ? '' : `?status=${status}`));
      await expect(page).toHaveURL(prefix + '/vendors' + (status === 'all' ? '' : `?status=${status}`));
      await openFilters(page); await expect(page.locator('#vendor-status-filter')).toHaveValue(status); await page.keyboard.press('Escape');
      const rows = page.locator('tbody [data-vendor-id]');
      if (status === 'noncompliant') {await expect(rows).toHaveCount(0); await expect(page.getByText(english ? 'No suppliers match the filters.' : 'Niciun furnizor nu corespunde filtrelor.')).toBeVisible();}
      else {await expect(rows.first()).toBeVisible(); if (status === 'attention') await expect(rows).toHaveCount(1);}
    }
    await page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: 'Dashboard', exact: true}).click();
    await page.getByRole('region', {name: english ? 'Company overview' : 'Privire de ansamblu asupra companiei'}).getByRole('link').first().click();
    await expect(page).toHaveURL(prefix + '/vendors'); await openFilters(page); await expect(page.locator('#vendor-status-filter')).toHaveValue('all'); await page.keyboard.press('Escape'); await expect(page.locator('tbody [data-vendor-id]')).toHaveCount(8);
    // A manually changed filter on the plain route must not survive Total navigation either.
    await openFilters(page); await page.locator('#vendor-status-filter').selectOption('attention'); await page.keyboard.press('Escape');
    await expect(page.locator('tbody [data-vendor-id]')).toHaveCount(1);
    await page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: 'Dashboard', exact: true}).click();
    await page.getByRole('region', {name: english ? 'Company overview' : 'Privire de ansamblu asupra companiei'}).getByRole('link').first().click();
    await openFilters(page); await expect(page.locator('#vendor-status-filter')).toHaveValue('all'); await page.keyboard.press('Escape');
    await expect(page.locator('tbody [data-vendor-id]')).toHaveCount(8);
    await page.goto(prefix + '/vendors?status=invalid'); await openFilters(page); await expect(page.locator('#vendor-status-filter')).toHaveValue('all');
  });

  test(`${english ? 'EN' : 'RO'} Notifications expand/collapse independently without resetting filters`, async ({page}) => {
    await page.goto(prefix + '/notifications');
    const all = english ? 'View all' : 'Vezi toate', less = english ? 'Show less' : 'Vezi mai puține';
    const expiring = page.locator('#expiring-section'), missing = page.locator('#missing-section'), recent = page.locator('#recent-section');
    const audit = page.getByRole('region', {name: english ? 'Audit journal' : 'Jurnal de audit'});
    const summaries = page.locator(`section[aria-label="${english ? 'Activity summary' : 'Rezumat activitate'}"]`); await expect(summaries).toBeVisible(); await expect(summaries.getByRole('button')).toHaveCount(0);
    await expect(expiring.locator('tbody tr')).toHaveCount(3); await expect(missing.getByRole('button', {name: all})).toHaveCount(0);
    await expiring.getByRole('button', {name: all}).click(); await expect(expiring.locator('tbody tr')).toHaveCount(4); await expect(expiring.getByRole('button', {name: less})).toHaveAttribute('aria-expanded', 'true');
    await expect(recent.locator('tbody tr')).toHaveCount(5); await expect(audit.locator('ol li')).toHaveCount(6);
    await recent.getByRole('button', {name: all}).click(); await expect(recent.locator('tbody tr')).toHaveCount(8);
    await recent.getByRole('button', {name: less}).click(); await expect(recent.locator('tbody tr')).toHaveCount(5);
    await audit.getByRole('button', {name: all}).click(); await expect(audit.locator('ol li')).toHaveCount(28); await audit.getByRole('button', {name: less}).click(); await expect(audit.locator('ol li')).toHaveCount(6);
    const categories = page.getByRole('navigation', {name: english ? 'Activity filters' : 'Filtre activitate'});
    await categories.getByRole('button', {name: english ? /^Unread/ : /^Necitite/}).click();
    const range = page.getByRole('combobox', {name: english ? 'Activity and audit period' : 'Perioadă activitate și audit'}); await range.selectOption('all');
    await expiring.getByRole('button', {name: less}).click(); await expect(expiring.locator('tbody tr')).toHaveCount(3);
    await expect(range).toHaveValue('all'); await expect(categories.getByRole('button', {name: english ? /^Unread/ : /^Necitite/})).toHaveAttribute('aria-current', 'page');
    await expect(recent.getByRole('button', {name: all})).toHaveCount(0); await expect(page).toHaveURL(prefix + '/notifications');
  });

  test(`${english ? 'EN' : 'RO'} Administrator role/removal and invitation actions update counts and retain company isolation`, async ({page}) => {
    await page.goto(prefix + '/company/settings/members');
    const own = page.getByRole('row', {name: /Andrei Popescu/}); await expect(own.getByRole('button')).toHaveCount(0);
    const ioana = page.getByRole('row', {name: /Ioana Radu/});
    const trigger = ioana.getByRole('button'); await trigger.focus(); await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: english ? 'Change role' : 'Schimbă rolul'})).toBeFocused(); await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: english ? 'Remove member' : 'Elimină membrul'})).toBeFocused(); await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    await changeRole(page, 'Ioana Radu', 'Viewer', english); await expect(ioana.locator('[data-role="viewer"]')).toBeVisible();
    await changeRole(page, 'Ioana Radu', 'Administrator', english); await expect(ioana.locator('[data-role="administrator"]')).toBeVisible();
    await ioana.getByRole('button').click(); await page.getByRole('menuitem', {name: english ? 'Remove member' : 'Elimină membrul'}).click();
    const confirm = page.getByRole('alertdialog'); await expect(confirm).toContainText('ioana.radu@demo.ro'); await expect(confirm).toContainText('Demo Company SRL');
    await confirm.getByRole('button', {name: english ? 'Cancel' : 'Anulează', exact: true}).click(); await expect(ioana).toBeVisible();
    await ioana.getByRole('button').click(); await page.getByRole('menuitem', {name: english ? 'Remove member' : 'Elimină membrul'}).click(); await confirm.getByRole('button', {name: english ? 'Remove member' : 'Elimină membrul', exact: true}).click(); await expect(ioana).toHaveCount(0); await expect(own.getByRole('button')).toHaveCount(0);
    await changeRole(page, 'Mihai Ene', 'Reviewer', english); const pending = page.getByRole('row', {name: /Mihai Ene/}); await expect(pending.locator('[data-role="reviewer"]')).toBeVisible();
    await pending.getByRole('button').click(); await page.getByRole('menuitem', {name: english ? 'Cancel invitation' : 'Anulează invitația'}).click(); await confirm.getByRole('button', {name: english ? 'Keep invitation' : 'Păstrează invitația'}).click(); await expect(pending).toBeVisible();
    await pending.getByRole('button').click(); await page.getByRole('menuitem', {name: english ? 'Cancel invitation' : 'Anulează invitația'}).click(); await confirm.getByRole('button', {name: english ? 'Cancel invitation' : 'Anulează invitația', exact: true}).click(); await expect(pending).toHaveCount(0);
    await expect(page.getByRole('button', {name: english ? 'Invite member' : 'Invită membru', exact: true})).toBeFocused();
    await page.getByRole('link', {name: english ? 'Plan & billing' : 'Plan și facturare', exact: true}).click(); await expect(page.getByTestId('billing-seat-usage')).toHaveText('1/5'); await expect(page.getByTestId('billing-available-seats')).toContainText('4');
    await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click(); await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click(); await expect(page).toHaveURL(prefix + '/dashboard');
    await page.getByRole('link', {name: english ? 'Members & access' : 'Membri și acces', exact: true}).click(); await expect(page.locator('tbody tr')).toHaveCount(1); await expect(page.getByRole('button', {name: english ? 'Invite member' : 'Invită membru'})).toHaveCount(0); await expect(page.locator('tbody button')).toHaveCount(0); await expect(own.locator('[data-role="reviewer"]')).toBeVisible();
    await page.getByRole('button', {name: 'Global Clean Services', exact: true}).click(); await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Demo Company SRL/}).click(); await page.getByRole('link', {name: english ? 'Members & access' : 'Membri și acces', exact: true}).click(); await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'}).locator(`a[href="${prefix}/notifications"]`).click(); await expect(page.locator('[data-audit-id^="local-audit-"]')).toHaveCount(5);
  });
}

test('member menu, shared role drawer and confirmations remain usable at desktop/tablet/mobile widths', async ({page}) => {
  for (const width of [1448, 1024, 758, 375, 320]) {
    await page.setViewportSize({width, height: 900}); await page.goto('/company/settings/members');
    await page.getByRole('row', {name: /Ioana Radu/}).getByRole('button').click(); const menu = page.getByRole('menu'); const box = await menu.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await menu.getByRole('menuitem', {name: 'Schimbă rolul'}).click(); const drawer = page.getByRole('dialog', {name: 'Schimbă rolul membrului', exact: true}); await drawer.getByRole('radio', {name: /^Viewer/}).check(); await drawer.getByRole('button', {name: 'Schimbă rolul', exact: true}).click(); const confirm = page.getByRole('alertdialog'); await expect(confirm).toContainText('Reviewer'); await expect(confirm).toContainText('Viewer'); const dialogBox = await confirm.boundingBox(); expect(dialogBox!.x).toBeGreaterThanOrEqual(0); expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(width);
    await confirm.getByRole('button', {name: 'Anulează', exact: true}).click(); await drawer.getByRole('button', {name: 'Închide schimbarea rolului'}).click(); await expect(drawer).not.toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('English invoice Download is a marked local sample and the only invoice row action', async ({page}) => {
  await page.goto('/en/company/settings/billing'); const row = page.getByRole('row', {name: /INV-2026-008/}); await expect(row.getByRole('button')).toHaveCount(1);
  const promise = page.waitForEvent('download'); await row.getByRole('button', {name: 'Download', exact: true}).click(); const download = await promise; expect(download.suggestedFilename()).toBe('INV-2026-008-sample.csv'); const chunks: Uint8Array[] = []; for await (const chunk of (await download.createReadStream())!) chunks.push(chunk); expect(Buffer.concat(chunks).toString('utf8')).toContain('NOT AN OFFICIAL INVOICE'); await expect(page).toHaveURL('/en/company/settings/billing');
});
