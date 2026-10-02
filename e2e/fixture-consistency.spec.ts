import {expect, test, type Page} from '@playwright/test';
import {fixtureReferenceTime} from '../src/lib/fixture-clock';

async function navigate(page: Page, english: boolean, section: string) {
  await page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: new RegExp(`^${section}(?: \\d+)?$`)}).click();
}

for (const english of [false, true]) {
  test(`${english ? 'EN' : 'RO'} fixture aggregates, expiry labels and review transitions share one current source`, async ({page}) => {
    await page.clock.setFixedTime(new Date(fixtureReferenceTime));
    await page.setViewportSize({width: english ? 375 : 1448, height: english ? 812 : 1086});
    await page.goto(`${english ? '/en' : ''}/documents`);
    const summary = page.getByRole('region', {name: english ? 'Document summary' : 'Rezumat documente'});
    for (const [status, count] of [['total', 24], ['review', 4], ['valid', 14], ['expiring', 4]] as const) {
      await expect(summary.locator(`[data-status="${status}"] b`)).toHaveText(String(count));
    }
    await page.getByRole('button', {name: english ? 'Needs review 4' : 'Necesită revizuire 4', exact: true}).click();
    await expect(page.locator('tbody tr')).toHaveCount(4);
    await page.getByRole('link', {name: english ? 'Review Tax certificate for Construct Pro SRL' : 'Revizuiește Certificat fiscal pentru Construct Pro SRL'}).first().click();
    await expect(page.locator('#review-issuedAt')).toHaveValue('01.10.2026');
    await expect(page.locator('#review-expiresAt')).toHaveValue('07.10.2026');
    await page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'}).click();
    await page.getByRole('link', {name: english ? 'Back to documents' : 'Înapoi la documente'}).click();
    await expect(summary.locator('[data-status="expiring"] b')).toHaveText('5');
    await expect(summary.getByRole('button', {name: english ? 'Needs review: 3' : 'Necesită revizuire: 3', exact: true})).toBeVisible();
    await navigate(page, english, english ? 'Suppliers' : 'Furnizori');
    const vendor = page.locator('[data-vendor-id="construct-pro"]');
    await expect(vendor).toContainText('4/5');
    await expect(vendor.locator('time')).toHaveAttribute('datetime', '2026-10-07');
    await vendor.getByRole('link').click();
    const tax = page.locator('[data-requirement-id="vendor-requirement:construct-pro:tax"]');
    await expect(tax).toContainText(english ? 'In 5 days' : 'În 5 zile');
    await navigate(page, english, english ? 'Notifications' : 'Notificări');
    await page.locator('#expiring-section').getByRole('button', {name: english ? 'View all' : 'Vezi toate'}).click();
    const expiry = page.locator('#expiring-section tbody tr').filter({hasText: 'Construct Pro SRL'});
    await expect(expiry.locator('time')).toHaveAttribute('datetime', '2026-10-07');
    await expect(expiry).toContainText(english ? '5 days' : '5 zile');
    const missing = page.locator('#missing-section tbody tr');
    await expect(missing).toHaveCount(1);
    await expect(missing).toContainText('ISO 9001');
    await expect(missing.locator('td').nth(3)).toHaveText('—');
    await expect(page.locator('[data-audit-id^="local-audit-"]').filter({hasText: english ? 'Document confirmed' : 'Document confirmat'})).toHaveCount(1);
    await expect(page.locator('#recent-section tbody tr[data-notification-id^="local-audit-"]').filter({hasText: english ? 'Document confirmed' : 'Document confirmat'})).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(english ? 375 : 1448);
  });
}
