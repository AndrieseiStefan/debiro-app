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

test('creates a company-scoped template with catalog and custom documents', async ({page}) => {
  await page.goto(roPath);
  await page.getByRole('button', {name: 'Adaugă șablon nou'}).click();
  await expect(page.getByRole('heading', {name: 'Creare șablon'})).toBeVisible();
  await expect(page.getByRole('tab', {name: 'Documente necesare (0)'})).toBeVisible();
  await expect(page.getByText('Nu ai adăugat documente încă')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Adaugă document'})).toHaveCount(1);
  const emptyState = page.getByText('Nu ai adăugat documente încă').locator('..');
  expect((await emptyState.boundingBox())!.height).toBeLessThan(150);
  for (const width of [375, 320]) {
    await page.setViewportSize({width, height: 812});
    await expect(page.getByRole('button', {name: 'Adaugă document'})).toHaveCount(1);
    expect((await emptyState.boundingBox())!.height).toBeLessThan(190);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({width: 1448, height: 1086});
  await expect(page.getByRole('button', {name: 'Salvează șablon'})).toBeDisabled();
  await page.getByRole('textbox', {name: /Nume șablon/}).fill('Șablon QA nou');
  await page.getByRole('combobox', {name: /Categorie \/ Aplicabilitate/}).selectOption('construction');
  await expect(page.getByText('Adaugă cel puțin un document înainte de a salva șablonul.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Salvează șablon'})).toBeDisabled();

  await page.getByRole('button', {name: 'Adaugă document'}).first().click();
  const drawer = page.getByRole('dialog', {name: 'Adaugă document'});
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', {name: 'Din sugestii'})).toHaveAttribute('aria-pressed', 'true');
  await expect(drawer.getByRole('group', {name: 'Sursă document'})).toBeVisible();
  await expect(drawer.getByText('Sursă document')).toHaveCount(0);
  await expect(drawer.getByRole('textbox', {name: 'Nume document'})).toHaveCount(0);
  await drawer.getByRole('searchbox', {name: 'Caută document'}).fill('fiscal');
  await expect(drawer.getByRole('button', {name: /Certificat fiscal/})).toBeVisible();
  await drawer.getByRole('button', {name: /Certificat fiscal/}).click();
  await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole('tab', {name: 'Documente necesare (1)'})).toBeVisible();
  await expect(page.getByRole('table').getByText('Certificat fiscal', {exact: true})).toBeVisible();

  await page.getByRole('button', {name: 'Adaugă document'}).first().click();
  await drawer.getByRole('button', {name: 'Document personalizat'}).click();
  await expect(drawer.getByRole('group', {name: 'Sursă document'})).toBeVisible();
  await expect(drawer.getByText('Sursă document')).toHaveCount(0);
  await drawer.getByRole('textbox', {name: /Nume document/}).fill('  Aviz   tehnic QA  ');
  await drawer.getByRole('textbox', {name: /Emitent \/ Autoritate/}).fill('Primărie');
  await drawer.getByRole('combobox', {name: 'Alertă expirare'}).selectOption('60');
  await drawer.getByRole('combobox', {name: 'Valabilitate'}).selectOption('24');
  await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
  await expect(page.getByRole('tab', {name: 'Documente necesare (2)'})).toBeVisible();
  const customRow = page.getByRole('row').filter({hasText: 'Aviz tehnic QA'});
  await expect(customRow.getByRole('combobox', {name: /Alertă expirare/})).toHaveValue('60');
  await expect(customRow.getByRole('combobox', {name: /Valabilitate/})).toHaveValue('24');

  await page.getByRole('button', {name: 'Salvează șablon'}).click();
  await expect(page.getByRole('heading', {name: 'Șablon QA nou'})).toBeVisible();
  await expect(page.locator('[data-template-id^="local-template-"]')).toContainText('2 documente');
  await page.getByRole('button', {name: 'Demo Company SRL'}).click();
  const switcher = page.getByRole('dialog', {name: 'Schimbă compania'});
  await expect(switcher).toBeVisible();
  const otherCompany = switcher.locator('[data-company-switch-id]:not([aria-pressed="true"])').first();
  await otherCompany.click();
  await expect(page.getByRole('heading', {name: 'Șablon QA nou'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /Șablon QA nou/})).toHaveCount(0);
});

test('protects a dirty draft, and preserves English document flow', async ({page}) => {
  await page.goto(roPath);
  await page.getByRole('button', {name: 'Adaugă șablon nou'}).click();
  await page.getByRole('textbox', {name: /Nume șablon/}).fill('Abandoned template QA');
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'}).click();
  await expect(page.getByRole('alertdialog', {name: 'Renunți la modificările nesalvate?'})).toBeVisible();
  await page.getByRole('button', {name: 'Continuă editarea'}).click();
  await expect(page).toHaveURL(/\/requirements$/);
  await expect(page.getByRole('textbox', {name: /Nume șablon/})).toHaveValue('Abandoned template QA');
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'}).click();
  await page.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page).toHaveURL(/\/vendors$/);

  await page.goto('/en/requirements');
  await page.getByRole('button', {name: 'Add new template'}).click();
  await expect(page.getByRole('heading', {name: 'Create template'})).toBeVisible();
  await page.getByRole('button', {name: 'Add document'}).first().click();
  const drawer = page.getByRole('dialog', {name: 'Add document'});
  await drawer.getByRole('searchbox', {name: 'Search documents'}).fill('does-not-exist');
  await expect(drawer.getByText('No documents match your search.')).toBeVisible();
  await drawer.getByRole('button', {name: 'Create custom document'}).click();
  await expect(drawer.getByRole('textbox', {name: /Document name/})).toBeVisible();
});

test('rejects duplicate documents and template names, and discards dirty documents', async ({page}) => {
  await page.goto(roPath);
  await page.getByRole('button', {name: 'Adaugă șablon nou'}).click();
  await page.getByRole('textbox', {name: /Nume șablon/}).fill(' subcontractor   construcții ');
  await expect(page.getByRole('button', {name: 'Salvează șablon'})).toBeDisabled();
  await expect(page.getByText('Există deja un șablon cu acest nume în compania activă.')).toBeVisible();
  await page.getByRole('textbox', {name: /Nume șablon/}).fill('Șablon temporar');
  await page.getByRole('combobox', {name: /Categorie \/ Aplicabilitate/}).selectOption('construction');
  await page.getByRole('button', {name: 'Adaugă document'}).first().click();
  const drawer = page.getByRole('dialog', {name: 'Adaugă document'});
  await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
  await expect(drawer).toHaveCount(0);
  await page.getByRole('button', {name: 'Adaugă document'}).first().click();
  await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
  await expect(drawer.getByRole('alert')).toHaveText('Acest document există deja în șablon.');
  await drawer.getByRole('button', {name: 'Document personalizat'}).click();
  await drawer.getByRole('textbox', {name: /Nume document/}).fill('CERTIFICAT FISCAL');
  await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
  await expect(drawer.getByRole('alert')).toHaveText('Acest document există deja în șablon.');
  await drawer.getByRole('button', {name: 'Închide adăugarea documentului'}).click();
  await page.getByRole('button', {name: 'Anulează'}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page.getByRole('heading', {name: 'Creare șablon'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /Șablon temporar/})).toHaveCount(0);
});

test('keeps draft and Add Document drawer contained at supported widths', async ({page}) => {
  await page.goto(roPath);
  await page.getByRole('button', {name: 'Adaugă șablon nou'}).click();
  await page.getByRole('button', {name: 'Adaugă document'}).first().click();
  const drawer = page.getByRole('dialog', {name: 'Adaugă document'});
  for (const width of [1448, 1024, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await expect(drawer).toBeVisible();
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(width + 1);
    const geometry = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')!;
      const rect = dialog.getBoundingClientRect();
      return {document: document.documentElement.scrollWidth, left: rect.left, right: rect.right, body: dialog.scrollHeight, viewport: dialog.clientHeight};
    });
    expect(geometry.document, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(geometry.left, `drawer left at ${width}px`).toBeGreaterThanOrEqual(-1);
    expect(geometry.right, `drawer right at ${width}px`).toBeLessThanOrEqual(width + 1);
    expect(geometry.viewport, `drawer height at ${width}px`).toBeLessThanOrEqual(812 + (width === 1448 ? 274 : 0));
    await drawer.getByRole('button', {name: 'Document personalizat'}).click();
    await expect(drawer.getByRole('button', {name: 'Adaugă documentul'})).toBeVisible();
    await drawer.getByRole('button', {name: 'Din sugestii'}).click();
  }
});

test('confirms before switching companies with an edited template draft', async ({page}) => {
  await page.goto(roPath);
  await page.getByRole('button', {name: 'Adaugă șablon nou'}).click();
  await page.getByRole('textbox', {name: /Nume șablon/}).fill('Draft for current company');
  await page.getByRole('button', {name: 'Demo Company SRL'}).click();
  await page.getByRole('dialog', {name: 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
  await expect(page.getByRole('alertdialog', {name: 'Renunți la modificările nesalvate?'})).toBeVisible();
  await page.getByRole('button', {name: 'Continuă editarea'}).click();
  await expect(page.getByRole('textbox', {name: /Nume șablon/})).toHaveValue('Draft for current company');
  await expect(page.getByRole('button', {name: 'Demo Company SRL'})).toBeVisible();
  await page.getByRole('button', {name: 'Demo Company SRL'}).click();
  await page.getByRole('dialog', {name: 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
  await page.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page.getByRole('heading', {name: 'Nu există șabloane pentru această companie'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Global Clean Services'})).toBeVisible();
});
