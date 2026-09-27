import {expect, test, type Page} from '@playwright/test';

async function openDrawer(page: Page, language: 'ro' | 'en' = 'ro') {
  await page.getByRole('button', {name: language === 'ro' ? 'Adaugă furnizor' : 'Add supplier'}).click();
  const dialog = page.getByRole('dialog', {name: language === 'ro' ? 'Adaugă furnizor' : 'Add supplier'});
  await expect(dialog).toBeVisible();
  return dialog;
}

test('validates required fields and creates a setup-needed vendor without inherited data', async ({page}) => {
  await page.goto('/vendors');
  const dialog = await openDrawer(page);
  await dialog.getByRole('button', {name: 'Adaugă furnizor'}).click();
  await expect(dialog.getByText('Introdu numele furnizorului.')).toBeVisible();
  await expect(dialog.getByText('Introdu CUI-ul sau codul fiscal.')).toBeVisible();
  await expect(dialog.getByText('Introdu emailul de contact.')).toBeVisible();
  await expect(dialog.getByText('Selectează categoria furnizorului.')).toBeVisible();
  await expect(page).toHaveURL(/\/vendors$/);

  await dialog.getByRole('textbox', {name: /Numele furnizorului/}).fill('  Atlas Furnizare SRL  ');
  await dialog.getByRole('textbox', {name: /CUI \/ Cod fiscal/}).fill('  RO99001122  ');
  await dialog.getByRole('textbox', {name: /Email de contact/}).fill('invalid');
  await dialog.getByRole('combobox', {name: /Categorie/}).selectOption('software');
  await dialog.getByRole('button', {name: 'Adaugă furnizor'}).click();
  await expect(dialog.getByText('Introdu o adresă de email validă.')).toBeVisible();
  await dialog.getByRole('textbox', {name: /Email de contact/}).fill('contact@atlas.example');
  await dialog.getByRole('button', {name: 'Adaugă furnizor'}).click();

  await expect(page).toHaveURL(/\/vendors\/local-[a-f0-9-]+$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Atlas Furnizare SRL'})).toBeVisible();
  await expect(page.getByText('CUI RO99001122')).toBeVisible();
  await expect(page.getByText('Necesită configurare')).toBeVisible();
  await expect(page.getByText('Nu sunt cerințe configurate')).toBeVisible();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(1);
  await expect(page.getByText('Nu există documente încă.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Invită furnizor'})).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('tab', {name: 'Note'})).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('contact@atlas.example')).toBeVisible();
  await expect(page.getByText('Persoană de contact', {exact: true})).toHaveCount(0);

  await page.getByRole('navigation', {name: 'Navigare pe pagină'}).getByRole('link', {name: 'Furnizori'}).click();
  await expect(page).toHaveURL(/\/vendors$/);
  const row = page.getByRole('row', {name: /Atlas Furnizare SRL/});
  await expect(row).toBeVisible();
  await expect(row).toContainText('RO99001122');
  await expect(row).toContainText('IT & Software');
  await expect(row).toContainText('0/0');
  await expect(row).toContainText('—');
  await row.getByRole('link', {name: 'Detalii pentru Atlas Furnizare SRL'}).click();
  await expect(page.getByRole('heading', {level: 1, name: 'Atlas Furnizare SRL'})).toBeVisible();
});

test('retains optional details and notes without conflating category and industry', async ({page}) => {
  await page.goto('/en/vendors');
  const dialog = await openDrawer(page, 'en');
  await dialog.getByRole('textbox', {name: /Supplier name/}).fill('Blue Ridge SRL');
  await dialog.getByRole('textbox', {name: /CUI \/ Tax ID/}).fill('RO11220033');
  await dialog.getByRole('textbox', {name: /Trade Register number/}).fill('J40/55/2026');
  await dialog.getByRole('textbox', {name: /Contact email/}).fill('hello@blueridge.example');
  await dialog.getByRole('textbox', {name: /Phone/}).fill('+40 722 111 222');
  await dialog.getByRole('textbox', {name: /Contact person/}).fill('Mara Ionescu');
  await dialog.getByRole('combobox', {name: /Category/}).selectOption('construction');
  await dialog.getByRole('textbox', {name: /Industry/}).fill('Infrastructure services');
  await dialog.getByRole('textbox', {name: /Address/}).fill('12 River Street');
  await dialog.getByRole('textbox', {name: /Website/}).fill('bad url');
  await dialog.getByRole('textbox', {name: /Notes/}).fill('Preferred local contact.');
  await dialog.getByRole('button', {name: 'Add supplier', exact: true}).click();
  await expect(dialog.getByText('Enter a valid website URL.')).toBeVisible();
  await dialog.getByRole('textbox', {name: /Website/}).fill('https://blueridge.example');
  await dialog.getByRole('button', {name: 'Add supplier', exact: true}).click();

  await expect(page).toHaveURL(/\/en\/vendors\/local-[a-f0-9-]+$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Blue Ridge SRL'})).toBeVisible();
  await expect(page.getByText('J40/55/2026')).toBeVisible();
  await expect(page.getByText('Construction', {exact: true})).toBeVisible();
  await expect(page.getByText('Industry: Infrastructure services')).toBeVisible();
  await expect(page.getByText('Mara Ionescu')).toBeVisible();
  await expect(page.getByText('+40 722 111 222')).toBeVisible();
  await expect(page.getByText('12 River Street')).toBeVisible();
  await expect(page.getByRole('link', {name: 'https://blueridge.example'})).toHaveAttribute('href', 'https://blueridge.example');
  await page.getByRole('tab', {name: 'Notes'}).click();
  await expect(page.getByRole('tabpanel', {name: 'Notes'})).toContainText('Preferred local contact.');
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page.getByRole('heading', {level: 1, name: 'Blue Ridge SRL'})).toBeVisible();
  await page.getByRole('navigation', {name: 'Navigare pe pagină'}).getByRole('link', {name: 'Furnizori'}).click();
  await expect(page.getByRole('row', {name: /Blue Ridge SRL/})).toContainText('Construcții');
});

test('shares drawer closing, focus, and responsive containment with Invite Vendor', async ({page}) => {
  await page.goto('/vendors');
  for (const width of [1448, 1024, 801, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : 768});
    const dialog = await openDrawer(page);
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toContain('slideIn');
    expect(await page.evaluate(() => document.querySelector('main')?.parentElement?.inert)).toBe(true);
    const geometry = await dialog.evaluate((element) => ({left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, height: element.getBoundingClientRect().height, viewportHeight: innerHeight, documentWidth: document.documentElement.scrollWidth, scrollHeight: element.scrollHeight}));
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width + 1);
    expect(geometry.height).toBe(geometry.viewportHeight);
    expect(geometry.documentWidth).toBeLessThanOrEqual(width);
    expect(geometry.scrollHeight).toBeGreaterThan(geometry.height);
    await dialog.getByRole('button', {name: 'Adaugă furnizor'}).scrollIntoViewIfNeeded();
    await dialog.getByRole('button', {name: 'Adaugă furnizor'}).focus();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', {name: 'Închide adăugarea furnizorului'})).toBeFocused();
    if (width === 1448) await dialog.getByRole('button', {name: 'Închide adăugarea furnizorului'}).click();
    else if (width === 1024) await dialog.getByRole('button', {name: 'Anulează'}).click();
    else await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Adaugă furnizor'})).toBeFocused();
  }
});

test('keeps created Vendor Details contained at the required responsive widths', async ({page}) => {
  await page.goto('/vendors');
  const dialog = await openDrawer(page);
  await dialog.getByRole('textbox', {name: /Numele furnizorului/}).fill('Atelier Verde SRL');
  await dialog.getByRole('textbox', {name: /CUI \/ Cod fiscal/}).fill('RO24681357');
  await dialog.getByRole('textbox', {name: /Email de contact/}).fill('contact@atelierverde.example');
  await dialog.getByRole('combobox', {name: /Categorie/}).selectOption('construction');
  await dialog.getByRole('button', {name: 'Adaugă furnizor'}).click();
  await expect(page.getByRole('heading', {level: 1, name: 'Atelier Verde SRL'})).toBeVisible();
  for (const width of [1448, 1024, 801, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : 768});
    const geometry = await page.evaluate(() => {
      const status = document.querySelector('[data-vendor-status]')!.getBoundingClientRect();
      const actions = document.querySelector('[data-vendor-actions]')!.getBoundingClientRect();
      const statusText = document.querySelector('[data-vendor-status] strong')!.getBoundingClientRect();
      const overlap = status.left < actions.right - 1 && status.right > actions.left + 1 && status.top < actions.bottom - 1 && status.bottom > actions.top + 1;
      return {documentWidth: document.documentElement.scrollWidth, statusTextContained: statusText.right <= status.right + 1 && statusText.bottom <= status.bottom + 1, overlap};
    });
    expect(geometry.documentWidth, `${width}px document overflow`).toBeLessThanOrEqual(width);
    expect(geometry.statusTextContained, `${width}px status text clipped`).toBe(true);
    expect(geometry.overlap, `${width}px header overlap`).toBe(false);
  }
});
