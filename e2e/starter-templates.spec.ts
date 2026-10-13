import {expect, test, type Page} from '@playwright/test';
import {createWorkspaceCompany, switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

async function suggestions(page: Page, english: boolean) {
  await page.getByRole('button', {name: english ? 'New template' : 'Șablon nou', exact: true}).click();
  await expect(page.locator('[data-starter-selector]')).toBeVisible();
}
async function chooseIT(page: Page, english: boolean) {
  await suggestions(page, english);
  await page.locator('[data-starter-id="starter-software"]').click();
  const preview = page.locator('[data-starter-preview]');
  await expect(preview.locator('input, select, textarea, [data-editable-appearance]')).toHaveCount(0);
  await preview.getByRole('button', {name: english ? 'Use this template' : 'Folosește acest șablon'}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#requirement-template-category')).toHaveValue('software');
  await expect(page.getByRole('tab', {name: english ? 'Required documents (4)' : 'Documente necesare (4)'})).toBeVisible();
}

for (const english of [false, true]) {
  test(`${english ? 'EN' : 'RO'} explicit starter use, read-only search/preview, edit, duplicate protection and delete`, async ({page}) => {
    await createWorkspaceCompany(page, 'Starter A', english); await workspaceSection(page, 'requirements', english);
    await expect(page.locator('[data-template-id]')).toHaveCount(0);
    await suggestions(page, english); await expect(page.locator('[data-starter-id]')).toHaveCount(6);
    const search = page.getByRole('searchbox', {name: english ? 'Search DEBIRO suggestions' : 'Caută sugestii DEBIRO'});
    await search.fill(english ? 'hardware' : 'mentenanta'); await expect(page.locator('[data-starter-id]')).toHaveCount(1);
    await search.fill(english ? 'IT services' : 'Servicii IT'); await expect(page.locator('[data-starter-id]')).toHaveCount(1);
    await search.fill('zzzzzz'); await expect(page.locator('[data-starter-id]')).toHaveCount(0);
    await expect(page.getByText(english ? 'No templates match your search.' : 'Nu există șabloane care corespund căutării.')).toBeVisible();
    await search.fill(''); await page.locator('[data-starter-id="starter-software"]').focus(); await page.keyboard.press('Space');
    await expect(page.locator('[data-starter-preview] input, [data-starter-preview] select')).toHaveCount(0);
    await expect(page.getByRole('button', {name: english ? 'Use this template' : 'Folosește acest șablon'})).toBeEnabled();
    await page.getByRole('button', {name: english ? 'Use this template' : 'Folosește acest șablon'}).click();
    const owned = page.locator('[data-template-id]'); await expect(owned).toHaveCount(1);
    const id = await owned.getAttribute('data-template-id'); expect(id).toMatch(/^local-template-/);
    await page.locator('#requirement-template-name').fill('Customized IT');
    await page.getByRole('button', {name: english ? 'Save template' : 'Salvează șablon'}).click();
    await suggestions(page, english); await page.locator('[data-starter-id="starter-software"]').click();
    await expect(page.getByText(english ? 'This template has already been added to the company.' : 'Acest șablon este deja adăugat în companie.')).toBeVisible();
    await expect(page.getByRole('button', {name: english ? 'Use this template' : 'Folosește acest șablon'})).toHaveCount(0);
    await expect(page.locator('[data-starter-preview]')).toContainText(english ? 'IT services' : 'Servicii IT');
    await page.getByRole('button', {name: english ? 'Open template' : 'Deschide șablonul', exact: true}).click();
    await expect(page.locator('#requirement-template-name')).toHaveValue('Customized IT'); await expect(owned).toHaveCount(1);
    await expect(owned).toHaveAttribute('data-template-id', id!);
    await page.getByRole('button', {name: english ? 'Delete template' : 'Șterge șablon'}).click();
    await page.getByRole('alertdialog').getByRole('button', {name: english ? 'Delete template' : 'Șterge șablonul', exact: true}).click();
    await expect(owned).toHaveCount(0); await chooseIT(page, english); await expect(owned).toHaveCount(1);
    expect(await owned.getAttribute('data-template-id')).not.toBe(id);
    await suggestions(page, english); await page.getByRole('button', {name: english ? 'Create new template' : 'Creează șablon nou', exact: true}).click();
    await expect(page.locator('#requirement-template-name')).toHaveValue('');
    await expect(page.locator('#requirement-template-category')).toHaveValue('');
    await expect(page.getByRole('tab', {name: english ? 'Required documents (0)' : 'Documente necesare (0)'})).toBeVisible();
  });

  test(`${english ? 'EN' : 'RO'} selector and preview are contained at desktop, tablet and mobile sizes`, async ({page}) => {
    await createWorkspaceCompany(page, 'Responsive Starter', english); await workspaceSection(page, 'requirements', english);
    await suggestions(page, english);
    for (const width of [1448, 1024, 758, 600, 375, 320]) {
      await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
      await expect(page.locator('[data-starter-id]')).toHaveCount(6);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `selector ${width}`).toBeLessThanOrEqual(width);
      await page.locator('[data-starter-id="starter-construction"]').click();
      await expect(page.locator('[data-starter-preview]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `preview ${width}`).toBeLessThanOrEqual(width);
      const use = page.getByRole('button', {name: english ? 'Use this template' : 'Folosește acest șablon'});
      const bounds = await use.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      await page.getByRole('button', {name: english ? 'Back to suggestions' : 'Înapoi la sugestii'}).click();
    }
  });
}

test('independent A/B clones survive navigation and locale switches without automatic assignment', async ({page}) => {
  await createWorkspaceCompany(page, 'Starter A'); await workspaceSection(page, 'requirements'); await chooseIT(page, false);
  const firstId = await page.locator('[data-template-id]').getAttribute('data-template-id');
  await page.locator('#requirement-template-name').fill('A only IT'); await page.getByRole('button', {name: 'Salvează șablon'}).click();
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await page.getByRole('dialog', {name: 'Meniu profil'}).getByRole('link', {name: /Companiile mele/}).click();
  await page.locator('#create-company-form input').nth(0).fill('Starter B'); await page.locator('#create-company-form select').nth(0).selectOption('professional');
  await page.locator('#create-company-form input').nth(1).fill('RO-STARTER-B'); await page.locator('#create-company-form select').nth(1).selectOption('RO');
  await page.getByRole('button', {name: 'Creează compania', exact: true}).click(); await workspaceSection(page, 'requirements');
  await expect(page.locator('[data-template-id]')).toHaveCount(0); await chooseIT(page, false);
  expect(await page.locator('[data-template-id]').getAttribute('data-template-id')).not.toBe(firstId);
  await expect(page.locator('#requirement-template-name')).toHaveValue('Servicii IT');
  await switchWorkspaceCompany(page, 'Starter B', 'Starter A'); await expect(page.locator('#requirement-template-name')).toHaveValue('A only IT');
  await page.getByRole('link', {name: 'EN', exact: true}).filter({visible: true}).click();
  await expect(page).toHaveURL(/\/en\/requirements$/);
  await expect(page.locator('#requirement-template-name')).toHaveValue('A only IT');
  await switchWorkspaceCompany(page, 'Starter A', 'Starter B', true); await expect(page.locator('#requirement-template-name')).toHaveValue('IT services');
  await workspaceSection(page, 'vendors', true); await expect(page.getByText('You have no vendors yet')).toBeVisible();
  await workspaceSection(page, 'requirements', true); await expect(page.locator('[data-template-id]')).toHaveCount(1);
});

test('read-only company membership can browse but not clone or create templates', async ({page}) => {
  await page.goto('/requirements'); await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services');
  await expect(page.getByRole('button', {name: 'Adaugă șablon nou'})).toBeDisabled();
  await suggestions(page, false); await expect(page.locator('[data-starter-id]')).toHaveCount(6);
  await expect(page.getByRole('button', {name: 'Creează șablon nou', exact: true})).toBeDisabled();
  await page.locator('[data-starter-id="starter-software"]').click(); await expect(page.getByRole('button', {name: 'Folosește acest șablon'})).toBeDisabled();
  await expect(page.getByText('Doar administratorul companiei poate adăuga șabloane.')).toBeVisible();
  await expect(page.locator('[data-template-id]')).toHaveCount(0);
});

test('opening suggestions obeys the existing unsaved-edit discard guard', async ({page}) => {
  await page.goto('/requirements'); await page.locator('#requirement-template-name').fill('Keep my edit');
  await page.getByRole('button', {name: 'Șablon nou', exact: true}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible(); await page.getByRole('button', {name: 'Continuă editarea'}).click();
  await expect(page.locator('#requirement-template-name')).toHaveValue('Keep my edit'); await expect(page.locator('[data-starter-selector]')).toHaveCount(0);
  await page.getByRole('button', {name: 'Șablon nou', exact: true}).click(); await page.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page.locator('[data-starter-selector]')).toBeVisible();
});
