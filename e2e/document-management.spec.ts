import {expect, test, type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const registration = 'construct-pro-registration-2024';
const file = {name: 'renewed.pdf', mimeType: 'application/pdf', buffer: Buffer.from('actual local renewal bytes')};
async function renew(page: Page, english: boolean, expiry: string, name = file.name) {
  const drawer = page.getByRole('dialog');
  await drawer.locator('input[type=file]').setInputFiles({...file, name});
  await drawer.locator('#replace-issuedAt').fill('01.09.2026');
  await drawer.locator('#replace-expiresAt').fill(expiry);
  await drawer.locator('#replace-documentNumber').fill('Renewal-42');
  await drawer.getByRole('button', {name: english ? 'Upload document' : 'Încarcă document', exact: true}).click();
  await expect(page.getByRole('dialog', {name: english ? 'Document uploaded successfully' : 'Document încărcat cu succes'})).toBeVisible();
  await expect(drawer).not.toContainText(english ? 'Needs review' : 'Necesită revizuire');
}
async function close(page: Page, english: boolean) {
  await page.getByRole('dialog').getByRole('button', {name: english ? 'Close' : 'Închide', exact: true}).first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function sidebar(page: Page, english: boolean, section: string) {
  await page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: new RegExp(`^${section}(?: \\d+)?$`)}).click();
}
async function openVersionDetails(page: Page, english: boolean, version: number) {
  const drawer = page.getByRole('dialog');
  await drawer.locator(`[data-version="${version}"]`).getByRole('button', {name: english ? `Actions for version ${version}` : `Acțiuni pentru versiunea ${version}`}).click();
  await drawer.getByRole('menuitem', {name: english ? 'Open details' : 'Deschide detalii'}).click();
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '';
  for (const width of [1448, 375]) {
    test(`${english ? 'EN' : 'RO'} seeded ISU history preserves current projections and Back at ${width}px`, async ({page}) => {
      await page.setViewportSize({width, height: width === 375 ? 812 : 1086});
      await page.goto(`${prefix}/documents?document=construct-pro-fire-2024`);
      const drawer = page.getByRole('dialog');
      const entryURL = page.url();
      const date = (value: string) => new Intl.DateTimeFormat(english ? 'en-GB' : 'ro-RO', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${value}T12:00:00Z`));
      await expect(drawer.getByRole('heading', {name: english ? 'Version history (2)' : 'Istoric versiuni (2)'})).toBeVisible();
      await expect(drawer.getByRole('term')).toHaveCount(6);
      await expect(drawer.getByRole('definition').nth(2)).toHaveText('Valid');
      await expect(drawer.getByRole('definition').nth(3)).toHaveText(date('2027-05-03'));
      await expect(drawer.getByRole('button', {name: english ? 'Download' : 'Descarcă'})).toBeDisabled();
      const preview = drawer.locator('[data-preview-version]');
      await expect(preview).toHaveCount(2);
      for (const [version, uploadDate] of [[2, '2026-09-29'], [1, '2026-02-15']] as const) {
        const item = drawer.locator(`[data-preview-version="${version}"]`);
        await expect(item.locator('time')).toHaveText(date(uploadDate));
        await expect(item.locator('small')).toHaveText('Andrei Popescu');
        await expect(item.getByText(english ? 'Current' : 'Curent', {exact: true})).toHaveCount(version === 2 ? 1 : 0);
        await expect(item).not.toContainText(/Autorizatie_ISU.pdf|2027|2026-09-15|Aprobată|Approved/);
      }
      await drawer.getByRole('button', {name: english ? 'View all' : 'Vezi toate'}).click();
      await expect(drawer.getByRole('heading', {name: english ? 'Document history' : 'Istoric document'})).toBeVisible();
      const versions = drawer.locator('[data-version]');
      await expect(versions).toHaveCount(2);
      await expect(drawer.locator('[data-version-state="current"]')).toHaveCount(1);
      const current = drawer.locator('[data-version="2"]');
      const historical = drawer.locator('[data-version="1"]');
      await expect(current).toHaveAttribute('data-version-state', 'current');
      await expect(historical).toHaveAttribute('data-version-state', 'superseded');
      await expect(current).toContainText(english ? 'Current version' : 'Versiune curentă');
      await expect(historical).toContainText(`${english ? 'Valid until:' : 'Valabilă:'} ${date('2026-09-15')}`);
      for (const item of [current, historical]) {
        await expect(item).toContainText(english ? 'Approved' : 'Aprobată');
        await expect(item).toContainText('Andrei Popescu');
        await expect(item.locator('[data-tone="success"] svg')).toHaveCount(1);
      }
      await expect(current).toHaveCSS('background-color', 'rgb(244, 248, 255)');
      await expect(drawer.getByRole('button', {name: english ? 'Download' : 'Descarcă'})).toHaveCount(0);
      await expect(drawer).not.toContainText('Autorizatie_ISU.pdf');
      const markerColors = await versions.evaluateAll((items) => items.map((item) => getComputedStyle(item, '::before').backgroundColor));
      expect(markerColors).toEqual(['rgb(0, 92, 237)', 'rgb(255, 255, 255)']);
      for (const version of [2, 1]) {
        await drawer.locator(`[data-version="${version}"]`).getByRole('button').click();
        await expect(drawer.getByRole('menuitem')).toHaveCount(1);
        await expect(drawer.getByRole('menuitem', {name: english ? 'Open details' : 'Deschide detalii'})).toBeFocused();
        await page.keyboard.press('Escape');
      }
      await openVersionDetails(page, english, 1);
      await expect(drawer.getByRole('definition').nth(2)).toHaveText(english ? 'Expired' : 'Expirat');
      await expect(drawer.getByRole('button', {name: english ? 'Replace document' : 'Înlocuiește document', exact: true})).toBeDisabled();
      await drawer.getByRole('button', {name: english ? 'Back to document history' : 'Înapoi la istoricul documentului'}).click();
      await expect(versions).toHaveCount(2);
      await drawer.getByRole('button', {name: english ? 'Back to document details' : 'Înapoi la detalii document'}).click();
      await expect(preview).toHaveCount(2);
      await expect(drawer.getByRole('definition').nth(2)).toHaveText('Valid');
      expect(page.url()).toBe(entryURL);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await close(page, english);
      const summary = page.getByRole('region', {name: english ? 'Document summary' : 'Rezumat documente'});
      for (const [status, count] of [['total', 24], ['review', 4], ['valid', 14], ['expiring', 4]] as const) {
        await expect(summary.locator(`[data-status="${status}"] b`)).toHaveText(String(count));
      }
      const row = page.getByRole('row', {name: /Autorizatie_ISU.pdf/});
      await expect(row).toHaveCount(1);
      await expect(row.locator('time[datetime="2027-05-03"]')).toBeVisible();
      await expect(row.locator('[data-status="valid"]').last()).toBeVisible();
      await sidebar(page, english, english ? 'Suppliers' : 'Furnizori');
      const vendor = page.locator('[data-vendor-id="construct-pro"]');
      await expect(vendor).toContainText('3/5');
      await expect(vendor.locator('time')).toHaveAttribute('datetime', '2027-02-10');
      await vendor.getByRole('link').click();
      await expect(page.locator('[data-vendor-status]')).toHaveAttribute('data-compliance', 'attention');
      const isu = page.locator('[data-requirement-id="vendor-requirement:construct-pro:fire"]');
      await expect(isu).toContainText('Valid');
      await isu.getByRole('link', {name: english ? 'Fire safety authorization' : 'Autorizație ISU', exact: true}).click();
      await expect(drawer.locator('[data-preview-version]')).toHaveCount(2);
      await close(page, english);
      await sidebar(page, english, english ? 'Notifications' : 'Notificări');
      await expect(page.locator('#expiring-section tbody tr').filter({hasText: 'Construct Pro SRL'})).toHaveCount(0);
    });
  }

  test(`${english ? 'EN' : 'RO'} direct details retain all compliance states and the pending-review entry point`, async ({page}) => {
    for (const [id, status] of [
      [registration, 'Valid'],
      ['global-clean-insurance-2024', english ? 'Expiring soon' : 'Expiră curând'],
      ['logistics-expert-tax-2023', english ? 'Expired' : 'Expirat'],
      ['construct-pro-tax-2024', english ? 'Needs review' : 'Necesită revizuire']
    ]) {
      await page.goto(`${prefix}/documents?document=${id}`);
      const drawer = page.getByRole('dialog', {name: english ? 'Document details' : 'Detalii document'});
      await expect(drawer.getByRole('term')).toHaveCount(6);
      await expect(drawer.getByRole('definition').nth(2)).toHaveText(status);
      await expect(drawer.getByRole('definition').nth(2).locator('svg')).toHaveCount(1);
      await expect(drawer.getByRole('definition').nth(2).locator('span[aria-hidden]')).toHaveCount(0);
      await expect(drawer.getByRole('button', {name: english ? 'Download' : 'Descarcă'})).toBeDisabled();
      await expect(drawer.getByRole('link', {name: english ? 'Review document' : 'Revizuiește documentul'})).toHaveCount(id === 'construct-pro-tax-2024' ? 1 : 0);
    }
    await page.getByRole('dialog').getByRole('link', {name: english ? 'Review document' : 'Revizuiește documentul'}).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/documents/construct-pro-tax-2024/review$`));
    await expect(page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'})).toBeEnabled();
  });

  test(`${english ? 'EN' : 'RO'} names and menus share details and review, with separate requirement actions`, async ({page}) => {
    await page.goto(`${prefix}/documents`);
    const row = page.getByRole('row', {name: /ONRC_2024.pdf/});
    const name = row.getByRole('link', {name: english ? 'Registration certificate' : 'Certificat de înregistrare', exact: true});
    await name.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', {name: english ? 'Document details' : 'Detalii document'})).toContainText('ONRC_2024.pdf');
    await expect(page.getByRole('dialog').getByRole('button', {name: english ? 'Download' : 'Descarcă'})).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(name).toBeFocused();
    await row.getByRole('button').click();
    await expect(page.getByRole('menuitem')).toHaveCount(5);
    const unavailableDownload = page.getByRole('menuitem', {name: english ? 'Download' : 'Descarcă'});
    await expect(unavailableDownload).toBeDisabled();
    await expect(unavailableDownload).toHaveCSS('color', 'rgb(107, 125, 155)');
    await unavailableDownload.hover();
    await expect(unavailableDownload).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.getByRole('menuitem', {name: english ? 'Open vendor' : 'Deschide furnizor'})).toHaveAttribute('href', `${prefix}/vendors/construct-pro`);
    await page.getByRole('menuitem', {name: english ? 'Open vendor' : 'Deschide furnizor'}).click();
    const pending = page.locator('[data-requirement-id="vendor-requirement:construct-pro:tax"]');
    await pending.getByRole('link', {name: english ? 'Tax certificate' : 'Certificat fiscal', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/documents/construct-pro-tax-2024/review$`));
    await expect(page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'})).toBeEnabled();
    await page.goBack();
    const valid = page.locator('[data-requirement-id="vendor-requirement:construct-pro:registration"]');
    await valid.getByRole('link', {name: english ? 'Registration certificate' : 'Certificat de înregistrare', exact: true}).click();
    await expect(page.getByRole('dialog', {name: english ? 'Document details' : 'Detalii document'})).toContainText('ONRC_2024.pdf');
    await close(page, english);
    await valid.getByRole('button', {name: english ? /^Document actions/ : /^Acțiuni document/}).click();
    await expect(page.getByRole('menuitem')).toHaveCount(4);
    await expect(page.getByRole('menuitem', {name: english ? 'Open vendor' : 'Deschide furnizor'})).toHaveCount(0);
    await expect(page.getByRole('menuitem', {name: english ? 'Remove requirement' : 'Elimină cerința'})).toHaveCount(0);
    await page.keyboard.press('Escape');
    const missing = page.locator('[data-requirement-id="vendor-requirement:construct-pro:iso"]');
    await expect(missing.getByRole('link')).toHaveCount(0);
    await expect(missing.getByRole('button', {name: english ? 'Upload' : 'Încarcă', exact: true})).toBeVisible();
    await expect(missing.getByRole('button', {name: english ? /^Document actions/ : /^Acțiuni document/})).toHaveCount(0);
    await sidebar(page, english, english ? 'Documents' : 'Documente');
    await page.getByRole('row', {name: /Certificat_fiscal_CP_2024.pdf/}).getByRole('button').click();
    await page.getByRole('menuitem', {name: english ? 'Open details' : 'Deschide detalii'}).click();
    await expect(page).toHaveURL(/\/documents\/construct-pro-tax-2024\/review$/);
  });

  test(`${english ? 'EN' : 'RO'} renewal retains history, actual downloads and current-only projections across client navigation`, async ({page}) => {
    await page.goto(`${prefix}/documents`);
    const row = page.getByRole('row', {name: /ONRC_2024.pdf/});
    await row.getByRole('button').click();
    await page.getByRole('menuitem', {name: english ? 'Replace / renew' : 'Înlocuiește / reînnoiește'}).click();
    await renew(page, english, '01.01.2099');
    await expect(page.getByRole('dialog')).toContainText('Valid');
    const id = new URL(page.url()).searchParams.get('document')!;
    expect(id).not.toBe(registration);
    await close(page, english);
    await expect(page.getByRole('button', {name: english ? 'All documents 24' : 'Toate documentele 24', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: english ? 'Needs review 4' : 'Necesită revizuire 4', exact: true})).toBeVisible();
    await expect(page.getByRole('row', {name: /ONRC_2024.pdf/})).toHaveCount(0);
    const renewedRow = page.getByRole('row', {name: /renewed.pdf/});
    await renewedRow.getByRole('button').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', {name: english ? 'Download' : 'Descarcă'}).click();
    const downloaded = await downloadPromise;
    expect(downloaded.suggestedFilename()).toBe('renewed.pdf');
    expect(await readFile((await downloaded.path())!, 'utf8')).toBe(file.buffer.toString());
    await renewedRow.getByRole('button').click();
    await page.getByRole('menuitem', {name: english ? 'View history' : 'Vezi istoricul'}).click();
    await expect(page.locator('[data-version]')).toHaveCount(2);
    await expect(page.locator('[data-version-state="current"]')).toContainText(english ? 'Internal update — no review' : 'Actualizare internă — fără revizuire');
    await expect(page.locator('[data-version-state="superseded"]')).toContainText(english ? 'Approved' : 'Aprobată');
    await expect(page.locator('[data-version-state="superseded"]')).not.toContainText(english ? 'Valid until:' : 'Valabilă:');
    await expect(page.getByRole('dialog')).not.toContainText(/renewed.pdf|ONRC_2024.pdf/);
    await openVersionDetails(page, english, 1);
    await expect(page.getByRole('dialog', {name: english ? 'Document details' : 'Detalii document'})).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('ONRC_2024.pdf');
    await expect(page.getByRole('dialog').getByRole('button', {name: english ? 'Replace document' : 'Înlocuiește document', exact: true})).toBeDisabled();
    await page.getByRole('dialog').getByRole('button', {name: english ? 'Back to document history' : 'Înapoi la istoricul documentului'}).click();
    await expect(page.locator('[data-version-state="superseded"]')).toContainText(english ? 'Approved' : 'Aprobată');
    await page.getByRole('dialog').getByRole('button', {name: english ? 'Back to document details' : 'Înapoi la detalii document'}).click();
    await expect(page.getByRole('dialog')).toContainText('renewed.pdf');
    await close(page, english);
    await sidebar(page, english, english ? 'Suppliers' : 'Furnizori');
    await page.getByRole('link', {name: english ? 'Details for Construct Pro SRL' : 'Detalii pentru Construct Pro SRL'}).click();
    const vendorRow = page.locator('[data-requirement-id="vendor-requirement:construct-pro:registration"]');
    await vendorRow.getByRole('button', {name: english ? /^Document actions/ : /^Acțiuni document/}).click();
    await page.getByRole('menuitem', {name: english ? 'Replace / renew' : 'Înlocuiește / reînnoiește'}).click();
    await renew(page, english, '01.10.2026', 'expired-renewal.pdf');
    await expect(page.getByRole('dialog')).toContainText(english ? 'Expired' : 'Expirat');
    await close(page, english);
    await expect(page.locator('[data-vendor-status]')).toHaveAttribute('data-compliance', 'noncompliant');
    await expect(vendorRow).toContainText(english ? 'Expired' : 'Expirat');
    await page.getByRole('tab', {name: english ? 'Activity' : 'Activitate', exact: true}).click();
    await expect(page.locator('[data-event-type="document_replaced"]')).toHaveCount(2);
    await expect(page.locator('[data-event-type="document_replaced"]').first()).toContainText('Andrei Popescu');
    await sidebar(page, english, english ? 'Notifications' : 'Notificări');
    await expect(page.locator('[data-audit-id^="local-audit-"]').filter({hasText: english ? 'Document replaced / renewed' : 'Document înlocuit / reînnoit'})).toHaveCount(2);
    await sidebar(page, english, 'Dashboard');
    await expect(page.getByRole('row', {name: english ? /Construct Pro SRL Registration certificate Expired/ : /Construct Pro SRL Certificat de înregistrare Expirat/})).toHaveCount(1);
  });

  for (const vendorContext of [false, true]) {
    test(`${english ? 'EN' : 'RO'} canonical details and historical Back preserve the ${vendorContext ? 'Vendor Details' : 'Documents'} context`, async ({page}) => {
      const width = vendorContext ? 375 : 1448;
      await page.setViewportSize({width, height: vendorContext ? 812 : 1086});
      await page.goto(`${prefix}/documents`);
      let filename = 'ONRC_2024.pdf';
      let currentId = registration;
      for (const version of [2, 3, 4]) {
        await page.getByRole('row', {name: new RegExp(filename)}).getByRole('button').click();
        await page.getByRole('menuitem', {name: english ? 'Replace / renew' : 'Înlocuiește / reînnoiește'}).click();
        filename = `certificate-v${version}.pdf`;
        await renew(page, english, '01.01.2099', filename);
        currentId = new URL(page.url()).searchParams.get('document')!;
        await close(page, english);
      }
      if (vendorContext) {
        await sidebar(page, english, english ? 'Suppliers' : 'Furnizori');
        await page.getByRole('link', {name: english ? 'Details for Construct Pro SRL' : 'Detalii pentru Construct Pro SRL'}).click();
      }
      const row = page.getByRole('row', {name: /certificate-v4.pdf/});
      const trigger = row.getByRole('link', {name: english ? 'Registration certificate' : 'Certificat de înregistrare', exact: true});
      await trigger.click();
      const drawer = page.getByRole('dialog');
      await expect(drawer).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`document=${currentId}$`));
      const selectedUrl = page.url();
      const originalDrawer = await drawer.elementHandle();
      expect(await drawer.getByRole('term').allTextContents()).toEqual(english
        ? ['Name', 'Requirement', 'Compliance status', 'Expiry date', 'Uploaded at', 'Uploaded by']
        : ['Nume', 'Cerință', 'Status conformitate', 'Dată expirare', 'Încărcat la', 'Încărcat de']);
      await expect(drawer).not.toContainText('Renewal-42');
      await expect(drawer.locator('[data-preview-version]')).toHaveCount(3);
      await expect(drawer.getByText(english ? 'Current' : 'Curent', {exact: true})).toHaveCount(1);
      await expect(drawer.getByRole('button', {name: english ? 'Mark as expired' : 'Marchează ca expirată'})).toBeDisabled();
      await expect(drawer.getByRole('button', {name: english ? 'Delete document' : 'Șterge document'})).toBeDisabled();
      expect((await drawer.boundingBox())?.width).toBe(width === 1448 ? 804 : width);
      await drawer.getByRole('button', {name: english ? 'View all' : 'Vezi toate'}).click();
      await expect(drawer.getByRole('heading', {name: english ? 'Document history' : 'Istoric document'})).toBeFocused();
      await expect(drawer.locator('[data-version]')).toHaveCount(4);
      const historical = drawer.locator('[data-version="3"]');
      await expect(historical).toContainText(english ? 'Valid until: 01 Jan 2099' : 'Valabilă: 01 ian. 2099');
      const historicalDownload = page.waitForEvent('download');
      await historical.getByRole('button', {name: english ? 'Download' : 'Descarcă', exact: true}).click();
      const downloaded = await historicalDownload;
      expect(downloaded.suggestedFilename()).toBe('certificate-v3.pdf');
      expect(await readFile((await downloaded.path())!, 'utf8')).toBe(file.buffer.toString());
      expect(await drawer.evaluate((element, original) => element === original, originalDrawer)).toBe(true);
      await expect(page).toHaveURL(selectedUrl);
      await expect(drawer).not.toContainText(/certificate-v\d.pdf|ONRC_2024.pdf/);
      if (vendorContext) await page.setViewportSize({width, height: 400});
      const versionMenu = drawer.locator('[data-version="1"]').getByRole('button', {name: english ? 'Actions for version 1' : 'Acțiuni pentru versiunea 1'});
      await versionMenu.scrollIntoViewIfNeeded(); await versionMenu.focus();
      const historyScroll = await drawer.evaluate((element) => element.scrollTop);
      if (vendorContext) expect(historyScroll).toBeGreaterThan(0);
      await page.keyboard.press('ArrowDown');
      await expect(drawer.getByRole('menuitem', {name: english ? 'Open details' : 'Deschide detalii'})).toBeFocused();
      expect(await drawer.evaluate((element) => element.scrollTop)).toBe(historyScroll);
      await page.keyboard.press('Escape');
      await expect(drawer.getByRole('menu')).toHaveCount(0);
      await expect(drawer).toHaveAttribute('data-phase', 'open');
      await expect(versionMenu).toBeFocused();
      await openVersionDetails(page, english, 1);
      await expect(drawer).toContainText('ONRC_2024.pdf');
      const historicalBack = drawer.getByRole('button', {name: english ? 'Back to document history' : 'Înapoi la istoricul documentului'});
      await page.keyboard.press('Shift+Tab');
      await expect(historicalBack).toBeFocused();
      await expect(historicalBack).toHaveCSS('outline-width', '3px');
      await page.keyboard.press('Enter');
      await expect(drawer.locator('[data-version-state="current"]')).toContainText(english ? 'Current version' : 'Versiune curentă');
      await drawer.getByRole('button', {name: english ? 'Back to document details' : 'Înapoi la detalii document'}).click();
      await expect(drawer).toContainText('certificate-v4.pdf');
      await expect(drawer.getByRole('button', {name: english ? 'Replace document' : 'Înlocuiește document', exact: true})).toBeEnabled();
      await expect(drawer.getByRole('button', {name: /Back|Înapoi/})).toHaveCount(0);
      await expect(page).toHaveURL(selectedUrl);
      expect(await drawer.evaluate((element, original) => element === original, originalDrawer)).toBe(true);
      expect(await page.locator('main').evaluate((element) => element.parentElement!.inert)).toBe(true);
      await drawer.getByRole('button', {name: english ? 'View all' : 'Vezi toate'}).click();
      if (!vendorContext) await openVersionDetails(page, english, 1);
      await close(page, english);
      await expect(trigger).toBeFocused();
      expect(new URL(page.url()).pathname).toBe(`${prefix}${vendorContext ? '/vendors/construct-pro' : '/documents'}`);
      expect(await page.locator('main').evaluate((element) => element.parentElement!.inert)).toBe(false);
    });
  }
}

test('renews an expiring file and removes only its previous version from next expiry and Notifications', async ({page}) => {
  await page.goto('/documents?document=global-clean-insurance-2024&documentAction=replace');
  await renew(page, false, '01.01.2099', 'renewed-insurance.pdf');
  await close(page, false);
  await expect(page.getByRole('row', {name: /renewed-insurance.pdf/})).toContainText('Valid');
  await sidebar(page, false, 'Notificări');
  await expect(page.getByRole('row', {name: /Global Clean Services Poliță RCA/})).toHaveCount(0);
  await sidebar(page, false, 'Furnizori');
  await expect(page.locator('[data-vendor-id="global-clean"]')).toContainText('2099');
});

test('direct, unknown, mismatched vendor, stale company and history URLs fail safely', async ({page}) => {
  await page.goto(`/vendors/global-clean?document=${registration}`);
  await expect(page.getByRole('dialog', {name: 'Document indisponibil'})).not.toContainText('ONRC_2024.pdf');
  await close(page, false);
  await page.goto('/documents?document=unknown&documentAction=history');
  await expect(page.getByRole('dialog', {name: 'Document indisponibil'})).toBeVisible();
  await close(page, false);
  const pendingId = 'construct-pro-tax-2024';
  await page.goto(`/documents?document=${pendingId}&documentAction=history`);
  await expect(page.locator('[data-version]')).toHaveCount(1);
  await openVersionDetails(page, false, 1);
  await expect(page.getByRole('dialog', {name: 'Detalii document'})).toBeVisible();
  await page.getByRole('dialog').getByRole('link', {name: 'Revizuiește documentul'}).click();
  await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
  await page.getByRole('dialog', {name: 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
  // A client Back restores the former URL, not a new independent fixture session.
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/documents\\?document=${pendingId}&documentAction=history$`));
  await expect(page.getByText('Nu există date pentru această companie în demonstrația locală.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Certificat_fiscal_CP_2024.pdf')).toHaveCount(0);
  await page.goForward();
  await expect(page.getByText('Certificat_fiscal_CP_2024.pdf')).toHaveCount(0);
});

for (const width of [1448, 1024, 758, 600, 375, 320]) {
  test(`${width}px details, replacement, history and success remain contained and usable`, async ({page}) => {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await page.goto(`/documents?document=${registration}`);
    await expect(page.getByRole('dialog', {name: 'Detalii document'})).toBeVisible();
    await page.getByRole('dialog').getByRole('button', {name: 'Înlocuiește document', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Încarcă document', exact: true}).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Selectează un fișier.');
    await page.locator('#replace-expiresAt').fill('31.02.2027');
    await page.getByRole('dialog').getByRole('button', {name: 'Încarcă document', exact: true}).click();
    await expect(page.getByText('Introdu o dată validă în format DD.MM.YYYY.')).toBeVisible();
    await renew(page, false, '01.01.2099');
    await close(page, false);
    await page.getByRole('row', {name: /renewed.pdf/}).getByRole('button').click();
    await page.getByRole('menuitem', {name: 'Vezi istoricul'}).click();
    await expect(page.locator('[data-version]')).toHaveCount(2);
    const geometry = await page.getByRole('dialog').evaluate((element) => ({width: element.clientWidth, scroll: element.scrollWidth, page: document.documentElement.scrollWidth}));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
    expect(geometry.page).toBeLessThanOrEqual(width);
    await page.getByRole('dialog').getByRole('button', {name: 'Înapoi la detalii document'}).click();
    await expect(page.getByRole('dialog', {name: 'Detalii document'})).toContainText('renewed.pdf');
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('row', {name: /renewed.pdf/}).getByRole('button')).toBeFocused();
  });
}
