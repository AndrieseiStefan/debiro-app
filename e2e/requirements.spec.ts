import {expect, test, type Locator} from '@playwright/test';

const roPath = '/requirements';

test('renders both locales with canonical fixture rules and local template search', async ({page}) => {
  await page.goto(roPath);
  await expect(page.getByRole('heading', {level: 1, name: 'Cerințe documente'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Cerințe'})).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(6);
  await expect(page.getByText('Acest șablon va fi disponibil pentru atribuire la furnizori din categoria „Construcții”.')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('tab', {name: 'Previzualizare'})).toBeVisible();
  await page.getByRole('searchbox', {name: 'Caută șabloane'}).fill('materiale');
  await page.getByRole('button', {name: /Furnizor materiale/}).click();
  await expect(page.getByRole('heading', {name: 'Furnizor materiale'})).toBeVisible();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(5);
  await expect(page.getByText('Acest șablon va fi disponibil pentru atribuire la furnizori din categoria „Materiale construcții”.')).toBeVisible();
  await page.goto('/en/requirements');
  await expect(page.getByRole('heading', {level: 1, name: 'Document requirements'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Application navigation'}).getByRole('link', {name: 'Requirements'})).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByText('This template will be available to assign to suppliers in the “Construction” category.')).toBeVisible();
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
    return {title: rect('#requirements-title'), workspace: rect('#documents-panel')};
  });
  for (const width of [1448, 1024, 799, 375]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await page.goto(roPath);
    const direct = await measure();
    await page.goto('/dashboard');
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Cerințe'}).click();
    await expect(page).toHaveURL(/\/requirements$/);
    await expect(page.getByRole('tabpanel', {name: /^Documente necesare/})).toBeVisible();
    expect(await measure()).toEqual(direct);
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'}).click();
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Cerințe'}).click();
    await expect(page.getByRole('tabpanel', {name: /^Documente necesare/})).toBeVisible();
    expect(await measure()).toEqual(direct);
  }
});

test('shares vendor category IDs and compact input/select placeholder geometry in both locales', async ({page}) => {
  for (const locale of ['ro', 'en'] as const) {
    const path = locale === 'ro' ? '' : '/en';
    await page.goto(`${path}/vendors`);
    await page.getByRole('button', {name: locale === 'ro' ? 'Adaugă furnizor' : 'Add supplier'}).click();
    const vendor = page.getByRole('dialog', {name: locale === 'ro' ? 'Adaugă furnizor' : 'Add supplier'});
    const vendorOptions = await vendor.locator('#add-vendor-category option').evaluateAll((options) => options.map((option) => ({id: (option as HTMLOptionElement).value, label: option.textContent})).slice(1));
    const vendorGeometry = await vendor.evaluate((element) => {
      const input = element.querySelector<HTMLInputElement>('#add-vendor-industry')!;
      const select = element.querySelector<HTMLSelectElement>('#add-vendor-category')!;
      const inputStyle = getComputedStyle(input);
      const selectStyle = getComputedStyle(select);
      const placeholderStyle = getComputedStyle(input, '::placeholder');
      return {inputHeight: input.getBoundingClientRect().height, selectHeight: select.getBoundingClientRect().height, inputSize: inputStyle.fontSize, selectSize: selectStyle.fontSize, inputPadding: inputStyle.paddingLeft, selectPadding: selectStyle.paddingLeft, inputRadius: inputStyle.borderRadius, selectRadius: selectStyle.borderRadius, placeholderColor: placeholderStyle.color, selectEmptyColor: selectStyle.color, selectEmptyWeight: selectStyle.fontWeight};
    });
    expect(vendorGeometry.inputHeight).toBe(vendorGeometry.selectHeight);
    expect(vendorGeometry.inputSize).toBe(vendorGeometry.selectSize);
    expect(vendorGeometry.inputPadding).toBe(vendorGeometry.selectPadding);
    expect(vendorGeometry.inputRadius).toBe(vendorGeometry.selectRadius);
    expect(vendorGeometry.placeholderColor).toBe(vendorGeometry.selectEmptyColor);
    expect(vendorGeometry.selectEmptyWeight).toBe('400');
    await vendor.locator('#add-vendor-category').selectOption('software');
    expect(await vendor.locator('#add-vendor-category').evaluate((element) => getComputedStyle(element).color)).not.toBe(vendorGeometry.selectEmptyColor);

    await page.goto(`${path}/requirements`);
    await page.getByRole('button', {name: locale === 'ro' ? 'Adaugă șablon nou' : 'Add new template'}).click();
    const templateOptions = await page.locator('#requirement-template-category option').evaluateAll((options) => options.map((option) => ({id: (option as HTMLOptionElement).value, label: option.textContent})).slice(1));
    expect(templateOptions).toEqual(vendorOptions);
    const templateGeometry = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#requirement-template-name')!;
      const select = document.querySelector<HTMLSelectElement>('#requirement-template-category')!;
      const inputStyle = getComputedStyle(input);
      const selectStyle = getComputedStyle(select);
      return {inputHeight: input.getBoundingClientRect().height, selectHeight: select.getBoundingClientRect().height, inputSize: inputStyle.fontSize, selectSize: selectStyle.fontSize, inputPadding: inputStyle.paddingLeft, selectPadding: selectStyle.paddingLeft, inputRadius: inputStyle.borderRadius, selectRadius: selectStyle.borderRadius, placeholderColor: getComputedStyle(input, '::placeholder').color, selectEmptyColor: selectStyle.color, selectEmptyWeight: selectStyle.fontWeight};
    });
    expect(templateGeometry).toEqual(vendorGeometry);
    await page.locator('#requirement-template-category').selectOption('software');
    expect(await page.locator('#requirement-template-category').evaluate((element) => getComputedStyle(element).color)).not.toBe(templateGeometry.selectEmptyColor);
    await expect(page.getByRole('tab')).toHaveCount(2);
  }
});

test('uses one placeholder treatment across forms and searches without muting real filter values', async ({page}) => {
  const placeholderStyle = (locator: Locator) => locator.evaluate((element) => {
    const style = getComputedStyle(element, element instanceof HTMLSelectElement ? undefined : '::placeholder');
    return {color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight, opacity: style.opacity, lineHeight: style.lineHeight};
  });

  for (const locale of ['ro', 'en'] as const) {
    const path = locale === 'ro' ? '' : '/en';
    await page.goto(`${path}/vendors`);
    await page.getByRole('button', {name: locale === 'ro' ? 'Adaugă furnizor' : 'Add supplier'}).click();
    const approved = await placeholderStyle(page.locator('#add-vendor-name'));
    for (const selector of ['#add-vendor-category', '#add-vendor-address', '#add-vendor-notes']) expect(await placeholderStyle(page.locator(selector))).toEqual(approved);

    await page.goto(`${path}/requirements`);
    for (const search of await page.locator('input[placeholder][type="search"]').all()) expect(await placeholderStyle(search)).toEqual(approved);
    await page.getByRole('button', {name: locale === 'ro' ? 'Adaugă șablon nou' : 'Add new template'}).click();
    for (const selector of ['#requirement-template-name', '#requirement-template-category', 'textarea[placeholder]']) expect(await placeholderStyle(page.locator(selector))).toEqual(approved);

    await page.goto(`${path}/requirements`);
    await page.getByRole('button', {name: locale === 'ro' ? 'Adaugă document' : 'Add document'}).click();
    const drawer = page.getByRole('dialog', {name: locale === 'ro' ? 'Adaugă document' : 'Add document'});
    expect(await placeholderStyle(drawer.locator('input[type="search"][placeholder]'))).toEqual(approved);
    await drawer.getByRole('button', {name: locale === 'ro' ? 'Document personalizat' : 'Custom document'}).click();
    for (const input of await drawer.locator('input[placeholder], textarea[placeholder]').all()) expect(await placeholderStyle(input)).toEqual(approved);

    await page.goto(`${path}/vendors/construct-pro`);
    await page.getByRole('button', {name: locale === 'ro' ? 'Adaugă document' : 'Add document'}).click();
    expect(await placeholderStyle(page.locator('#add-document-type'))).toEqual(approved);
    expect(await placeholderStyle(page.locator('#add-document-number'))).toEqual(approved);
    await page.locator('#add-document-type').selectOption('tax');
    expect(await placeholderStyle(page.locator('#add-document-type'))).not.toEqual(approved);

    await page.goto(`${path}/documents`);
    for (const search of await page.locator('input[type="search"][placeholder]').all()) expect(await placeholderStyle(search)).toEqual(approved);
    await page.getByRole('button', {name: locale === 'ro' ? 'Filtrează' : 'Filter', exact: true}).click();
    for (const select of await page.getByRole('dialog', {name: locale === 'ro' ? 'Filtre' : 'Filters', exact: true}).getByRole('combobox').all()) {
      expect(await select.getAttribute('data-empty')).toBe('false');
      expect(await select.evaluate((element) => getComputedStyle(element).color)).not.toBe(approved.color);
    }

    await page.goto(`${path}/profile/companies`);
    const emptySelects = page.locator('select[data-empty="true"]');
    await expect(emptySelects).toHaveCount(2);
    for (const select of await emptySelects.all()) expect(await placeholderStyle(select)).toEqual(approved);
  }
});

test('creates a company-scoped template with catalog and custom documents', async ({page}) => {
  await page.goto(roPath);
  await page.getByRole('button', {name: 'Adaugă șablon nou'}).click();
  await expect(page.getByRole('heading', {name: 'Creare șablon'})).toBeVisible();
  await expect(page.getByRole('tab', {name: 'Documente necesare (0)'})).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('tab', {name: 'Setări și aplicabilitate'})).toHaveCount(0);
  await expect(page.getByText('Nu ai adăugat documente încă')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Adaugă document'})).toHaveCount(1);
  const emptyState = page.getByText('Nu ai adăugat documente încă').locator('..');
  expect((await emptyState.boundingBox())!.height).toBeLessThan(150);
  for (const width of [1448, 1024, 768, 600, 375, 320]) {
    await page.setViewportSize({width, height: 812});
    await expect(page.getByRole('button', {name: 'Adaugă document'})).toHaveCount(1);
    expect((await emptyState.boundingBox())!.height).toBeLessThan(190);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const controls = await page.evaluate(() => ['requirement-template-name', 'requirement-template-category'].map((id) => {
      const rect = document.getElementById(id)!.getBoundingClientRect();
      return {left: rect.left, right: rect.right, height: rect.height};
    }));
    expect(controls[0].height).toBe(controls[1].height);
    for (const control of controls) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(width + 1);
    }
  }
  await page.setViewportSize({width: 1448, height: 1086});
  await expect(page.getByRole('button', {name: 'Salvează șablon'})).toBeDisabled();
  await page.getByRole('textbox', {name: /Nume șablon/}).fill('Șablon QA nou');
  await page.getByRole('combobox', {name: /Categorie furnizor/}).selectOption('construction');
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
  await expect(page.getByRole('tab')).toHaveCount(2);
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
  await expect(page.getByRole('combobox', {name: /Supplier category/})).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(2);
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
  await page.getByRole('combobox', {name: /Categorie furnizor/}).selectOption('construction');
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

test('stages existing template metadata and rules until Save or Cancel', async ({page}) => {
  await page.goto(roPath);
  const name = page.locator('#requirement-template-name');
  const category = page.locator('#requirement-template-category');
  const description = page.locator('textarea[placeholder="Adaugă detalii despre aplicabilitatea șablonului..."]');
  const save = page.getByRole('button', {name: 'Salvează șablon'});
  const registration = page.getByRole('row').filter({hasText: 'Certificat de înregistrare'});
  await expect(save).toBeDisabled();
  await name.fill('  subcontractor   construcții  ');
  await expect(page.getByText('Există deja un șablon cu acest nume în compania activă.')).toHaveCount(0);
  await name.fill('  FURNIZOR   MATERIALE  ');
  await expect(save).toBeDisabled();
  await name.fill('Șablon verificat');
  await description.fill('Descriere verificată');
  await category.selectOption('software');
  await registration.locator('label').first().click();
  await registration.getByRole('combobox', {name: /Alertă expirare/}).selectOption('60');
  await expect(page.locator('[data-template-id="construction"]')).toContainText('Subcontractor construcții');
  await page.getByRole('button', {name: 'Anulează'}).click();
  await expect(name).toHaveValue('Subcontractor construcții');
  await expect(description).toHaveValue('Lucrări de construcții și instalații în șantiere');
  await expect(category).toHaveValue('construction');
  await expect(registration.getByRole('checkbox')).toBeChecked();
  await expect(registration.getByRole('combobox', {name: /Alertă expirare/})).toHaveValue('30');
  await expect(save).toBeDisabled();

  await name.fill('Șablon verificat');
  await description.fill('Descriere verificată');
  await category.selectOption('software');
  await registration.locator('label').first().click();
  await registration.getByRole('combobox', {name: /Alertă expirare/}).selectOption('60');
  await save.click();
  await expect(page.getByRole('heading', {name: 'Șablon verificat'})).toBeVisible();
  await expect(page.locator('[data-template-id="construction"]')).toContainText('Șablon verificat');
  await expect(category).toHaveValue('software');
  await expect(save).toBeDisabled();
  await page.getByRole('button', {name: /Furnizor materiale/}).click();
  await page.getByRole('button', {name: /Șablon verificat/}).click();
  await expect(registration.getByRole('checkbox')).not.toBeChecked();
  await expect(registration.getByRole('combobox', {name: /Alertă expirare/})).toHaveValue('60');
});

test('adds and removes existing-template documents atomically', async ({page}) => {
  await page.goto(roPath);
  const count = page.getByRole('tab', {name: /^Documente necesare/});
  const save = page.getByRole('button', {name: 'Salvează șablon'});
  const addCatalog = async () => {
    await page.getByRole('button', {name: 'Adaugă document'}).click();
    const drawer = page.getByRole('dialog', {name: 'Adaugă document'});
    await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
    await expect(drawer).toHaveCount(0);
  };
  await expect(count).toHaveText('Documente necesare (5)');
  await addCatalog();
  await expect(count).toHaveText('Documente necesare (6)');
  await expect(page.locator('[data-template-id="construction"]')).toContainText('5 documente');
  await page.getByRole('button', {name: 'Anulează'}).click();
  await expect(count).toHaveText('Documente necesare (5)');
  await addCatalog();
  await save.click();
  await expect(page.locator('[data-template-id="construction"]')).toContainText('6 documente');
  await page.getByRole('button', {name: 'Elimină documentul Certificat fiscal'}).click();
  await expect(count).toHaveText('Documente necesare (5)');
  await page.getByRole('button', {name: 'Anulează'}).click();
  await expect(count).toHaveText('Documente necesare (6)');
  await page.getByRole('button', {name: 'Elimină documentul Certificat fiscal'}).click();
  await save.click();
  await expect(count).toHaveText('Documente necesare (5)');
  await expect(page.locator('[data-template-id="construction"]')).toContainText('5 documente');
});

test('edits custom metadata and protects dirty existing templates across navigation', async ({page}) => {
  await page.goto(roPath);
  const name = page.locator('#requirement-template-name');
  await page.getByRole('button', {name: 'Adaugă document'}).click();
  const drawer = page.getByRole('dialog', {name: 'Adaugă document'});
  await drawer.getByRole('button', {name: 'Document personalizat'}).click();
  await drawer.getByRole('textbox', {name: /Nume document/}).fill('Aviz local QA');
  await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
  await expect(page.getByRole('row').filter({hasText: 'Aviz local QA'})).toBeVisible();
  await page.getByRole('button', {name: 'Anulează'}).click();
  await expect(page.getByText('Aviz local QA')).toHaveCount(0);
  await page.getByRole('button', {name: 'Adaugă document'}).click();
  await drawer.getByRole('button', {name: 'Document personalizat'}).click();
  await drawer.getByRole('textbox', {name: /Nume document/}).fill('Aviz local QA');
  await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
  await page.getByRole('button', {name: 'Salvează șablon'}).click();
  await expect(page.getByRole('row').filter({hasText: 'Aviz local QA'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Editează documentul personalizat Certificat de înregistrare'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Editează documentul personalizat Aviz local QA'}).click();
  await page.locator('#requirement-custom-name').fill('Aviz local corectat');
  await page.locator('#requirement-custom-issuer').fill('Primărie');
  await page.getByRole('button', {name: /Furnizor materiale/}).click();
  await expect(page.getByRole('alertdialog', {name: 'Renunți la modificările nesalvate?'})).toBeVisible();
  await page.getByRole('button', {name: 'Continuă editarea'}).click();
  await expect(page.locator('#requirement-custom-name')).toHaveValue('Aviz local corectat');
  await page.getByRole('button', {name: 'Adaugă șablon nou'}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', {name: 'Continuă editarea'}).click();
  await page.getByRole('button', {name: 'Demo Company SRL'}).click();
  await page.getByRole('dialog', {name: 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', {name: 'Continuă editarea'}).click();
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Cerințe'}).click();
  await expect(name).toHaveValue('Subcontractor construcții');
  await expect(page.getByRole('row').filter({hasText: 'Aviz local QA'})).toBeVisible();
  await expect(page.getByText('Aviz local corectat')).toHaveCount(0);
});

test('keeps English existing-template edits and narrow custom-editor geometry usable', async ({page}) => {
  await page.goto('/en/requirements');
  await page.locator('#requirement-template-name').fill('Updated construction template');
  await page.getByRole('button', {name: 'Save template'}).click();
  await expect(page.getByRole('heading', {name: 'Updated construction template'})).toBeVisible();
  await page.getByRole('button', {name: 'Add document'}).click();
  const drawer = page.getByRole('dialog', {name: 'Add document'});
  await drawer.getByRole('button', {name: 'Custom document'}).click();
  await drawer.getByRole('textbox', {name: /Document name/}).fill('Local EN permit');
  await drawer.getByRole('button', {name: 'Add document', exact: true}).click();
  await page.getByRole('button', {name: 'Edit custom document Local EN permit'}).click();
  for (const width of [1448, 1024, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await expect(page.locator('#requirement-custom-name')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `overflow at ${width}px`).toBeLessThanOrEqual(width);
  }
  await page.getByRole('button', {name: 'Cancel'}).click();
  await expect(page.getByText('Local EN permit')).toHaveCount(0);
});

test('stages template appearance and keeps the committed list unchanged until Save', async ({page}) => {
  await page.goto(roPath);
  const selected = page.locator('[data-template-id="construction"]');
  await expect(selected.locator('[data-color]')).toHaveAttribute('data-color', 'blue');
  const templateIcon = page.getByRole('button', {name: 'Schimbă iconița și culoarea'});
  await expect(templateIcon.locator('[data-appearance-edit-indicator]')).toBeVisible();
  expect(await templateIcon.evaluate((element) => getComputedStyle(element).cursor)).toBe('pointer');
  await expect(page.getByRole('button', {name: 'Acțiuni șablon'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Duplică șablon'})).toHaveCount(1);
  await expect(page.getByRole('button', {name: 'Șterge șablon'})).toHaveCount(1);
  await templateIcon.click();
  const picker = page.getByRole('dialog', {name: 'Alege aspectul'});
  await expect(picker).toBeVisible();
  await picker.getByRole('button', {name: 'Scut'}).click();
  await picker.getByRole('button', {name: 'Violet'}).click();
  await expect(selected.locator('[data-color]')).toHaveAttribute('data-color', 'blue');
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(templateIcon).toBeFocused();
  await page.getByRole('button', {name: 'Anulează'}).click();
  await expect(page.getByRole('button', {name: 'Salvează șablon'})).toBeDisabled();
  await templateIcon.click();
  await picker.getByRole('button', {name: 'Violet'}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Salvează șablon'}).click();
  await expect(selected.locator('[data-color]')).toHaveAttribute('data-color', 'violet');
});

test('custom document appearance uses the shared picker and is editable after Save', async ({page}) => {
  await page.goto(roPath);
  await page.getByRole('button', {name: 'Adaugă document'}).click();
  const drawer = page.getByRole('dialog', {name: 'Adaugă document'});
  await expect(drawer.locator('[data-editable-appearance]')).toHaveCount(0);
  await expect(drawer.locator('[data-appearance-edit-indicator]')).toHaveCount(0);
  await drawer.getByRole('button', {name: 'Document personalizat'}).click();
  const documentIcon = drawer.getByRole('button', {name: 'Schimbă iconița și culoarea documentului'});
  await expect(documentIcon.locator('[data-color]')).toHaveAttribute('data-color', 'blue');
  await expect(documentIcon.locator('[data-appearance-edit-indicator]')).toBeVisible();
  await expect(drawer.getByText('Aspect document')).toHaveCount(0);
  await expect(drawer.getByRole('button', {name: 'Schimbă', exact: true})).toHaveCount(0);
  const iconBounds = await documentIcon.boundingBox();
  const nameBounds = await drawer.getByRole('textbox', {name: /Nume document/}).boundingBox();
  expect(iconBounds!.y + iconBounds!.height).toBeLessThan(nameBounds!.y);
  await drawer.getByRole('textbox', {name: /Nume document/}).fill('Aviz aspect QA');
  await documentIcon.focus();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('dialog', {name: 'Alege aspectul'});
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await documentIcon.focus();
  await page.keyboard.press('Space');
  await picker.getByRole('button', {name: 'Transport'}).click();
  await picker.getByRole('button', {name: 'Turcoaz'}).click();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
  const row = page.getByRole('row').filter({hasText: 'Aviz aspect QA'});
  await expect(row.locator('[data-color]')).toHaveAttribute('data-color', 'teal');
  await page.getByRole('button', {name: 'Salvează șablon'}).click();
  await row.getByRole('button', {name: 'Editează documentul personalizat Aviz aspect QA'}).click();
  await page.getByRole('button', {name: 'Schimbă iconița și culoarea documentului'}).click();
  await picker.getByRole('button', {name: 'Portocaliu'}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Anulează'}).click();
  await expect(row.locator('[data-color]')).toHaveAttribute('data-color', 'teal');
  await row.getByRole('button', {name: 'Editează documentul personalizat Aviz aspect QA'}).click();
  await page.getByRole('button', {name: 'Schimbă iconița și culoarea documentului'}).click();
  await picker.getByRole('button', {name: 'Portocaliu'}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Salvează șablon'}).click();
  await expect(row.locator('[data-color]')).toHaveAttribute('data-color', 'orange');
  const catalogRow = page.getByRole('row').filter({hasText: 'Certificat de înregistrare'});
  await expect(catalogRow.getByRole('button', {name: /Editează documentul personalizat/})).toHaveCount(0);
});

test('duplicates with dirty guard, unique names and independent copied appearance, then confirms delete', async ({page}) => {
  await page.goto(roPath);
  await page.locator('#requirement-template-name').fill('Unsaved name');
  await page.getByRole('button', {name: 'Șterge șablon'}).click();
  await expect(page.getByRole('alertdialog', {name: 'Renunți la modificările nesalvate?'})).toBeVisible();
  await page.getByRole('button', {name: 'Continuă editarea'}).click();
  await expect(page.locator('#requirement-template-name')).toHaveValue('Unsaved name');
  await page.getByRole('button', {name: 'Duplică șablon'}).click();
  await expect(page.getByRole('alertdialog', {name: 'Renunți la modificările nesalvate?'})).toBeVisible();
  await page.getByRole('button', {name: 'Continuă editarea'}).click();
  await expect(page.locator('#requirement-template-name')).toHaveValue('Unsaved name');
  await page.getByRole('button', {name: 'Duplică șablon'}).click();
  await page.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page.locator('#requirement-template-name')).toHaveValue('Subcontractor construcții — copie');
  await expect(page.getByRole('tab', {name: 'Documente necesare (5)'})).toBeVisible();
  await page.getByRole('button', {name: 'Anulează'}).click();
  await page.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page.getByRole('button', {name: /Subcontractor construcții — copie/})).toHaveCount(0);
  await page.getByRole('button', {name: 'Duplică șablon'}).click();
  await page.getByRole('button', {name: 'Salvează șablon'}).click();
  await expect(page.getByRole('heading', {name: 'Subcontractor construcții — copie'})).toBeVisible();
  await page.locator('[data-template-id="construction"]').click();
  await page.getByRole('button', {name: 'Duplică șablon'}).click();
  await expect(page.locator('#requirement-template-name')).toHaveValue('Subcontractor construcții — copie 2');
  await page.getByRole('button', {name: 'Anulează'}).click();
  await page.getByRole('button', {name: 'Renunță la modificări'}).click();
  await page.getByRole('button', {name: 'Șterge șablon'}).click();
  const confirmation = page.getByRole('alertdialog', {name: /Ștergi șablonul/});
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', {name: 'Anulează'}).click();
  await expect(page.getByRole('heading', {name: 'Subcontractor construcții'})).toBeVisible();
  await page.getByRole('button', {name: 'Șterge șablon'}).click();
  await confirmation.getByRole('button', {name: 'Șterge șablonul'}).click();
  await expect(page.locator('[data-template-id="construction"]')).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Furnizor materiale'})).toBeVisible();
});

test('appearance picker stays viewport-contained and keyboard-usable in both locales', async ({page}) => {
  for (const {route, label, title} of [
    {route: '/requirements', label: 'Schimbă iconița și culoarea', title: 'Alege aspectul'},
    {route: '/en/requirements', label: 'Change icon and color', title: 'Choose appearance'}
  ]) {
    await page.goto(route);
    for (const width of [1448, 1024, 758, 600, 375, 320]) {
      await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
      await page.getByRole('button', {name: label}).focus();
      await page.keyboard.press(width === 320 ? 'Space' : 'Enter');
      const picker = page.getByRole('dialog', {name: title});
      await expect(picker).toBeVisible();
      const bounds = await picker.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.keyboard.press('Tab');
      await expect(picker).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(picker).toHaveCount(0);
    }
  }
});

test('custom-document editable icon and popover stay contained at reduced widths in both locales', async ({page}) => {
  for (const {route, custom, label, title} of [
    {route: '/requirements', custom: 'Document personalizat', label: 'Schimbă iconița și culoarea documentului', title: 'Alege aspectul'},
    {route: '/en/requirements', custom: 'Custom document', label: 'Change document icon and color', title: 'Choose appearance'}
  ]) {
    await page.goto(route);
    await page.getByRole('button', {name: route.startsWith('/en') ? 'Add document' : 'Adaugă document'}).click();
    const drawer = page.getByRole('dialog', {name: route.startsWith('/en') ? 'Add document' : 'Adaugă document'});
    await drawer.getByRole('button', {name: custom}).click();
    for (const width of [1448, 758, 600, 375, 320]) {
      await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
      const icon = drawer.getByRole('button', {name: label});
      await icon.focus();
      await page.keyboard.press(width === 320 ? 'Space' : 'Enter');
      const picker = page.getByRole('dialog', {name: title});
      await expect(picker).toBeVisible();
      const bounds = await picker.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      await expect(picker).toHaveCount(0);
      await expect(drawer).toBeVisible();
    }
  }
});
