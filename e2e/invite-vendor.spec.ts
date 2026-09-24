import {expect, test, type Page} from '@playwright/test';

const detailsPath = '/vendors/construct-pro';
const title = 'Invită furnizorul să încarce documentele';

async function openDrawer(page: Page) {
  await page.getByRole('button', {name: 'Invită furnizor'}).click();
  const dialog = page.getByRole('dialog', {name: title});
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((element) => Math.round(element.getBoundingClientRect().right))).toBe(page.viewportSize()!.width);
  return dialog;
}

test('keeps Vendor Details behind the right-hand drawer and restores focus on X, Cancel, and Escape', async ({page}) => {
  await page.goto(detailsPath);
  await page.evaluate(() => window.scrollTo(0, 380));
  const before = await page.evaluate(() => ({scrollY: window.scrollY, heading: document.querySelector('#vendor-details-title')!.getBoundingClientRect().x}));
  for (const close of ['X', 'Cancel', 'Escape']) {
    const dialog = await openDrawer(page);
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toContain('slideIn');
    expect(await page.evaluate(() => document.querySelector('main')?.parentElement?.inert)).toBe(true);
    await expect(page.locator('#vendor-details-title')).toContainText('Construct Pro SRL');
    await expect(page.getByRole('heading', {name: 'Bun venit, Andrei!'})).toHaveCount(0);
    expect(await dialog.evaluate((element) => ({right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, viewportHeight: innerHeight}))).toEqual({right: 1448, width: 502, height: 1086, viewportHeight: 1086});
    if (close === 'X') await dialog.getByRole('button', {name: 'Închide invitația'}).click();
    else if (close === 'Cancel') await dialog.getByRole('button', {name: 'Anulează'}).click();
    else await page.keyboard.press('Escape');
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toContain('slideOut');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Invită furnizor'})).toBeFocused();
    expect(await page.evaluate(() => ({scrollY: window.scrollY, heading: document.querySelector('#vendor-details-title')!.getBoundingClientRect().x}))).toEqual(before);
    await expect(page).toHaveURL(/\/vendors\/construct-pro$/);
  }
});

test('validates locally, updates toggles and counter, and never claims an email was sent', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(detailsPath);
  const dialog = await openDrawer(page);
  await expect(dialog.getByRole('textbox', {name: /Numele furnizorului/})).toHaveValue('Construct Pro SRL');
  await expect(dialog.getByRole('textbox', {name: /Email de contact/})).toHaveValue('ion.popescu@scconstruct.ro');
  await expect(dialog.getByRole('textbox', {name: /Link de încărcare securizat/})).toHaveValue('https://debiro.ro/upload/demo-construct-pro');
  await dialog.getByRole('textbox', {name: /Numele furnizorului/}).fill('');
  await dialog.getByRole('textbox', {name: /Email de contact/}).fill('invalid');
  await dialog.getByRole('button', {name: 'Trimite invitația'}).click();
  await expect(dialog.getByText('Introdu numele furnizorului.')).toBeVisible();
  await expect(dialog.getByText('Introdu o adresă de email validă.')).toBeVisible();
  await dialog.getByRole('textbox', {name: /Numele furnizorului/}).fill('Construct Pro SRL');
  await dialog.getByRole('textbox', {name: /Email de contact/}).fill('ion.popescu@scconstruct.ro');
  await dialog.getByRole('textbox', {name: /Mesaj personalizat/}).fill('Test local');
  await expect(dialog.getByText('10/500')).toBeVisible();
  await dialog.getByRole('textbox', {name: /Mesaj personalizat/}).fill('x'.repeat(501));
  await expect(dialog.getByText('500/500')).toBeVisible();
  await dialog.getByRole('combobox', {name: /Valabilitate link/}).selectOption('7');
  await expect(dialog.getByText('Linkul va expira la 19 feb. 2025.')).toBeVisible();
  await dialog.getByRole('checkbox', {name: /Trimite email acum/}).uncheck();
  await dialog.getByRole('checkbox', {name: /Notifică-mă la încărcare/}).uncheck();
  await expect(dialog.getByRole('checkbox', {name: /Trimite email acum/})).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', {name: /Notifică-mă la încărcare/})).not.toBeChecked();
  await dialog.getByRole('button', {name: 'Copiază'}).click();
  await expect(dialog.getByRole('button', {name: 'Copiat'})).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://debiro.ro/upload/demo-construct-pro');
  await dialog.getByRole('button', {name: 'Trimite invitația'}).click();
  await expect(dialog.getByRole('status')).toContainText('invitația nu a fost trimisă');
});

test('traps focus and keeps the drawer usable at required widths', async ({page}) => {
  await page.goto(detailsPath);
  for (const width of [1448, 1024, 801, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : 768});
    const dialog = await openDrawer(page);
    const geometry = await dialog.evaluate((element) => ({left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, height: element.getBoundingClientRect().height, scrollHeight: element.scrollHeight, viewport: innerWidth, viewportHeight: innerHeight, documentWidth: document.documentElement.scrollWidth}));
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width + 1);
    expect(geometry.height).toBe(geometry.viewportHeight);
    expect(geometry.documentWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    await dialog.getByRole('button', {name: 'Trimite invitația'}).scrollIntoViewIfNeeded();
    await expect(dialog.getByRole('button', {name: 'Trimite invitația'})).toBeVisible();
    await dialog.getByRole('button', {name: 'Trimite invitația'}).focus();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', {name: 'Închide invitația'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
});

test('opens identically after client navigation from Vendors List and renders English', async ({page}) => {
  await page.goto(detailsPath);
  const direct = await openDrawer(page);
  const directWidth = await direct.evaluate((element) => element.getBoundingClientRect().width);
  await page.keyboard.press('Escape');
  await expect(direct).toHaveCount(0);
  await page.goto('/vendors');
  await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
  const navigated = await openDrawer(page);
  expect(await navigated.evaluate((element) => element.getBoundingClientRect().width)).toBe(directWidth);
  await expect(navigated.getByRole('textbox', {name: /Numele furnizorului/})).toHaveValue('Construct Pro SRL');
  await page.keyboard.press('Escape');
  await expect(navigated).toHaveCount(0);
  await page.goto('/en/vendors/construct-pro');
  await page.getByRole('button', {name: 'Invite supplier'}).click();
  const enDialog = page.getByRole('dialog', {name: 'Invite the supplier to upload documents'});
  await expect(enDialog).toBeVisible();
  await expect(enDialog.getByRole('textbox', {name: /Contact email/})).toHaveValue('ion.popescu@scconstruct.ro');
});
