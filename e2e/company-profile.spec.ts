import {expect, test, type Page} from '@playwright/test';

async function openProfile(page: Page, english = false, expand = true) {
  if (expand) await page.getByRole('button', {name: english ? 'Company settings' : 'Setări companie', exact: true}).click();
  await page.getByRole('link', {name: english ? 'Company profile' : 'Profil companie', exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`${english ? '/en' : ''}/company/settings/profile$`));
}
async function switchTo(page: Page, current: string, next: string, english = false) {
  await page.getByRole('button', {name: current, exact: true}).click();
  await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: new RegExp(next)}).click();
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} profile Save/Cancel, validation, propagation and company isolation`, async ({page}) => {
    await page.goto(`${prefix}/company/settings/profile`);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(english ? 'Company profile' : 'Profil companie');
    const breadcrumb = page.getByRole('navigation', {name: english ? 'Company profile navigation' : 'Navigare profil companie'});
    await expect(breadcrumb).toContainText('Dashboard');
    await expect(breadcrumb).toContainText(english ? 'Company settings' : 'Setări companie');
    await expect(page.getByRole('link', {name: english ? 'Company profile' : 'Profil companie', exact: true})).toHaveAttribute('aria-current', 'page');
    const save = page.getByRole('button', {name: english ? 'Save changes' : 'Salvează modificările'});
    const cancel = page.getByRole('button', {name: english ? 'Cancel' : 'Anulează', exact: true});
    await expect(save).toBeDisabled();
    await page.locator('#profile-name').fill('Draft company');
    await expect(page.getByRole('button', {name: 'Demo Company SRL', exact: true})).toBeVisible();
    await expect(save).toBeEnabled();
    await cancel.click();
    await expect(page.locator('#profile-name')).toHaveValue('Demo Company SRL');
    await page.locator('#profile-name').fill(' ');
    await expect(save).toBeDisabled();
    await expect(page.locator('#profile-name')).toHaveAttribute('aria-invalid', 'true');
    await cancel.click();
    await page.locator('#profile-taxId').fill(' ro87654321 ');
    await expect(save).toBeDisabled();
    await expect(page.getByText(english ? 'An accessible company with this tax ID already exists.' : 'Există deja o companie accesibilă cu acest CUI.')).toBeVisible();
    await cancel.click();
    for (const [id, bad] of [['contactEmail', 'invalid'], ['website', 'javascript:alert(1)']]) {
      await page.locator(`#profile-${id}`).fill(bad);
      await expect(save).toBeDisabled();
      await expect(page.locator(`#profile-${id}`)).toHaveAttribute('aria-invalid', 'true');
      await cancel.click();
    }
    await page.locator('#profile-name').fill('  Updated Demo SRL  ');
    await page.locator('#profile-taxId').fill(' ro23456789 ');
    await page.locator('#profile-industry').selectOption('construction');
    await page.locator('#profile-country').selectOption('DE');
    await page.locator('#profile-contactPersonName').fill('Company contact');
    await page.locator('#profile-website').fill('updated.demo.ro');
    await save.click();
    await expect(page.getByText(english ? 'Changes saved.' : 'Modificările au fost salvate.')).toBeVisible();
    await expect(save).toBeDisabled();
    await expect(page.locator('#profile-name')).toHaveValue('Updated Demo SRL');
    await expect(page.locator('#profile-taxId')).toHaveValue('RO23456789');
    await expect(page.getByRole('button', {name: 'Updated Demo SRL', exact: true})).toBeVisible();
    await page.getByRole('button', {name: english ? 'User profile: Andrei Popescu' : 'Profil utilizator: Andrei Popescu'}).click();
    const menu = page.getByRole('dialog', {name: english ? 'Profile menu' : 'Meniu profil'});
    await expect(menu).toContainText('Updated Demo SRL');
    await menu.getByRole('link', {name: english ? 'My companies 2' : 'Companiile mele 2'}).click();
    await expect(page.locator('[data-company-id="demo-company"]')).toContainText('Updated Demo SRL');
    await expect(page.locator('[data-company-id="demo-company"]')).toContainText(english ? 'Construction' : 'Construcții');
    await openProfile(page, english, false);
    await expect(page.locator('#profile-website')).toHaveValue('updated.demo.ro');
    await switchTo(page, 'Updated Demo SRL', 'Global Clean Services', english);
    await expect(page).toHaveURL(new RegExp(`${prefix}/dashboard$`)); await openProfile(page, english, false);
    await expect(page.locator('#profile-name')).toHaveValue('Global Clean Services');
    await expect(page.locator('#profile-name')).toBeDisabled();
    await expect(save).toHaveCount(0);
    await expect(page.locator('#profile-contactPersonName')).toHaveValue('');
    await switchTo(page, 'Global Clean Services', 'Updated Demo SRL', english);
    await expect(page).toHaveURL(new RegExp(`${prefix}/dashboard$`)); await openProfile(page, english, false);
    await expect(page.locator('#profile-contactPersonName')).toHaveValue('Company contact');
    await page.getByRole('link', {name: english ? 'Members & access' : 'Membri și acces'}).click();
    await expect(page.getByRole('heading', {name: 'Updated Demo SRL'})).toBeVisible();
    await page.getByRole('link', {name: english ? 'Plan & billing' : 'Plan și facturare'}).click();
    await expect(page.getByRole('heading', {name: 'Updated Demo SRL'})).toBeVisible();
    await expect(page.getByText('RO23456789', {exact: true})).toBeVisible();
    await expect(page.getByText('Company contact', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Updated Demo SRL'})).toBeVisible();
  });
  test(`${english ? 'EN' : 'RO'} dirty sidebar, company and locale navigation require explicit confirmation`, async ({page}) => {
    await page.goto(`${prefix}/company/settings/profile`);
    await page.locator('#profile-name').fill('Unsaved');
    const dialog = page.getByRole('alertdialog');
    const stay = english ? 'Continue editing' : 'Continuă editarea';
    const discard = english ? 'Discard changes' : 'Renunță la modificări';
    await page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'}).getByRole('link', {name: english ? 'Documents' : 'Documente', exact: true}).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', {name: stay}).click();
    await expect(page.locator('#profile-name')).toHaveValue('Unsaved');
    await switchTo(page, 'Demo Company SRL', 'Global Clean Services', english);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', {name: stay}).click();
    await expect(page.locator('#profile-name')).toHaveValue('Unsaved');
    await page.keyboard.press('Escape');
    await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', {name: stay}).click();
    await expect(page.locator('#profile-name')).toHaveValue('Unsaved');
    await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).click();
    await dialog.getByRole('button', {name: discard}).click();
    await expect(page).toHaveURL(new RegExp(`${english ? '' : '/en'}/company/settings/profile$`));
    await expect(page.locator('html')).toHaveAttribute('lang', english ? 'ro' : 'en');
    await expect(page.getByRole('heading', {level: 1})).toHaveText(english ? 'Profil companie' : 'Company profile');
    await expect(page.locator('#profile-name')).toHaveValue('Demo Company SRL');
    await page.locator('#profile-name').fill('Other draft');
    await expect(page.getByRole('button', {name: english ? 'Salvează modificările' : 'Save changes'})).toBeEnabled();
    await switchTo(page, 'Demo Company SRL', 'Global Clean Services', !english);
    await page.getByRole('alertdialog').getByRole('button', {name: english ? 'Renunță la modificări' : 'Discard changes'}).click();
    await expect(page).toHaveURL(new RegExp(`${english ? '' : '/en'}/dashboard$`)); await openProfile(page, !english, false);
    await expect(page.locator('#profile-name')).toHaveValue('Global Clean Services');
    await switchTo(page, 'Global Clean Services', 'Demo Company SRL', !english);
    await expect(page).toHaveURL(new RegExp(`${english ? '' : '/en'}/dashboard$`)); await openProfile(page, !english, false);
    await expect(page.locator('#profile-name')).toHaveValue('Demo Company SRL');
  });
  test(`${english ? 'EN' : 'RO'} onboarding initializes the canonical company with every company field`, async ({page}) => {
    await page.goto(`${prefix}/onboarding`);
    await page.locator('#company-name').fill('Onboarding Example SRL');
    await page.locator('#tax-id').fill('RO31415926');
    await page.locator('#industry').selectOption('cleaning');
    await page.locator('#company-size').selectOption('11-50');
    await page.locator('#country').selectOption('FR');
    await page.getByRole('button', {name: english ? 'Continue' : 'Continuă'}).click();
    await page.getByRole('button', {name: english ? 'Configure later' : 'Configurează mai târziu'}).click();
    await page.getByRole('button', {name: english ? 'Go to Dashboard' : 'Intră în Dashboard'}).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/dashboard$`));
    await expect(page.getByRole('button', {name: 'Onboarding Example SRL', exact: true})).toBeVisible();
    await openProfile(page, english);
    for (const [id, value] of [['name', 'Onboarding Example SRL'], ['taxId', 'RO31415926'], ['industry', 'cleaning'], ['companySize', '11-50'], ['country', 'FR']]) await expect(page.locator(`#profile-${id}`)).toHaveValue(value);
    for (const id of ['contactPersonName', 'contactEmail', 'addressLine', 'city', 'postalCode']) await expect(page.locator(`#profile-${id}`)).toHaveValue('');
    await expect(page.getByRole('button', {name: english ? 'Save changes' : 'Salvează modificările'})).toBeDisabled();
  });
  test(`${english ? 'EN' : 'RO'} profile controls remain contained and reachable across authenticated breakpoints`, async ({page}) => {
    for (const [width, height] of [[1448, 1086], [1024, 768], [758, 833], [600, 800], [375, 812], [320, 700]]) {
      await page.setViewportSize({width, height});
      await page.goto(`${prefix}/company/settings/profile`);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await page.locator('#profile-city').fill('Iași');
      const save = page.getByRole('button', {name: english ? 'Save changes' : 'Salvează modificările'});
      await expect(save).toBeEnabled();
      await save.scrollIntoViewIfNeeded();
      const geometry = await page.evaluate(() => ({pageWidth: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('[data-company-profile] input, [data-company-profile] select, [data-company-profile] button')].map((element) => {const box = element.getBoundingClientRect(); return {left: box.left, right: box.right, height: box.height};})}));
      expect(geometry.pageWidth, `${width}px overflow`).toBeLessThanOrEqual(width);
      for (const rect of geometry.controls) {expect(rect.left).toBeGreaterThanOrEqual(0); expect(rect.right).toBeLessThanOrEqual(width); expect(rect.height).toBeGreaterThanOrEqual(40);}
      await save.click();
      await expect(save).toBeDisabled();
    }
  });
}

for (const fallback of [false, true]) test(`profile protects browser Back${fallback ? ' without Navigation API' : ''}`, async ({page}) => {
  if (fallback) await page.addInitScript(() => Object.defineProperty(window, 'navigation', {value: undefined, configurable: true}));
  await page.goto('/documents');
  await openProfile(page);
  await page.locator('#profile-name').fill('Dirty back');
  await page.evaluate(() => history.back());
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', {name: 'Continuă editarea'}).click();
  await expect(page.locator('#profile-name')).toHaveValue('Dirty back');
  await page.evaluate(() => history.back());
  await dialog.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page).toHaveURL(/\/documents$/);
  await openProfile(page, false, false);
  await expect(page.locator('#profile-name')).toHaveValue('Demo Company SRL');
});

test('My Companies creation exposes partial profile values and later edits do not affect Demo', async ({page}) => {
  await page.goto('/profile/companies');
  await page.getByRole('textbox', {name: /Numele companiei/}).fill('Created Company SRL');
  await page.getByRole('textbox', {name: /CUI \/ Cod fiscal/}).fill('RO16180339');
  await page.getByRole('combobox', {name: /Industrie/}).selectOption('construction');
  await page.getByRole('combobox', {name: /Țară/}).selectOption('DE');
  await page.getByRole('button', {name: 'Creează compania'}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await openProfile(page);
  await expect(page.locator('#profile-name')).toHaveValue('Created Company SRL');
  await expect(page.locator('#profile-companySize')).toHaveValue('');
  await expect(page.locator('#profile-contactEmail')).toHaveValue('');
  await page.locator('#profile-city').fill('Berlin');
  await page.getByRole('button', {name: 'Salvează modificările'}).click();
  await switchTo(page, 'Created Company SRL', 'Demo Company SRL');
  await expect(page).toHaveURL(/\/dashboard$/); await openProfile(page, false, false);
  await expect(page.locator('#profile-city')).toHaveValue('București');
  await switchTo(page, 'Demo Company SRL', 'Created Company SRL');
  await expect(page).toHaveURL(/\/dashboard$/); await openProfile(page, false, false);
  await expect(page.locator('#profile-city')).toHaveValue('Berlin');
});

test('saved requester identity reaches the same-tab supplier portal without changing token scope', async ({page}) => {
  await page.goto('/company/settings/profile');
  await page.locator('#profile-name').fill('Updated Requester SRL');
  await page.getByRole('button', {name: 'Salvează modificările'}).click();
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori', exact: true}).click();
  await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
  await page.getByRole('button', {name: 'Invită furnizor'}).click();
  const preview = page.getByRole('dialog').getByRole('link', {name: /Previzualizează pagina de încărcare/});
  await preview.evaluate((element) => element.removeAttribute('target'));
  await preview.click();
  await expect(page.getByRole('region', {name: 'Detaliile solicitării'})).toContainText('Updated Requester SRL');
  await expect(page.getByRole('region', {name: 'Detaliile solicitării'})).toContainText('Construct Pro SRL');
  await page.getByRole('link', {name: 'EN', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Request details'})).toContainText('Updated Requester SRL');
});
