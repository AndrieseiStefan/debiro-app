import {expect, test} from '@playwright/test';
import {openFilters} from './support/filters';

const reviewRoute = '/documents/construct-pro-tax-2024/review';

test('renders Romanian and English Documents with active authenticated navigation', async ({page}) => {
  for (const [route, title, tableHeading] of [['/documents', 'Documente', 'DATA ÎNCĂRCĂRII'], ['/en/documents', 'Documents', 'UPLOAD DATE']]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', {level: 1, name: title})).toBeVisible();
    await expect(page.getByRole('navigation', {name: route.startsWith('/en') ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: title})).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('columnheader', {name: tableHeading})).toBeVisible();
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(9);
    await expect(page.getByRole('link', {name: route.startsWith('/en') ? 'Review Tax certificate for Construct Pro SRL' : 'Revizuiește Certificat fiscal pentru Construct Pro SRL'}).first()).toHaveAttribute('href', route.startsWith('/en') ? `/en${reviewRoute}` : reviewRoute);
  }
});

test('tabs, search, filters, sort, empty recovery and pagination stay local', async ({page}) => {
  await page.goto('/documents');
  const table = page.getByRole('table');
  const tabs = page.getByRole('navigation', {name: 'Categorii documente'});
  const search = page.getByRole('searchbox', {name: 'Caută document după nume, fișier, furnizor sau tip'});
  await tabs.getByRole('button', {name: /Necesită revizuire/}).click();
  await expect(table.locator('tbody tr')).toHaveCount(4);
  await expect(table.locator('tbody tr').first()).toContainText('Construct Pro SRL');
  await tabs.getByRole('button', {name: /Toate documentele/}).click();
  await page.getByRole('region', {name: 'Rezumat documente'}).getByRole('button', {name: 'Necesită revizuire: 4'}).click();
  await expect(table.locator('tbody tr')).toHaveCount(4);
  await tabs.getByRole('button', {name: /Toate documentele/}).click();
  await expect(table.locator('tbody tr')).toHaveCount(8);

  await page.getByRole('combobox', {name: 'Sortează după data încărcării'}).selectOption('oldest');
  await expect(table.locator('tbody tr').first()).toContainText('Nova Energy SRL');
  await page.getByRole('combobox', {name: 'Sortează după data încărcării'}).selectOption('newest');
  await expect(table.locator('tbody tr').first()).toContainText('Certificat_fiscal_CP_2024.pdf');
  await page.getByRole('button', {name: 'Pagina 2'}).click();
  await expect(page.getByText('Se afișează 9-16 din 24 documente')).toBeVisible();
  await page.getByRole('button', {name: 'Pagina 3'}).click();
  await expect(page.getByRole('button', {name: 'Pagina următoare'})).toBeDisabled();
  await page.getByRole('button', {name: 'Pagina 2'}).click();
  await search.fill('Certificat_fiscal_CP_2024.pdf');
  await expect(page.getByText('Se afișează 1-1 din 1 documente')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Pagina precedentă'})).toBeDisabled();
  await search.fill('');

  await openFilters(page);
  await page.getByRole('combobox', {name: 'Furnizor'}).selectOption('construct-pro');
  await page.getByRole('combobox', {name: 'Tip document'}).selectOption('tax');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('checkbox', {name: /Expirat/}).check();
  await expect(page.getByText('Niciun document nu corespunde căutării sau filtrelor.')).toBeVisible();
  await page.getByRole('button', {name: 'Resetează căutarea și filtrele'}).click();
  await expect(table.locator('tbody tr')).toHaveCount(8);
  await openFilters(page);
  await page.getByRole('combobox', {name: 'Perioadă încărcare'}).selectOption('2023');
  await expect(page.getByText('Se afișează 1-8 din 9 documente')).toBeVisible();
  await page.getByRole('button', {name: 'Resetează', exact: true}).click();
  await expect(page.getByText('Se afișează 1-8 din 24 documente')).toBeVisible();
  await page.getByRole('button', {name: 'Filtrează'}).click();
  await expect(page.getByRole('button', {name: 'Filtrează'})).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', {name: 'Filtrează'}).click();
  await expect(page.getByRole('button', {name: 'Filtrează'})).toHaveAttribute('aria-expanded', 'true');
});

test('canonical document opens the existing review and returns to Documents in both locales', async ({page}) => {
  for (const localePrefix of ['', '/en']) {
    await page.goto(`${localePrefix}/documents`);
    await page.getByRole('link', {name: localePrefix ? 'Review Tax certificate for Construct Pro SRL' : 'Revizuiește Certificat fiscal pentru Construct Pro SRL'}).first().click();
    await expect(page).toHaveURL(new RegExp(`${localePrefix}${reviewRoute}$`));
    await expect(page.getByRole('heading', {level: 1, name: localePrefix ? 'Review document' : 'Revizuiește documentul'})).toBeVisible();
    await page.getByRole('link', {name: localePrefix ? 'Back to documents' : 'Înapoi la documente'}).click();
    await expect(page).toHaveURL(new RegExp(`${localePrefix}/documents$`));
  }
});

test('Documents reflows inside the shell at every requested width and client navigation is stable', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1252, 833], [1024, 768], [801, 833], [758, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/documents');
    await page.evaluate(async () => { await document.fonts.ready; });
    const direct = await page.getByRole('table').boundingBox();
    const geometry = await page.evaluate(() => {
      const main = document.querySelector('main')!.getBoundingClientRect();
      const region = document.querySelector('[role="region"][aria-label="Tabel documente"]')!;
      const table = region.querySelector('table')!;
      return {documentWidth: document.documentElement.scrollWidth, mainRight: main.right, regionRight: region.getBoundingClientRect().right, tableScrollWidth: region.scrollWidth, regionWidth: region.clientWidth, tableWidth: table.getBoundingClientRect().width};
    });
    expect(geometry.documentWidth, `${width}px document overflow`).toBeLessThanOrEqual(width);
    expect(geometry.regionRight, `${width}px table containment`).toBeLessThanOrEqual(geometry.mainRight + 1);
    await expect(page.getByRole('dialog', {name: 'Filtre', exact: true})).toHaveCount(0);
    if (width <= 1024) expect(geometry.tableScrollWidth, `${width}px internal table scroll`).toBeGreaterThan(geometry.regionWidth);
    await page.goto('/dashboard');
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Documente'}).click();
    await expect(page).toHaveURL(/\/documents$/);
    await page.evaluate(async () => { await document.fonts.ready; });
    expect(await page.getByRole('table').boundingBox(), `${width}px direct/client table geometry`).toEqual(direct);
  }
});
