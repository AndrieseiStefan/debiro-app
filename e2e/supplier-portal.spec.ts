import {expect, test} from '@playwright/test';

const fixturePath = '/upload/demo-construct-pro';

test('renders the Romanian supplier portal without authenticated navigation', async ({page}) => {
  await page.goto(fixturePath);
  await expect(page.getByRole('heading', {level: 1, name: 'Încarcă documentele companiei tale'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Documente solicitate (4)'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Încărcare securizată'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Ai nevoie de ajutor?'})).toBeVisible();
  await expect(page.locator('[data-document-id]')).toHaveCount(4);
  await expect(page.getByRole('progressbar', {name: 'Progresul documentelor'})).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'})).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByText('DEBIRO').first()).toBeVisible();
});

test('unknown token returns not found and English retains the fixture route', async ({page}) => {
  const missing = await page.goto('/upload/unknown');
  expect(missing?.status()).toBe(404);
  await page.goto('/en/upload/demo-construct-pro');
  await expect(page.getByRole('heading', {level: 1, name: 'Upload your company documents'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Requested documents (4)'})).toBeVisible();
  await page.getByRole('navigation', {name: 'Language'}).getByRole('link', {name: 'RO'}).click();
  await expect(page).toHaveURL(/\/upload\/demo-construct-pro$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Încarcă documentele companiei tale'})).toBeVisible();
});

test('validates and selects files only in the browser', async ({page}) => {
  await page.goto(fixturePath);
  const input = page.getByLabel('Încarcă document pentru Certificat fiscal');
  await input.setInputFiles({name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid')});
  await expect(page.getByText('Alege un fișier PDF, JPG sau PNG.')).toBeVisible();
  await input.setInputFiles({name: 'tax.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fixture')});
  await expect(page.locator('[data-document-id="tax"]')).toContainText('Selectat local');
  await expect(page.locator('[data-document-id="tax"]')).toContainText('tax.pdf');
  await expect(page.getByText('Fișierul este selectat doar în acest browser. Nu a fost încărcat sau trimis.')).toBeVisible();
  await expect(page.getByRole('progressbar', {name: 'Progresul documentelor'})).toHaveAttribute('aria-valuenow', '2');
  await page.reload();
  await expect(page.locator('[data-document-id="tax"]')).toContainText('În așteptare');
});

test('contains document rows, filenames, and controls at required widths', async ({page}) => {
  await page.goto(fixturePath);
  await page.getByLabel('Încarcă document pentru Certificat fiscal').setInputFiles({name: `${'very-long-document-name-'.repeat(12)}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('fixture')});
  const widths = [1448, 1024, 600, 375, 320];
  for (const width of widths) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : 768});
    await expect(page.getByRole('heading', {level: 1, name: 'Încarcă documentele companiei tale'})).toBeVisible();
    const bounds = await page.evaluate(() => ({document: document.documentElement.scrollWidth, row: document.querySelector('[data-document-id="tax"]')!.getBoundingClientRect().right}));
    expect(bounds.document, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(bounds.row, `document row escaped at ${width}px`).toBeLessThanOrEqual(width + 1);
    await expect(page.getByLabel('Încarcă document pentru Certificat fiscal')).toBeVisible();
  }
});

test('invitation preview opens the matching local portal without replacing Vendor Details', async ({page, context}) => {
  await page.goto('/vendors/construct-pro');
  await page.getByRole('button', {name: 'Invită furnizor'}).click();
  const preview = page.getByRole('dialog').getByRole('link', {name: /Previzualizează pagina de încărcare/});
  await expect(preview).toHaveAttribute('href', fixturePath);
  const [portal] = await Promise.all([context.waitForEvent('page'), preview.click()]);
  await portal.waitForLoadState();
  await expect(portal.getByRole('heading', {level: 1, name: 'Încarcă documentele companiei tale'})).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/vendors\/construct-pro$/);
});
