import {expect, test} from '@playwright/test';

const detailsPath = '/vendors/construct-pro';

test('opens canonical Romanian details from the existing list action and returns by breadcrumb', async ({page}) => {
  await page.goto('/vendors');
  await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
  await expect(page).toHaveURL(new RegExp(`${detailsPath}$`));
  await expect(page.getByRole('heading', {level: 1, name: 'Construct Pro SRL'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'})).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('tab', {name: 'Documente'})).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(6);
  await page.getByRole('navigation', {name: 'Navigare pe pagină'}).getByRole('link', {name: 'Furnizori'}).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
  await expect(page.getByText('4 din 5 documente valide')).toBeVisible();
});

test('opens English details and preserves the route on locale switch', async ({page}) => {
  await page.goto('/en/vendors');
  await page.getByRole('link', {name: 'Details for Construct Pro SRL'}).click();
  await expect(page).toHaveURL(/\/en\/vendors\/construct-pro$/);
  await expect(page.getByText('4 of 5 valid documents')).toBeVisible();
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`${detailsPath}$`));
});

test('unknown fixture ID returns not found', async ({page}) => {
  const response = await page.goto('/vendors/does-not-exist');
  expect(response?.status()).toBe(404);
});

test('details stay within the document at authenticated responsive widths', async ({page}) => {
  await page.goto(detailsPath);
  for (const width of [1448, 1024, 801, 799, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : 768});
    await expect(page.getByRole('heading', {level: 1, name: 'Construct Pro SRL'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Adaugă document'})).toBeVisible();
    const dimensions = await page.evaluate(() => ({document: document.documentElement.scrollWidth, table: document.querySelector('[role="region"][aria-label="Documentele furnizorului"]')!.getBoundingClientRect().right}));
    expect(dimensions.document, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(dimensions.table).toBeLessThanOrEqual(width + 1);
  }
});

test('direct and client-navigated details have equivalent geometry', async ({page}) => {
  const measure = async () => page.evaluate(() => {
    const heading = document.querySelector('h1')!.getBoundingClientRect();
    const panel = document.querySelector('[role="tabpanel"]')!.getBoundingClientRect();
    return {heading: [heading.x, heading.y, heading.width], panel: [panel.x, panel.y, panel.width]};
  });
  await page.setViewportSize({width: 1448, height: 1086});
  await page.goto(detailsPath);
  const direct = await measure();
  await page.goto('/vendors');
  await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
  await expect(page.getByRole('heading', {level: 1, name: 'Construct Pro SRL'})).toBeVisible();
  const navigated = await measure();
  expect(navigated.heading).toEqual(direct.heading);
  expect(navigated.panel).toEqual(direct.panel);
});
