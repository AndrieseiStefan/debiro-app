import {expect, test} from '@playwright/test';

const route = '/documents/construct-pro-tax-2024/review';

test('renders Romanian document review and local human confirmation', async ({page}) => {
  await page.goto(route);
  await expect(page.getByRole('heading', {level: 1, name: 'Revizuiește documentul'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByText('Documente').locator('..')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('region', {name: 'Previzualizare document'}).first()).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Date extrase de AI'})).toBeVisible();
  await expect(page.getByLabel(/Numele companiei/)).toHaveValue('Construct Pro SRL');
  await page.getByLabel(/Numele companiei/).fill('Construct Pro Actualizat SRL');
  await page.getByRole('button', {name: 'Confirmă și salvează'}).click();
  await expect(page.getByRole('status')).toContainText('Date confirmate de un om, local');
  await expect(page.getByRole('status')).toContainText('Nu au fost verificate din surse oficiale');
});

test('validates required values and invalid dates before confirmation', async ({page}) => {
  await page.goto(route);
  await page.getByLabel(/Numele companiei/).fill('');
  await page.getByLabel(/Dată expirare/).fill('31.02.2025');
  await page.getByRole('button', {name: 'Confirmă și salvează'}).click();
  await expect(page.getByLabel(/Numele companiei/)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel(/Dată expirare/)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Folosește o dată validă în format ZZ.LL.AAAA.')).toBeVisible();
});

test('English route and locale navigation preserve the fixture identity and layout', async ({page}) => {
  await page.setViewportSize({width: 1448, height: 1086});
  await page.goto(route);
  const direct = await page.locator('[data-review-preview]').boundingBox();
  await page.getByRole('link', {name: 'EN', exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`/en${route}$`));
  await expect(page.getByRole('heading', {level: 1, name: 'Review document'})).toBeVisible();
  await expect(page.getByLabel(/Company name/)).toHaveValue('Construct Pro SRL');
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`${route}$`));
  const navigated = await page.locator('[data-review-preview]').boundingBox();
  expect(navigated).toEqual(direct);
});

test('unknown fixture ID is a 404 and no global Documents list is exposed', async ({page}) => {
  const response = await page.goto('/documents/not-a-fixture/review');
  expect(response?.status()).toBe(404);
  const list = await page.goto('/documents');
  expect(list?.status()).toBe(404);
});

test('preview, review controls and shell stay contained at required widths', async ({page}) => {
  await page.goto(route);
  for (const width of [1448, 1024, 801, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : 768});
    await expect(page.getByRole('button', {name: 'Confirmă și salvează'})).toBeVisible();
    const geometry = await page.evaluate(() => {
      const preview = document.querySelector('[data-review-preview]')!.getBoundingClientRect();
      const main = document.querySelector('main')!.getBoundingClientRect();
      return {documentWidth: document.documentElement.scrollWidth, previewLeft: preview.left, previewRight: preview.right, mainLeft: main.left, mainRight: main.right};
    });
    expect(geometry.documentWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(geometry.previewLeft, `preview escaped left at ${width}px`).toBeGreaterThanOrEqual(geometry.mainLeft - 1);
    expect(geometry.previewRight, `preview escaped right at ${width}px`).toBeLessThanOrEqual(geometry.mainRight + 1);
  }
});
