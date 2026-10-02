import {expect, test, type Page} from '@playwright/test';

async function openPreview(page: Page, english = false) {
  await page.getByRole('tab', {name: english ? 'Preview' : 'Previzualizare', exact: true}).click();
  const panel = page.locator('#preview-panel');
  await expect(panel).toBeVisible();
  return panel;
}

test('previews current requirements read-only with safe supplier context in RO and EN', async ({page}) => {
  for (const english of [false, true]) {
    await page.goto(english ? '/en/requirements' : '/requirements');
    const save = page.getByRole('button', {name: english ? 'Save template' : 'Salvează șablon'});
    await expect(save).toBeDisabled();
    const preview = await openPreview(page, english);
    await expect(preview.getByRole('heading', {name: english ? 'Supplier preview' : 'Previzualizare pentru furnizor'})).toBeVisible();
    await expect(preview.locator('[data-supplier-context]')).toContainText('Demo Company SRL');
    await expect(preview.locator('[data-supplier-context]')).toContainText('SC Construct Expert SRL');
    await expect(preview.locator('[data-supplier-context] > div')).toHaveCount(2);
    await expect(preview).not.toContainText(english ? 'Construction subcontractor' : 'Subcontractor construcții');
    await expect(preview).not.toContainText(english ? 'EXPIRY ALERT' : 'ALERTĂ EXPIRARE');
    await expect(preview.locator('input, select, textarea, [data-editable-appearance]')).toHaveCount(0);
    await expect(preview.locator('[data-document-id]')).toHaveCount(5);
    await expect(preview).toContainText(english ? 'Company registration certificate (ONRC)' : 'Certificatul de înregistrare al companiei (ONRC)');
    await expect(preview.locator('[data-status="uploaded"]')).toHaveCount(2);
    await expect(preview.locator('[data-status="in_review"]')).toHaveText(english ? 'In review' : 'În review');
    await expect(preview.locator('[data-status="missing"]')).toHaveCount(2);
    await expect(preview.locator('[data-required="true"]')).toHaveCount(4);
    await expect(preview.locator('[data-required="false"]')).toHaveText(english ? 'Optional' : 'Opțional');
    await expect(preview.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    await expect(preview).toContainText('certificare_iso.pdf');
    await expect(preview).toContainText(english ? 'Uploaded on 30 Sept 2026, 16:03' : 'Încărcat pe 30 sept. 2026, 16:03');
    for (const button of await preview.getByRole('button').all()) await expect(button).toBeDisabled();
    await expect(save).toBeDisabled();
    // Keyboard tab activation must work without introducing a dirty edit.
    const tab = page.getByRole('tab', {name: english ? 'Preview' : 'Previzualizare'});
    await tab.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab', {name: /Documente necesare|Required documents/})).toBeFocused();
    await expect(page.getByRole('table')).toBeVisible();
    await page.keyboard.press('End');
    await expect(tab).toBeFocused();
    await expect(preview).toBeVisible();
    await expect(save).toBeDisabled();
  }
});

test('reflects unsaved additions, removals, custom metadata, optionality and appearance; Cancel restores committed rules', async ({page}) => {
  await page.goto('/requirements');
  const originalRow = page.getByRole('row').filter({hasText: 'Certificat de înregistrare'});
  const originalAppearance = await originalRow.locator('[data-color]').getAttribute('data-color');
  await originalRow.getByRole('checkbox').focus();
  await page.keyboard.press('Space');
  await expect(originalRow.getByRole('checkbox')).not.toBeChecked();
  await page.getByRole('button', {name: 'Elimină documentul Declarație SSM'}).click();
  await page.getByRole('button', {name: 'Adaugă document'}).click();
  const drawer = page.getByRole('dialog', {name: 'Adaugă document'});
  await drawer.getByRole('button', {name: 'Document personalizat'}).click();
  await drawer.getByRole('textbox', {name: /Nume document/}).fill('Aviz staged');
  await drawer.getByRole('button', {name: 'Adaugă documentul'}).click();
  await expect(drawer).toHaveCount(0);
  await page.getByRole('button', {name: 'Editează documentul personalizat Aviz staged'}).click();
  await page.locator('#requirement-custom-name').fill('Aviz actualizat');
  await page.locator('#requirement-custom-issuer').fill('Internal issuer');
  await page.locator('#requirement-custom-name').locator('..').locator('..').getByRole('button', {name: 'Schimbă iconița și culoarea documentului'}).click();
  const picker = page.getByRole('dialog', {name: 'Alege aspectul'});
  await picker.getByRole('button', {name: 'Unelte', exact: true}).click();
  await picker.getByRole('button', {name: 'Turcoaz', exact: true}).click();
  await page.keyboard.press('Escape');
  await page.locator('textarea').last().fill('Descriere staged');
  const customRow = page.getByRole('row').filter({hasText: 'Aviz actualizat'});
  await customRow.getByRole('checkbox').focus();
  await page.keyboard.press('Space');
  await expect(customRow.getByRole('checkbox')).not.toBeChecked();
  const customIcon = await customRow.locator('[data-color]').innerHTML();
  const preview = await openPreview(page);
  const registration = preview.locator('[data-document-id]').filter({hasText: 'Certificat de înregistrare'});
  await expect(registration.locator('[data-required]')).toHaveText('Opțional');
  await expect(registration.locator('[data-color]')).toHaveAttribute('data-color', originalAppearance!);
  await expect(preview).not.toContainText('Declarație SSM');
  const custom = preview.locator('[data-document-id]').filter({hasText: 'Aviz actualizat'});
  await expect(custom).toContainText('Descriere staged');
  await expect(custom).not.toContainText('Internal issuer');
  await expect(custom.locator('[data-required]')).toHaveText('Opțional');
  await expect(custom.locator('[data-status]')).toHaveText('Lipsește');
  await expect(custom.locator('[data-color]')).toHaveAttribute('data-color', 'teal');
  expect(await custom.locator('[data-color]').innerHTML()).toBe(customIcon);
  await expect(page.locator('[data-template-id="construction"]')).not.toContainText('Aviz actualizat');
  await page.getByRole('button', {name: 'Anulează', exact: true}).click();
  await expect(preview.locator('[data-document-id]')).toHaveCount(5);
  await expect(preview).not.toContainText('Aviz actualizat');
  await expect(preview).toContainText('Declarație SSM');
  await expect(registration.locator('[data-required]')).toHaveText('Obligatoriu');
  await expect(page.getByRole('button', {name: 'Salvează șablon'})).toBeDisabled();
});

test('new-template empty preview stays compact and reflects staged additions before Save', async ({page}) => {
  await page.goto('/en/requirements');
  await page.getByRole('button', {name: 'New template', exact: true}).click();
  let preview = await openPreview(page, true);
  await expect(preview.getByRole('heading', {name: 'No documents requested'})).toBeVisible();
  await expect(preview.locator('[data-document-id]')).toHaveCount(0);
  await expect(preview.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(preview.getByRole('button')).toHaveCount(0);
  await page.getByRole('tab', {name: 'Required documents (0)'}).click();
  await page.locator('#requirement-template-name').fill('Private template name');
  await page.locator('#requirement-template-category').selectOption('software');
  await page.getByRole('button', {name: 'Add document'}).click();
  await page.getByRole('dialog', {name: 'Add document'}).getByRole('button', {name: 'Add document', exact: true}).click();
  preview = await openPreview(page, true);
  await expect(preview.locator('[data-document-id]')).toHaveCount(1);
  await expect(preview).not.toContainText('Private template name');
  await expect(preview).not.toContainText('Software and IT');
  await expect(page.locator('[data-template-id]').filter({hasText: 'Private template name'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Save template'}).click();
  await expect(page.locator('[data-template-id]').filter({hasText: 'Private template name'})).toBeVisible();
  await expect(preview.locator('[data-document-id]')).toHaveCount(1);
});

test('shares row identity/appearance with Portal, separates optionality/status and retains local upload validation', async ({page}) => {
  for (const english of [false, true]) {
    await page.goto(english ? '/en/requirements' : '/requirements');
    const preview = await openPreview(page, english);
    const identity = preview.locator('[data-document-id]').filter({hasText: english ? 'Registration certificate' : 'Certificat de înregistrare'});
    const icon = await identity.locator('[data-color]').innerHTML();
    const color = await identity.locator('[data-color]').getAttribute('data-color');
    await page.goto(`${english ? '/en' : ''}/upload/demo-construct-pro`);
    const portal = page.locator('[data-supplier-requirements]');
    await expect(page.getByRole('heading', {name: english ? 'Supplier preview' : 'Previzualizare pentru furnizor'})).toHaveCount(0);
    const document = (id: string) => portal.locator(`[data-document-id="vendor-requirement:construct-pro:${id}"]`);
    await expect(document('registration').locator('[data-color]')).toHaveAttribute('data-color', color!);
    expect(await document('registration').locator('[data-color]').innerHTML()).toBe(icon);
    await expect(document('iso').locator('[data-required]')).toHaveText(english ? 'Optional' : 'Opțional');
    await expect(document('fire').locator('[data-status]')).toHaveText(english ? 'Uploaded' : 'Încărcat');
    await expect(document('tax').locator('[data-status]')).toHaveText(english ? 'In review' : 'În review');
    await expect(document('tax')).toContainText('Certificat_fiscal_CP_2024.pdf');
    await expect(document('tax')).toContainText(english ? 'Tax certificate issued by ANAF.' : 'Certificat fiscal emis de ANAF.');
    const missing = document('iso');
    const upload = missing.locator('input[type="file"]');
    await expect(upload).toBeVisible();
    await upload.setInputFiles({name: 'large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1)});
    await expect(missing.getByRole('alert')).toBeVisible();
    await expect(upload).toHaveAttribute('aria-invalid', 'true');
    await upload.setInputFiles({name: 'local.pdf', mimeType: 'application/pdf', buffer: Buffer.from('local')});
    await expect(missing.getByRole('alert')).toHaveCount(0);
    await expect(missing).toContainText('local.pdf');
    await expect(missing.locator('[data-status]')).toHaveText(english ? 'In review' : 'În review');
    await expect(portal.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
    await expect(missing.locator('input[type="file"]')).toHaveCount(0);
    await expect(missing.getByText(english ? 'Upload document' : 'Încarcă document', {exact: true})).toHaveCount(0);
  }
});

test('contains both shared presentations across desktop, reduced and mobile widths in both locales', async ({page}) => {
  for (const english of [false, true]) for (const path of ['/requirements', '/upload/demo-construct-pro']) {
    await page.goto(`${english ? '/en' : ''}${path}`);
    if (path === '/requirements') await openPreview(page, english);
    else await page.locator('[data-document-id="vendor-requirement:construct-pro:iso"] input[type="file"]').setInputFiles({name: `${'long-file-name-'.repeat(15)}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('local')});
    for (const width of [1448, 1200, 1199, 1024, 758, 600, 375, 320]) {
      await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
      const bounds = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll('[data-supplier-context], [data-supplier-requirements], [data-supplier-requirements] article, [data-supplier-requirements] button, [data-supplier-requirements] input')].map((element) => {
          const rect = element.getBoundingClientRect(); return {left: rect.left, right: rect.right};
        })
      }));
      expect(bounds.document, `${path} ${english ? 'EN' : 'RO'} overflow at ${width}`).toBeLessThanOrEqual(width);
      for (const element of bounds.elements) {expect(element.left).toBeGreaterThanOrEqual(0); expect(element.right).toBeLessThanOrEqual(width + 1);}
    }
  }
});
