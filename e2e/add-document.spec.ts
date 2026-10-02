import {expect, test, type Page} from '@playwright/test';

const pdf = {name: 'Manual_document_2026.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nlocal demo')};
const samplePdf = {...pdf, name: 'Certificat_fiscal_CP_2024.pdf'};

async function openDrawer(page: Page, english = false) {
  await page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document'}).click();
  const dialog = page.getByRole('dialog', {name: english ? 'Add document' : 'Adaugă document'});
  await expect(dialog).toBeVisible();
  return dialog;
}

async function metadataGeometry(dialog: ReturnType<Page['getByRole']>) {
  return dialog.locator('[data-add-document-metadata]').evaluate((grid) => {
    const fields = ['number', 'issued', 'expires', 'issuer'].map((name) => {
      const input = grid.querySelector<HTMLInputElement>(`#add-document-${name}`)!;
      const wrapper = input.parentElement!;
      const label = wrapper.querySelector('label')!;
      const bounds = wrapper.getBoundingClientRect();
      const control = input.getBoundingClientRect();
      return {x: bounds.x, y: bounds.y, width: bounds.width, bottom: bounds.bottom, labelY: label.getBoundingClientRect().y, controlY: control.y, controlHeight: control.height};
    });
    const type = document.querySelector('#add-document-type')!.parentElement!.getBoundingClientRect();
    const company = document.querySelector('#add-document-company')!.getBoundingClientRect();
    const gridBounds = grid.getBoundingClientRect();
    return {gridX: gridBounds.x, gridWidth: gridBounds.width, fullWidthFields: [{x: type.x, width: type.width}, {x: company.x, width: company.width}], fields};
  });
}

test('validates files and optional dates, then maps a manual upload across both document views', async ({page}) => {
  await page.goto('/vendors/construct-pro');
  const dialog = await openDrawer(page);
  await expect(dialog.getByRole('textbox', {name: 'Numele companiei'})).toHaveValue('Construct Pro SRL');
  await expect(dialog.getByRole('textbox', {name: 'Numele companiei'})).toHaveAttribute('readonly', '');
  await expect(dialog.getByRole('checkbox', {name: 'Încearcă extragerea automată a datelor'})).not.toBeChecked();
  await expect(dialog.getByRole('button', {name: 'Încarcă și continuă'})).toBeDisabled();
  await dialog.locator('input[type=file]').setInputFiles({name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('bad')});
  await expect(dialog.getByText('Alege un fișier PDF, JPG, JPEG sau PNG valid.')).toBeVisible();
  await dialog.locator('input[type=file]').setInputFiles({name: 'huge.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1)});
  await expect(dialog.getByText('Fișierul nu poate depăși 10 MB.')).toBeVisible();
  const dropzone = dialog.locator('[data-add-document-dropzone]');
  await dropzone.evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['%PDF-1.4\nlocal demo'], 'Manual_document_2026.pdf', {type: 'application/pdf'}));
    element.dispatchEvent(new DragEvent('dragenter', {bubbles: true, dataTransfer: transfer}));
  });
  await expect(dropzone).toHaveAttribute('data-dragging', 'true');
  await dropzone.evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['%PDF-1.4\nlocal demo'], 'Manual_document_2026.pdf', {type: 'application/pdf'}));
    element.dispatchEvent(new DragEvent('drop', {bubbles: true, dataTransfer: transfer}));
  });
  await expect(dropzone).not.toHaveAttribute('data-dragging');
  await expect(dialog.getByRole('button', {name: 'Încarcă și continuă'})).toBeDisabled();
  await dialog.getByRole('combobox', {name: /Tip document/}).selectOption('tax');
  await dialog.getByRole('textbox', {name: 'Data emiterii'}).fill('02.03.2026');
  await dialog.getByRole('textbox', {name: 'Data expirării'}).fill('01.03.2026');
  await dialog.getByRole('button', {name: 'Încarcă și continuă'}).click();
  await expect(dialog.getByText('Data expirării nu poate fi înainte de data emiterii.')).toBeVisible();
  const errorGrid = await metadataGeometry(dialog);
  expect(errorGrid.fields[2]!.labelY).toBeCloseTo(errorGrid.fields[3]!.labelY, 0);
  expect(errorGrid.fields[2]!.controlY).toBeCloseTo(errorGrid.fields[3]!.controlY, 0);
  await dialog.getByRole('textbox', {name: 'Data expirării'}).fill('02.03.2027');
  await dialog.getByRole('button', {name: 'Încarcă și continuă'}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/vendors\/construct-pro$/);
  const vendorRow = page.getByRole('row', {name: /Certificat fiscal.*Necesită revizuire/}).first();
  await expect(vendorRow).toBeVisible();
  await expect(vendorRow).toContainText('02 mar. 2026');
  await expect(vendorRow).toContainText('02 mar. 2027');
  await expect(vendorRow).toContainText('Manual_document_2026.pdf');
  await expect(page.getByText('3 din 5 documente valide')).toBeVisible();
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Documente'}).click();
  await expect(page.getByRole('row', {name: /Manual_document_2026.pdf/})).toContainText('Construct Pro SRL');
  await expect(page.getByRole('row', {name: /Manual_document_2026.pdf/})).toContainText('Necesită revizuire');
  await expect(page.getByRole('button', {name: 'Toate documentele 25'})).toBeVisible();
});

test('exact demo fixture extraction opens review with the newly created document context', async ({page}) => {
  await page.goto('/vendors/construct-pro');
  const dialog = await openDrawer(page);
  await dialog.locator('input[type=file]').setInputFiles(samplePdf);
  await dialog.getByRole('combobox', {name: /Tip document/}).selectOption('tax');
  await expect(dialog.getByRole('textbox', {name: 'Număr document'})).toHaveValue('');
  await dialog.getByRole('checkbox', {name: 'Încearcă extragerea automată a datelor'}).check();
  await expect(dialog.getByRole('textbox', {name: 'Număr document'})).toHaveValue('123456');
  const extractionGrid = await metadataGeometry(dialog);
  expect(extractionGrid.fields[0]!.x).toBeCloseTo(extractionGrid.fields[2]!.x, 0);
  expect(extractionGrid.fields[1]!.x).toBeCloseTo(extractionGrid.fields[3]!.x, 0);
  await expect(dialog.getByRole('textbox', {name: 'Data emiterii'})).toHaveValue('12.03.2024');
  await dialog.getByRole('checkbox', {name: 'Încearcă extragerea automată a datelor'}).uncheck();
  await expect(dialog.getByRole('textbox', {name: 'Număr document'})).toHaveValue('');
  await dialog.getByRole('checkbox', {name: 'Încearcă extragerea automată a datelor'}).check();
  await expect(dialog.getByRole('textbox', {name: 'Număr document'})).toHaveValue('123456');
  await dialog.getByRole('button', {name: 'Încarcă și continuă'}).click();
  await expect(page).toHaveURL(/\/documents\/local-document-[a-f0-9-]+\/review$/);
  await expect(page.getByText('Simulare locală, fără AI')).toBeVisible();
  await expect(page.getByText('Fișierul nu este stocat.', {exact: false})).toBeVisible();
  await expect(page.getByRole('textbox', {name: /Număr document/})).toHaveValue('123456');
  await page.getByRole('link', {name: 'Înapoi la documente'}).click();
  await expect(page.getByRole('row', {name: /Certificat_fiscal_CP_2024.pdf/}).first()).toContainText('Necesită revizuire');
});

test('English and drawer responsive/focus behavior retain shared semantics', async ({page}) => {
  await page.goto('/en/vendors/construct-pro');
  for (const width of [1448, 1024, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : 768});
    const dialog = await openDrawer(page, true);
    const metadata = await metadataGeometry(dialog);
    const [number, issued, expires, issuer] = metadata.fields;
    for (const field of metadata.fullWidthFields) {
      expect(field.x).toBeCloseTo(metadata.gridX, 0);
      expect(field.width).toBeCloseTo(metadata.gridWidth, 0);
    }
    expect([number, issued, expires, issuer].map((field) => field!.controlHeight)).toEqual([40, 40, 40, 40]);
    if (width >= 600) {
      expect(number!.width).toBeCloseTo(issued!.width, 0);
      expect(number!.x).toBeCloseTo(expires!.x, 0);
      expect(issued!.x).toBeCloseTo(issuer!.x, 0);
      expect(number!.labelY).toBeCloseTo(issued!.labelY, 0);
      expect(number!.controlY).toBeCloseTo(issued!.controlY, 0);
      expect(expires!.labelY).toBeCloseTo(issuer!.labelY, 0);
      expect(expires!.controlY).toBeCloseTo(issuer!.controlY, 0);
      expect(expires!.y).toBeGreaterThan(number!.bottom);
    } else {
      expect(metadata.fields.map((field) => field.x)).toEqual([number!.x, number!.x, number!.x, number!.x]);
      expect(metadata.fields.map((field) => field.width)).toEqual([number!.width, number!.width, number!.width, number!.width]);
      expect(number!.bottom).toBeLessThan(issued!.y);
      expect(issued!.bottom).toBeLessThan(expires!.y);
      expect(expires!.bottom).toBeLessThan(issuer!.y);
    }
    await expect(dialog.getByRole('button', {name: 'Upload and continue'})).toBeDisabled();
    const geometry = await dialog.evaluate((element) => ({left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, documentWidth: document.documentElement.scrollWidth, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight}));
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width + 1);
    expect(geometry.documentWidth).toBeLessThanOrEqual(width);
    if (width <= 1024) expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
    const action = dialog.locator('[data-add-document-actions]');
    expect(await action.evaluate((element) => getComputedStyle(element).position)).toBe('static');
    await dialog.evaluate((element) => {element.scrollTop = element.scrollHeight;});
    await expect(action).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', {name: 'Add document'})).toBeFocused();
  }
});

test('English manual creation keeps optional metadata empty and maps its own vendor', async ({page}) => {
  await page.goto('/en/vendors/construct-pro');
  const dialog = await openDrawer(page, true);
  await dialog.locator('input[type=file]').setInputFiles({name: 'Registration_local.png', mimeType: 'image/png', buffer: Buffer.from('local image demo')});
  await dialog.getByRole('combobox', {name: /Document type/}).selectOption('registration');
  await dialog.getByRole('button', {name: 'Upload and continue'}).click();
  await expect(page.getByRole('row', {name: /Registration certificate.*Needs review/}).first()).toContainText('Registration_local.png');
  await page.getByRole('navigation', {name: 'Application navigation'}).getByRole('link', {name: 'Documents'}).click();
  const row = page.getByRole('row', {name: /Registration_local.png/});
  await expect(row).toContainText('Construct Pro SRL');
  await expect(row).toContainText('Needs review');
  await expect(row).toContainText('—');
});
