import {expect, test, type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createDocumentFixtureFile} from '../src/features/documents/fixture-files';
import {fixtureReferenceTime} from '../src/lib/fixture-clock';

const isu = 'construct-pro-fire-2024';
const requirement = 'vendor-requirement:construct-pro:fire';
async function sidebar(page: Page, english: boolean, section: string) {
  await page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: new RegExp(`^${section}(?: \\d+)?$`)}).click();
}
async function open(page: Page, english: boolean) {
  await page.getByRole('link', {name: english ? 'Fire safety authorization' : 'Autorizație ISU', exact: true}).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}
async function close(page: Page, english: boolean) {
  await page.getByRole('dialog').getByRole('button', {name: english ? 'Close' : 'Închide', exact: true}).first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function expire(page: Page, english: boolean) {
  await page.getByRole('dialog').getByRole('button', {name: english ? 'Mark as expired' : 'Marchează ca expirat', exact: true}).click();
  await page.getByRole('alertdialog').getByRole('button', {name: english ? 'Mark as expired' : 'Marchează ca expirat', exact: true}).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
}
async function portal(page: Page, english: boolean) {
  await page.getByRole('button', {name: english ? 'Invite supplier' : 'Invită furnizor', exact: true}).click();
  const link = page.getByRole('dialog').getByRole('link', {name: english ? /Preview upload page/ : /Previzualizează pagina de încărcare/});
  await link.evaluate((element) => element.removeAttribute('target'));
  await link.click();
  await expect(page).toHaveURL(/\/upload\/demo-construct-pro$/);
}

for (const english of [false, true]) for (const width of [1448, 375]) {
  test(`${english ? 'EN' : 'RO'} ${width}px manual expiry confirms, propagates, persists and retains downloadable versions after renewal`, async ({page}) => {
    const prefix = english ? '/en' : '';
    const expiredLabel = english ? 'Expired' : 'Expirat';
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    // Satisfy the pending required tax file first, so ISU expiry alone changes vendor compliance.
    await page.goto(`${prefix}/documents/construct-pro-tax-2024/review`);
    await page.locator('#review-expiresAt').fill('01.01.2099');
    await page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'}).click();
    await page.getByRole('link', {name: english ? 'Back to documents' : 'Înapoi la documente'}).click();
    const summary = page.getByRole('region', {name: english ? 'Document summary' : 'Rezumat documente'});
    const validBefore = Number(await summary.locator('[data-status="valid"] b').textContent());
    await open(page, english);
    const drawer = page.getByRole('dialog');
    const heading = drawer.getByRole('heading', {name: english ? 'Document details' : 'Detalii document', exact: true});
    const metadataDate = await drawer.getByRole('definition').nth(3).textContent();
    await expect(drawer.locator('[data-preview-version]')).toHaveCount(2);
    await expect(drawer.getByRole('button', {name: /Delete document|Șterge document/})).toHaveCount(0);
    const mark = drawer.getByRole('button', {name: english ? 'Mark as expired' : 'Marchează ca expirat', exact: true});
    await mark.click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toHaveAccessibleName(english ? 'Mark this document as expired?' : 'Marchezi documentul ca expirat?');
    await expect(confirmation).toContainText(english ? 'The document will remain available in history, but will no longer be considered valid. The supplier\'s status may be updated.' : 'Documentul va rămâne disponibil în istoric, dar nu va mai fi considerat valid. Statusul furnizorului poate fi actualizat.');
    await expect(confirmation.getByRole('button', {name: english ? 'Cancel' : 'Anulează'})).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(confirmation.getByRole('button', {name: english ? 'Mark as expired' : 'Marchează ca expirat'})).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(confirmation.getByRole('button', {name: english ? 'Cancel' : 'Anulează'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(confirmation).toHaveCount(0); await expect(mark).toBeFocused();
    await expect(drawer.getByRole('definition').nth(2)).toHaveText('Valid');
    await mark.click(); await confirmation.getByRole('button', {name: english ? 'Cancel' : 'Anulează'}).click();
    await expect(mark).toBeFocused();
    await mark.click();
    await confirmation.getByRole('button', {name: english ? 'Mark as expired' : 'Marchează ca expirat'}).focus();
    await page.keyboard.press('Enter');
    await expect(confirmation).toHaveCount(0); await expect(heading).toBeFocused();
    await expect(drawer.getByRole('definition').nth(2)).toHaveText(expiredLabel);
    await expect(drawer.getByRole('definition').nth(3)).toHaveText(metadataDate!);
    await expect(mark).toHaveCount(0);
    await expect(drawer.getByRole('button', {name: english ? 'Replace document' : 'Înlocuiește document', exact: true})).toBeEnabled();
    await expect(drawer.locator('[data-preview-version]')).toHaveCount(2);
    await expect(page).toHaveURL(new RegExp(`document=${isu}$`));
    const download = page.waitForEvent('download');
    await drawer.getByRole('button', {name: english ? 'Download' : 'Descarcă', exact: true}).click();
    const saved = await download;
    const originalBytes = Buffer.from(await createDocumentFixtureFile({id: isu, filename: 'Autorizatie_ISU.pdf', version: 2, createdAt: '2026-09-29T12:00:00Z'}).arrayBuffer());
    expect(saved.suggestedFilename()).toBe('Autorizatie_ISU.pdf'); expect(await readFile((await saved.path())!)).toEqual(originalBytes);
    await close(page, english);
    await expect(summary.locator('[data-status="valid"] b')).toHaveText(String(validBefore - 1));
    await expect(page.getByRole('row', {name: /Autorizatie_ISU.pdf/})).toContainText(expiredLabel);
    // Locale navigation must reuse the same session rather than construct locale-specific state.
    await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).click();
    await expect(page.getByRole('row', {name: /Autorizatie_ISU.pdf/})).toContainText(english ? 'Expirat' : 'Expired');
    await page.getByRole('link', {name: english ? 'EN' : 'RO', exact: true}).click();
    await sidebar(page, english, english ? 'Suppliers' : 'Furnizori');
    await expect(page.locator('[data-vendor-id="construct-pro"] td').nth(2)).toHaveText(english ? 'Noncompliant' : 'Neconform');
    await page.getByRole('link', {name: english ? 'Details for Construct Pro SRL' : 'Detalii pentru Construct Pro SRL'}).click();
    await expect(page.locator('[data-vendor-status]')).toHaveAttribute('data-compliance', 'noncompliant');
    await expect(page.locator(`[data-requirement-id="${requirement}"]`)).toContainText(expiredLabel);
    await open(page, english);
    await expect(drawer.getByRole('definition').nth(2)).toHaveText(expiredLabel);
    await drawer.getByRole('button', {name: english ? 'View all' : 'Vezi toate'}).click();
    await expect(drawer.locator('[data-version]')).toHaveCount(2);
    await expect(drawer.locator('[data-version-state="current"]')).toHaveAttribute('data-version', '2');
    await expect(drawer.locator('[data-version="2"]')).toContainText(english ? 'Manually expired' : 'Expirat manual');
    await close(page, english);
    await page.getByRole('tab', {name: english ? 'Activity' : 'Activitate', exact: true}).click();
    const event = page.locator('[data-event-type="document_marked_expired"]');
    await expect(event).toHaveCount(1); await expect(event).toContainText('Andrei Popescu');
    await expect(event.locator('time')).toHaveAttribute('datetime', fixtureReferenceTime);
    await portal(page, english);
    await expect(page.locator(`[data-document-id="${requirement}"]`)).toContainText(english ? 'Missing' : 'Lipsește');
    await expect(page.locator(`[data-document-id="${requirement}"] input[type=file]`)).toHaveCount(1);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
    await page.goBack();
    await sidebar(page, english, english ? 'Notifications' : 'Notificări');
    const audit = page.locator('[data-audit-id^="local-audit-"]').filter({hasText: english ? 'Document marked as expired' : 'Document marcat ca expirat'});
    await expect(audit).toHaveCount(1); await expect(audit).toContainText('Andrei Popescu');
    await sidebar(page, english, english ? 'Documents' : 'Documente');
    await expect(page).toHaveURL(`${prefix}/documents`);
    await expect(page.getByRole('row', {name: /Autorizatie_ISU.pdf/})).toContainText(expiredLabel);
    // Company switch/return cannot lose the original company's current version or leak it.
    await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
    await page.locator('[data-company-switch-id="global-clean-services"]').click();
    await expect(page.getByRole('row', {name: /Autorizatie_ISU.pdf/})).toHaveCount(0);
    await page.getByRole('button', {name: 'Global Clean Services', exact: true}).click();
    await page.locator('[data-company-switch-id="demo-company"]').click();
    await open(page, english); await expect(drawer.getByRole('definition').nth(2)).toHaveText(expiredLabel);
    await drawer.getByRole('button', {name: english ? 'Replace document' : 'Înlocuiește document', exact: true}).click();
    await drawer.locator('input[type=file]').setInputFiles({name: 'after-expiry-v3.pdf', mimeType: 'application/pdf', buffer: Buffer.from('new internal version bytes')});
    await drawer.locator('#replace-expiresAt').fill('01.01.2099');
    await drawer.getByRole('button', {name: english ? 'Upload document' : 'Încarcă document', exact: true}).click();
    await expect(page.getByRole('dialog', {name: english ? 'Document uploaded successfully' : 'Document încărcat cu succes'})).toContainText('Valid');
    await close(page, english); await open(page, english);
    await expect(drawer.getByRole('definition').nth(2)).toHaveText('Valid');
    await expect(drawer.getByRole('button', {name: english ? 'Mark as expired' : 'Marchează ca expirat'})).toBeEnabled();
    await drawer.getByRole('button', {name: english ? 'View all' : 'Vezi toate'}).click();
    await expect(drawer.locator('[data-version]')).toHaveCount(3);
    await expect(drawer.locator('[data-version-state="current"]')).toHaveAttribute('data-version', '3');
    const old = drawer.locator('[data-version="2"]');
    await expect(old).toHaveAttribute('data-version-state', 'superseded');
    await expect(old).toContainText(english ? 'Manually expired' : 'Expirat manual');
    await expect(old.locator('[data-tone="danger"]')).toHaveCount(1);
    const historicalDownload = page.waitForEvent('download');
    await old.getByRole('button', {name: english ? 'Download' : 'Descarcă'}).click();
    expect(await readFile((await (await historicalDownload).path())!)).toEqual(originalBytes);
    await expect(drawer.locator('[data-version="1"]')).toContainText(english ? 'Approved' : 'Aprobată');
    const containment = await drawer.evaluate((element) => ({scroll: element.scrollWidth, width: element.clientWidth, page: document.documentElement.scrollWidth}));
    expect(containment.scroll).toBeLessThanOrEqual(containment.width); expect(containment.page).toBeLessThanOrEqual(width);
  });
}

for (const english of [false, true]) {
  test(`${english ? 'EN' : 'RO'} supplier re-upload after manual expiry retains evidence and enters the existing review flow`, async ({page}) => {
    await page.setViewportSize({width: 320, height: 812});
    await page.goto(`${english ? '/en' : ''}/vendors/construct-pro`);
    await open(page, english); await expire(page, english); await close(page, english);
    await portal(page, english);
    const supplierRow = page.locator(`[data-document-id="${requirement}"]`);
    await supplierRow.locator('input[type=file]').setInputFiles({name: 'supplier-after-expiry.pdf', mimeType: 'application/pdf', buffer: Buffer.from('supplier new evidence')});
    await expect(supplierRow).toContainText(english ? 'In review' : 'În review');
    await expect(supplierRow).toContainText('supplier-after-expiry.pdf');
    await page.goBack();
    const current = page.locator(`[data-requirement-id="${requirement}"]`);
    await expect(current).toContainText(english ? 'Needs review' : 'Necesită revizuire');
    await current.locator('a[href*="/review"]').click();
    await expect(page).toHaveURL(/\/documents\/local-document-[^/]+\/review$/);
    await page.getByRole('link', {name: english ? 'Back to documents' : 'Înapoi la documente'}).click();
    await page.getByRole('row', {name: /supplier-after-expiry.pdf/}).getByRole('button').click();
    await page.getByRole('menuitem', {name: english ? 'View history' : 'Vezi istoricul'}).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.locator('[data-version]')).toHaveCount(3);
    await expect(drawer.locator('[data-version-state="current"]')).toHaveAttribute('data-version', '3');
    await expect(drawer.locator('[data-version="2"]')).toContainText(english ? 'Manually expired' : 'Expirat manual');
    await expect(drawer.locator('[data-version="2"]')).toHaveAttribute('data-version-state', 'superseded');
  });
}
