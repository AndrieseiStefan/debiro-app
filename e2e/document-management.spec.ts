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

for (const english of [false, true]) {
  const prefix = english ? '/en' : '';
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
    await expect(page.locator('[data-version-state="current"]')).toContainText('renewed.pdf');
    await expect(page.locator('[data-version-state="superseded"]')).toContainText('ONRC_2024.pdf');
    await page.locator('[data-version="1"]').getByRole('button', {name: english ? 'Open details' : 'Deschide detalii'}).click();
    await expect(page.getByRole('dialog', {name: english ? 'Document details' : 'Detalii document'})).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText(english ? 'Superseded version' : 'Versiune înlocuită');
    await expect(page.getByRole('dialog').getByRole('button', {name: english ? 'Replace / renew' : 'Înlocuiește / reînnoiește'})).toHaveCount(0);
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
  await page.goto(`/documents?document=${registration}&documentAction=history`);
  await expect(page.locator('[data-version]')).toHaveCount(1);
  await page.locator('[data-version]').getByRole('button', {name: 'Deschide detalii'}).click();
  await expect(page.getByRole('dialog', {name: 'Detalii document'})).toBeVisible();
  await page.getByRole('dialog').getByRole('link', {name: 'Construct Pro SRL'}).click();
  await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
  await page.getByRole('dialog', {name: 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
  // A client Back restores the former URL, not a new independent fixture session.
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/documents\\?document=${registration}$`));
  await expect(page.getByText('Nu există date pentru această companie în demonstrația locală.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('ONRC_2024.pdf')).toHaveCount(0);
  await page.goForward();
  await expect(page.getByText('ONRC_2024.pdf')).toHaveCount(0);
});

for (const width of [1448, 1024, 758, 600, 375, 320]) {
  test(`${width}px details, replacement, history and success remain contained and usable`, async ({page}) => {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await page.goto(`/documents?document=${registration}`);
    await expect(page.getByRole('dialog', {name: 'Detalii document'})).toBeVisible();
    await page.getByRole('dialog').getByRole('button', {name: 'Înlocuiește / reînnoiește'}).click();
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
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('row', {name: /renewed.pdf/}).getByRole('button')).toBeFocused();
  });
}
