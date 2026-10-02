import {expect, test, type Page} from '@playwright/test';

async function sidebar(page: Page, english: boolean, section: string) {
  await page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: new RegExp(`^${section}(?: \\d+)?$`)}).click();
}
async function vendor(page: Page, english: boolean) {
  await sidebar(page, english, english ? 'Suppliers' : 'Furnizori');
  await page.getByRole('link', {name: english ? 'Details for Construct Pro SRL' : 'Detalii pentru Construct Pro SRL'}).click();
}
async function portal(page: Page, english: boolean) {
  await page.getByRole('button', {name: english ? 'Invite supplier' : 'Invită furnizor', exact: true}).click();
  const link = page.getByRole('dialog').getByRole('link', {name: english ? /Preview upload page/ : /Previzualizează pagina de încărcare/});
  // E1 module stores are tab-local. Exercise normal client navigation in this
  // document instead of opening an independent fixture session in a new tab.
  await link.evaluate((element) => element.removeAttribute('target'));
  await link.click();
  await expect(page).toHaveURL(/\/upload\/demo-construct-pro$/);
}
const tax = '[data-document-id="vendor-requirement:construct-pro:tax"]';
const taxRequirement = '[data-requirement-id="vendor-requirement:construct-pro:tax"]';

for (const {english, expiry, compliance, label} of [
  {english: false, expiry: '14.01.2025', compliance: 'noncompliant', label: 'Expirat'},
  {english: true, expiry: '14.02.2025', compliance: 'attention', label: 'Expiring soon'}
]) {
  test(`${english ? 'EN' : 'RO'} approval derives ${label} while supplier completion remains Uploaded`, async ({page}) => {
    await page.clock.setFixedTime(new Date('2025-01-15T12:00:00Z'));
    await page.goto(`${english ? '/en' : ''}/documents/construct-pro-tax-2024/review`);
    await page.locator('#review-expiresAt').fill(expiry);
    await page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'}).click();
    await page.getByRole('link', {name: english ? 'Back to documents' : 'Înapoi la documente'}).click();
    await expect(page.getByRole('row', {name: /Certificat_fiscal_CP_2024.pdf/})).toContainText(label);
    await expect(page.getByRole('button', {name: english ? 'Needs review 3' : 'Necesită revizuire 3', exact: true})).toBeVisible();
    await vendor(page, english);
    await expect(page.locator(taxRequirement)).toContainText(label);
    await expect(page.locator('[data-vendor-status]')).toHaveAttribute('data-compliance', compliance);
    await portal(page, english);
    await expect(page.locator(tax)).toContainText(english ? 'Uploaded' : 'Încărcat');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
  });
}

for (const {english, width} of [{english: false, width: 1448}, {english: true, width: 1448}, {english: false, width: 375}, {english: true, width: 320}]) {
  const prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} ${width}px approval propagates to Documents, Vendor Details, Supplier Portal and Audit`, async ({page}) => {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await page.goto(`${prefix}/documents/construct-pro-tax-2024/review`);
    await page.locator('#review-expiresAt').fill('01.01.2099');
    await page.locator('#review-documentNumber').fill('Confirmed-42');
    await page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'}).click();
    await expect(page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'})).toBeDisabled();
    await page.getByRole('link', {name: english ? 'Back to documents' : 'Înapoi la documente'}).click();
    await expect(page.getByRole('button', {name: english ? 'Needs review 3' : 'Necesită revizuire 3', exact: true})).toBeVisible();
    await expect(page.getByRole('row', {name: /Certificat_fiscal_CP_2024.pdf/})).toContainText(english ? 'Valid' : 'Valid');
    await page.getByRole('button', {name: english ? 'Needs review 3' : 'Necesită revizuire 3', exact: true}).click();
    await expect(page.getByRole('row', {name: /Certificat_fiscal_CP_2024.pdf/})).toHaveCount(0);
    await vendor(page, english);
    await expect(page.locator(taxRequirement)).toContainText('Valid');
    await expect(page.locator('[data-vendor-status]')).toHaveAttribute('data-compliance', 'compliant');
    await expect(page.locator('[data-vendor-status]')).toContainText(english ? '4 of 5 valid documents' : '4 din 5 documente valide');
    await page.getByRole('tab', {name: english ? 'Activity' : 'Activitate', exact: true}).click();
    await expect(page.locator('[data-event-type="document_confirmed"]')).toHaveCount(1);
    await portal(page, english);
    await expect(page.locator(tax)).toContainText(english ? 'Uploaded' : 'Încărcat');
    await expect(page.locator(tax).locator('input[type=file]')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
    await page.goBack();
    await sidebar(page, english, english ? 'Notifications' : 'Notificări');
    await expect(page.locator('[data-audit-id^="local-audit-"]').filter({hasText: english ? 'Document confirmed' : 'Document confirmat'})).toHaveCount(1);
    await page.goBack();
    await page.goBack();
    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${prefix}/documents/construct-pro-tax-2024/review$`));
    await expect(page.locator('#review-documentNumber')).toHaveValue('Confirmed-42');
    await expect(page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'})).toBeDisabled();
  });

  test(`${english ? 'EN' : 'RO'} ${width}px company switch hides foreign review and restoring the owner retains its outcome`, async ({page}) => {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await page.goto(`${prefix}/documents/construct-pro-tax-2024/review`);
    await page.locator('#review-expiresAt').fill('01.01.2099');
    await page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'}).click();
    await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
    await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
    await expect(page.locator('#review-documentNumber')).toHaveCount(0);
    await expect(page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'})).toHaveCount(0);
    await sidebar(page, english, english ? 'Documents' : 'Documente');
    await expect(page).toHaveURL(new RegExp(`${prefix}/documents$`));
    await expect(page.getByText('Construct Pro SRL')).toHaveCount(0);
    await page.getByRole('button', {name: 'Global Clean Services', exact: true}).click();
    await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Demo Company SRL/}).click();
    await expect(page.getByRole('row', {name: /Certificat_fiscal_CP_2024.pdf/})).toContainText('Valid');
    await page.goBack();
    await expect(page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'})).toBeDisabled();
  });

  test(`${english ? 'EN' : 'RO'} ${width}px confirmed rejection opens supplier replacement and the new file alone satisfies the requirement`, async ({page}) => {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await page.goto(`${prefix}/documents/construct-pro-tax-2024/review`);
    const rejectLabel = english ? 'Reject' : 'Respinge';
    await page.getByRole('button', {name: rejectLabel, exact: true}).click();
    await expect(page.getByRole('alertdialog')).toContainText(english ? 'The supplier will need to upload a new document for this requirement.' : 'Furnizorul va trebui să încarce un document nou pentru această cerință.');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('button', {name: rejectLabel, exact: true})).toBeFocused();
    await page.getByRole('button', {name: rejectLabel, exact: true}).click();
    await page.getByRole('alertdialog').getByRole('button', {name: rejectLabel, exact: true}).click();
    await expect(page.getByRole('button', {name: rejectLabel, exact: true})).toBeDisabled();
    await page.getByRole('link', {name: english ? 'Back to documents' : 'Înapoi la documente'}).click();
    await expect(page.getByRole('button', {name: english ? 'All documents 23' : 'Toate documentele 23'})).toBeVisible();
    await expect(page.getByRole('button', {name: english ? 'Needs review 3' : 'Necesită revizuire 3', exact: true})).toBeVisible();
    await expect(page.getByRole('row', {name: /Certificat_fiscal_CP_2024.pdf/})).toHaveCount(0);
    await vendor(page, english);
    await expect(page.locator(taxRequirement)).toContainText(english ? 'Missing' : 'Lipsește');
    await expect(page.locator('[data-missing-requirements]')).toHaveAttribute('data-missing-requirements', '2');
    await expect(page.locator('[data-vendor-status]')).toHaveAttribute('data-compliance', 'noncompliant');
    await page.getByRole('tab', {name: english ? 'Activity' : 'Activitate', exact: true}).click();
    await expect(page.locator('[data-event-type="document_rejected"]')).toHaveCount(1);
    await portal(page, english);
    await expect(page.locator(tax)).toContainText(english ? 'Missing' : 'Lipsește');
    await expect(page.locator(tax)).not.toContainText('Certificat_fiscal_CP_2024.pdf');
    await page.locator(tax).locator('input[type=file]').setInputFiles({name: 'Replacement_tax.pdf', mimeType: 'application/pdf', buffer: Buffer.from('local metadata only')});
    await expect(page.locator(tax)).toContainText(english ? 'In review' : 'În review');
    await expect(page.locator(tax).locator('input[type=file]')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
    await page.goBack();
    await page.getByRole('tab', {name: english ? 'Documents' : 'Documente', exact: true}).click();
    const row = page.locator(taxRequirement);
    await expect(row).toContainText(english ? 'Needs review' : 'Necesită revizuire');
    await expect(page.locator('[data-missing-requirements]')).toHaveAttribute('data-missing-requirements', '1');
    await row.getByRole('button', {name: english ? 'Actions for Tax certificate' : 'Acțiuni pentru Certificat fiscal'}).click();
    const review = page.getByRole('menuitem', {name: english ? 'Review document' : 'Revizuiește documentul'});
    const href = await review.getAttribute('href');
    expect(href).toMatch(/\/documents\/local-document-[\w-]+\/review$/);
    await review.click();
    await expect(page.locator('#review-expiresAt')).not.toHaveAttribute('required', '');
    await expect(page.getByText(english ? 'Manually entered details' : 'Date introduse manual')).toBeVisible();
    await page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'}).click();
    await page.getByRole('link', {name: english ? 'Back to documents' : 'Înapoi la documente'}).click();
    await expect(page.getByRole('row', {name: /Replacement_tax.pdf/})).toContainText('Valid');
    await expect(page.getByRole('button', {name: english ? 'Needs review 3' : 'Necesită revizuire 3', exact: true})).toBeVisible();
    await vendor(page, english);
    await expect(page.locator('[data-vendor-status]')).toHaveAttribute('data-compliance', 'compliant');
    await portal(page, english);
    await expect(page.locator(tax)).toContainText('Replacement_tax.pdf');
    await expect(page.locator(tax)).toContainText(english ? 'Uploaded' : 'Încărcat');
    await expect(page.locator(tax)).not.toContainText('Certificat_fiscal_CP_2024.pdf');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
    await page.goBack();
    await sidebar(page, english, english ? 'Notifications' : 'Notificări');
    await expect(page.locator('[data-audit-id^="local-audit-"]').filter({hasText: english ? 'Document rejected' : 'Document respins'})).toHaveCount(1);
    await expect(page.locator('[data-audit-id^="local-audit-"]').filter({hasText: english ? 'Document confirmed' : 'Document confirmat'})).toHaveCount(1);
  });
}
