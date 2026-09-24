import {expect, test} from '@playwright/test';

const roPath = '/requirements';

test('renders both locales with canonical fixture rules and local template search', async ({page}) => {
  await page.goto(roPath);
  await expect(page.getByRole('heading', {level: 1, name: 'Cerințe documente'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Cerințe'})).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(6);
  await expect(page.getByText('Acest șablon va fi disponibil pentru atribuire la furnizori din categoria „Subcontractor construcții”.')).toBeVisible();
  await page.getByRole('searchbox', {name: 'Caută șabloane'}).fill('materiale');
  await page.getByRole('button', {name: /Furnizor materiale/}).click();
  await expect(page.getByRole('heading', {name: 'Furnizor materiale'})).toBeVisible();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(5);
  await page.goto('/en/requirements');
  await expect(page.getByRole('heading', {level: 1, name: 'Document requirements'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Application navigation'}).getByRole('link', {name: 'Requirements'})).toHaveAttribute('aria-current', 'page');
});

test('contains the page across the required authenticated widths', async ({page}) => {
  await page.goto(roPath);
  for (const width of [1448, 1024, 801, 799, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : 768});
    await expect(page.getByRole('heading', {level: 1, name: 'Cerințe documente'})).toBeVisible();
    const dimensions = await page.evaluate(() => ({document: document.documentElement.scrollWidth, table: document.querySelector('[role="region"][aria-label="Documentele și regulile șablonului"]')!.getBoundingClientRect().right}));
    expect(dimensions.document, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(dimensions.table, `table region escaped at ${width}px`).toBeLessThanOrEqual(width + 1);
  }
});

test('keeps direct and client-navigated Requirements geometry equivalent', async ({page}) => {
  const measure = () => page.evaluate(() => {
    const rect = (selector: string) => {const {x, y, width} = document.querySelector(selector)!.getBoundingClientRect(); return [x, y, width];};
    return {title: rect('#requirements-title'), workspace: rect('[role="tabpanel"]')};
  });
  for (const width of [1448, 1024, 799, 375]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await page.goto(roPath);
    const direct = await measure();
    await page.goto('/dashboard');
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Cerințe'}).click();
    await expect(page).toHaveURL(/\/requirements$/);
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();
    expect(await measure()).toEqual(direct);
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'}).click();
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Cerințe'}).click();
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();
    expect(await measure()).toEqual(direct);
  }
});
