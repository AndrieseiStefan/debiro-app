import {expect, test, type Page} from '@playwright/test';

async function openSelector(page: Page, english = false) {
  await page.getByRole('button', {name: english ? 'Set up documents from templates' : 'Setează documente din șablon', exact: true}).click();
  return page.getByRole('dialog', {name: english ? 'Set up documents from templates' : 'Setează documente din șablon', exact: true});
}
async function applyConstruction(page: Page, english = false, multiple = false) {
  const drawer = await openSelector(page, english);
  await drawer.getByRole('checkbox', {name: english ? /^Construction subcontractor/ : /^Subcontractor construcții/}).check();
  if (multiple) await drawer.getByRole('checkbox', {name: english ? /^Maintenance services/ : /^Servicii de mentenanță/}).check();
  await drawer.getByRole('button', {name: english ? multiple ? 'Apply 2 templates' : 'Apply 1 template' : multiple ? 'Aplică 2 șabloane' : 'Aplică 1 șablon'}).click();
  const confirmation = page.getByRole('dialog', {name: english ? 'Apply templates' : 'Aplică șabloane', exact: true});
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', {name: english ? 'Apply templates' : 'Aplică șabloanele', exact: true}).click();
  await expect(confirmation).not.toBeVisible();
}
async function createCustomTemplate(page: Page, name: string, documentName = 'Fișă acces șantier') {
  await page.getByRole('button', {name: 'Adaugă șablon nou'}).click();
  await page.locator('#requirement-template-name').fill(name);
  await page.locator('#requirement-template-category').selectOption('construction');
  await page.getByRole('button', {name: 'Adaugă document', exact: true}).click();
  const drawer = page.getByRole('dialog', {name: 'Adaugă document', exact: true});
  await drawer.getByRole('button', {name: 'Document personalizat'}).click();
  await drawer.getByRole('textbox', {name: /Nume document/}).fill(documentName);
  await drawer.getByRole('button', {name: 'Adaugă documentul', exact: true}).click();
  await page.getByRole('button', {name: 'Salvează șablon', exact: true}).click();
  await expect(page.getByRole('heading', {name, exact: true})).toBeVisible();
}
async function goToVendor(page: Page) {
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori', exact: true}).click();
  await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
}

test('preview is non-mutating; multi-template union, provenance-only removal and reapplication are idempotent', async ({page}) => {
  await page.goto('/vendors/construct-pro');
  let drawer = await openSelector(page);
  await expect(drawer.getByRole('checkbox', {name: /^Subcontractor construcții/}).locator('..')).toContainText('5 documente · 2 noi · 3 deja existente');
  await expect(drawer.getByRole('checkbox', {name: /^Furnizor materiale/})).toBeDisabled();
  await drawer.getByRole('checkbox', {name: /^Subcontractor construcții/}).check();
  await drawer.getByRole('button', {name: 'Aplică 1 șablon'}).click();
  await page.getByRole('dialog', {name: 'Aplică șabloane', exact: true}).getByRole('button', {name: 'Înapoi', exact: true}).click();
  drawer = page.getByRole('dialog', {name: 'Setează documente din șablon', exact: true});
  await drawer.getByRole('button', {name: 'Anulează', exact: true}).click();
  await expect(drawer).not.toBeVisible();
  await expect(page.locator('[data-requirement-id]')).toHaveCount(5);
  await expect(page.getByRole('button', {name: /^Elimină asocierea cu/})).toHaveCount(0);
  const tax = page.getByRole('row').filter({hasText: 'Certificat fiscal'});
  const originalTaxText = await tax.innerText();
  await applyConstruction(page, false, true);
  await expect(page.locator('[data-requirement-id]')).toHaveCount(7);
  await expect(page.getByRole('status')).toContainText('2 documente noi din 2 șabloane');
  await expect(page.getByRole('status')).toContainText('3 documente existau deja.');
  await expect(page.getByRole('button', {name: /^Elimină asocierea cu/})).toHaveCount(2);
  const table = page.locator('[data-requirement-id]').first().locator('xpath=ancestor::table/parent::*');
  expect(await table.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await tax.innerText()).toBe(originalTaxText);
  const rowsBefore = await page.locator('[data-requirement-id]').allTextContents();
  await page.getByRole('button', {name: 'Elimină asocierea cu Subcontractor construcții', exact: true}).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toContainText('Documentele și cerințele deja adăugate furnizorului vor rămâne neschimbate.');
  await confirm.getByRole('button', {name: 'Elimină asocierea', exact: true}).click();
  expect(await page.locator('[data-requirement-id]').allTextContents()).toEqual(rowsBefore);
  await applyConstruction(page);
  await expect(page.getByRole('status')).toContainText('0 documente noi');
  await expect(page.locator('[data-requirement-id]')).toHaveCount(7);
  await expect(page.getByRole('button', {name: /^Elimină asocierea cu/})).toHaveCount(2);
});

test('missing-row upload locks its type, associates the upload, and destructive removal deletes it everywhere', async ({page}) => {
  await page.goto('/vendors/construct-pro');
  await applyConstruction(page);
  const row = page.getByRole('row').filter({hasText: 'Autorizație de lucru'});
  await row.getByRole('button', {name: 'Încarcă', exact: true}).click();
  const upload = page.getByRole('dialog', {name: 'Adaugă document', exact: true});
  await expect(upload.locator('#add-document-type')).toHaveValue('permit');
  await expect(upload.locator('#add-document-type')).toBeDisabled();
  await expect(upload.getByRole('checkbox')).not.toBeChecked();
  await upload.locator('input[type=file]').setInputFiles({name: 'work-permit.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF local test')});
  await upload.getByRole('button', {name: 'Încarcă și continuă'}).click();
  await expect(row).toContainText('Necesită revizuire');
  await expect(row).toContainText('work-permit.pdf');
  await expect(page.locator('[data-requirement-id]')).toHaveCount(7);
  await row.getByRole('button', {name: 'Acțiuni pentru Autorizație de lucru'}).click();
  await page.getByRole('menuitem', {name: 'Elimină cerința'}).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toHaveAccessibleName('Ștergi această cerință și documentul asociat?');
  await expect(confirm).toContainText('Această acțiune va elimina cerința și documentul încărcat asociat.');
  await confirm.getByRole('button', {name: 'Renunță'}).click();
  await expect(row).toContainText('work-permit.pdf');
  await row.getByRole('button', {name: 'Acțiuni pentru Autorizație de lucru'}).click();
  await page.getByRole('menuitem', {name: 'Elimină cerința'}).click();
  await confirm.getByRole('button', {name: 'Șterge documentul'}).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Documente', exact: true}).click();
  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByRole('row').filter({hasText: 'work-permit.pdf'})).toHaveCount(0);
});

test('empty requirement removal confirms, keyboard focus is retained, and category Save preserves configuration', async ({page}) => {
  await page.goto('/vendors/construct-pro');
  await applyConstruction(page);
  const row = page.getByRole('row').filter({hasText: 'Declarație SSM'});
  await row.getByRole('button', {name: 'Acțiuni pentru Declarație SSM'}).click();
  await page.getByRole('menuitem', {name: 'Elimină cerința'}).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toHaveAccessibleName('Elimini această cerință?');
  await expect(confirm.getByRole('button', {name: 'Renunță'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(row.getByRole('button', {name: 'Acțiuni pentru Declarație SSM'})).toBeFocused();
  await row.getByRole('button', {name: 'Acțiuni pentru Declarație SSM'}).click();
  await page.getByRole('menuitem', {name: 'Elimină cerința'}).click();
  await confirm.getByRole('button', {name: 'Elimină cerința'}).click();
  await expect(row).toHaveCount(0);
  const saved = await page.locator('[data-requirement-id]').allTextContents();
  await page.getByRole('button', {name: 'Editează furnizor'}).click();
  const edit = page.getByRole('dialog', {name: 'Editează furnizor'});
  await expect(edit.locator('[data-category-warning]')).toHaveCount(0);
  await edit.locator('#edit-vendor-category').selectOption('software');
  await expect(edit.locator('[data-category-warning]')).toContainText('Schimbarea categoriei poate afecta relevanța documentelor');
  await edit.getByRole('button', {name: 'Salvează modificările'}).click();
  await expect(edit).not.toBeVisible();
  expect(await page.locator('[data-requirement-id]').allTextContents()).toEqual(saved);
  await expect(page.getByRole('button', {name: 'Elimină asocierea cu Subcontractor construcții'})).toBeVisible();
  const drawer = await openSelector(page);
  await expect(drawer.getByRole('checkbox', {name: /^Subcontractor construcții/})).toBeDisabled();
  await expect(drawer.getByRole('checkbox', {name: /^Servicii IT/})).toBeEnabled();
});

test('custom identity is reused across templates and uploads; later template edits leave vendor snapshots unchanged', async ({page}) => {
  await page.goto('/requirements');
  await createCustomTemplate(page, 'Acces A');
  await createCustomTemplate(page, 'Acces B', 'FISA ACCES SANTIER');
  await goToVendor(page);
  const drawer = await openSelector(page);
  await drawer.getByRole('checkbox', {name: /^Acces A/}).check();
  await drawer.getByRole('checkbox', {name: /^Acces B/}).check();
  await drawer.getByRole('button', {name: 'Aplică 2 șabloane'}).click();
  await page.getByRole('dialog', {name: 'Aplică șabloane', exact: true}).getByRole('button', {name: 'Aplică șabloanele'}).click();
  await expect(page.getByRole('status')).toContainText('A fost adăugat 1 document nou din 2 șabloane.');
  const custom = page.getByRole('row').filter({hasText: 'Fișă acces șantier'});
  await expect(custom).toHaveCount(1);
  await expect(custom).toContainText('Șablon: Acces A'); await expect(custom).toContainText('Șablon: Acces B');
  const before = await custom.innerText();
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Cerințe', exact: true}).click();
  await page.getByRole('button', {name: /^Acces A/}).click();
  await page.locator('#requirement-template-name').fill('Acces A schimbat');
  await page.getByRole('button', {name: 'Salvează șablon', exact: true}).click();
  await goToVendor(page);
  expect(await custom.innerText()).toBe(before);
  await page.getByRole('button', {name: 'Adaugă document', exact: true}).click();
  const upload = page.getByRole('dialog', {name: 'Adaugă document', exact: true});
  const option = upload.locator('option').filter({hasText: 'Fișă acces șantier'});
  await expect(option).toHaveCount(1);
  const id = await option.getAttribute('value');
  expect(id).toMatch(/^company-document-type-/);
  await upload.locator('#add-document-type').selectOption(id!);
  await upload.locator('input[type=file]').setInputFiles({name: 'site-access.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF test')});
  await upload.getByRole('button', {name: 'Încarcă și continuă'}).click();
  await expect(custom).toContainText('site-access.pdf');
  await expect(custom).toContainText('Necesită revizuire');
  await expect(custom).toHaveCount(1);
});

test('English selection/upload/removal and narrow drawer/modal containment follow the same contracts', async ({page}) => {
  await page.goto('/en/vendors/construct-pro');
  for (const width of [1448, 1024, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    const drawer = await openSelector(page, true);
    expect(await drawer.evaluate((element) => element.scrollWidth <= element.clientWidth && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await drawer.getByRole('checkbox', {name: /^Construction subcontractor/}).check();
    await drawer.getByRole('button', {name: 'Apply 1 template'}).click();
    const summary = page.getByRole('dialog', {name: 'Apply templates', exact: true});
    for (const dialog of [summary]) {
      const dimensions = await dialog.evaluate((element) => ({left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, overflow: element.scrollWidth > element.clientWidth, page: document.documentElement.scrollWidth}));
      expect(dimensions.left).toBeGreaterThanOrEqual(0); expect(dimensions.right).toBeLessThanOrEqual(width); expect(dimensions.overflow).toBe(false); expect(dimensions.page).toBeLessThanOrEqual(width);
    }
    await page.keyboard.press('Escape');
    await expect(summary).not.toBeVisible();
    await expect(page.getByRole('button', {name: 'Set up documents from templates', exact: true})).toBeFocused();
  }
  await applyConstruction(page, true);
  const row = page.getByRole('row').filter({hasText: 'Work permit'});
  await row.getByRole('button', {name: 'Upload', exact: true}).click();
  await expect(page.locator('#add-document-type')).toHaveValue('permit');
  await page.keyboard.press('Escape');
  await row.getByRole('button', {name: 'Actions for Work permit'}).click();
  await page.getByRole('menuitem', {name: 'Remove requirement'}).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toHaveAccessibleName('Remove this requirement?');
  expect(await confirm.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await confirm.getByRole('button', {name: 'Remove requirement'}).click();
  await expect(row).toHaveCount(0);
});

test('no-compatible empty state links safely to Requirements and company switches do not leak vendor data', async ({page}) => {
  await page.goto('/vendors/global-clean');
  const drawer = await openSelector(page);
  await expect(drawer).toContainText('Nu există șabloane compatibile cu această categorie.');
  await expect(drawer.getByRole('checkbox')).toHaveCount(6);
  for (const checkbox of await drawer.getByRole('checkbox').all()) await expect(checkbox).toBeDisabled();
  await drawer.getByRole('link', {name: 'Vezi cerințele'}).click();
  await expect(page).toHaveURL(/\/requirements$/);
  await goToVendor(page);
  await applyConstruction(page);
  await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
  await page.getByRole('dialog', {name: 'Schimbă compania'}).locator('[data-company-switch-id]:not([aria-pressed="true"])').first().click();
  await expect(page.locator('[data-requirement-id]')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Setează documente din șablon'})).toHaveCount(0);
});

test('new vendors receive explicit setup and general catalog uploads without automatic assignment', async ({page}) => {
  await page.goto('/vendors');
  await page.getByRole('button', {name: 'Adaugă furnizor', exact: true}).click();
  const create = page.getByRole('dialog', {name: 'Adaugă furnizor', exact: true});
  await create.locator('#add-vendor-name').fill('Assignment Test SRL');
  await create.locator('#add-vendor-cui').fill('RO24681357');
  await create.locator('#add-vendor-email').fill('contact@example.com');
  await create.locator('#add-vendor-category').selectOption('construction');
  await create.getByRole('button', {name: 'Adaugă furnizor', exact: true}).click();
  await expect(page.locator('[data-requirement-id]')).toHaveCount(0);
  await expect(page.locator('[data-vendor-status]')).toContainText('Nu sunt cerințe configurate');
  await page.getByRole('searchbox', {name: 'Caută documente', exact: true}).fill('no-matching-document');
  await page.getByRole('button', {name: 'Adaugă document', exact: true}).click();
  const upload = page.getByRole('dialog', {name: 'Adaugă document', exact: true});
  await upload.locator('#add-document-type').selectOption('iso');
  await upload.locator('input[type=file]').setInputFiles({name: 'iso.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF test')});
  await upload.getByRole('button', {name: 'Încarcă și continuă'}).click();
  await expect(page.locator('[data-requirement-id]')).toHaveCount(1);
  await expect(page.getByRole('searchbox', {name: 'Caută documente', exact: true})).toHaveValue('');
  await applyConstruction(page);
  await expect(page.locator('[data-requirement-id]')).toHaveCount(5);
  await expect(page.locator('[data-vendor-status]')).not.toContainText('Nu sunt cerințe configurate');
  await expect(page.getByRole('row').filter({hasText: 'Certificare ISO 9001'})).toContainText('iso.pdf');
});

test('deleting a seeded uploaded requirement removes its summary and prevents stale Review access on client Back', async ({page}) => {
  await page.goto('/documents/construct-pro-tax-2024/review');
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori', exact: true}).click();
  await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
  const tax = page.getByRole('row').filter({hasText: 'Certificat fiscal'});
  await tax.getByRole('button', {name: 'Acțiuni pentru Certificat fiscal'}).click();
  await page.getByRole('menuitem', {name: 'Elimină cerința'}).click();
  await page.getByRole('alertdialog').getByRole('button', {name: 'Șterge documentul'}).click();
  await expect(tax).toHaveCount(0);
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Documente', exact: true}).click();
  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByRole('row').filter({hasText: 'Certificat_fiscal_CP_2024.pdf'})).toHaveCount(0);
  await page.goBack(); await expect(page).toHaveURL(/\/vendors\/construct-pro$/);
  await page.goBack(); await expect(page).toHaveURL(/\/vendors$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/documents\/construct-pro-tax-2024\/review$/);
  await expect(page.getByText('Documentul local nu mai este disponibil.', {exact: false})).toBeVisible();
});
