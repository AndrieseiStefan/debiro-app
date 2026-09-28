import {expect, test} from '@playwright/test';

test('Plan & Billing renders the active company and safe fixture-backed billing details', async ({page}) => {
  await page.goto('/company/settings/billing');
  await expect(page.getByRole('heading', {level: 1, name: 'Plan și facturare'})).toBeVisible();
  const breadcrumbs = page.getByRole('navigation', {name: 'Navigare pe pagină'});
  await expect(breadcrumbs.getByRole('link', {name: 'Dashboard'})).toBeVisible();
  await expect(breadcrumbs.getByText('Setări companie')).toBeVisible();
  await expect(breadcrumbs.getByText('Plan și facturare')).toHaveAttribute('aria-current', 'page');
  const navigation = page.getByRole('navigation', {name: 'Navigare în aplicație'});
  await expect(navigation.getByRole('button', {name: 'Setări companie'})).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', {name: 'Plan și facturare'})).toHaveAttribute('aria-current', 'page');

  await expect(page.getByRole('heading', {name: 'Demo Company SRL'})).toBeVisible();
  await expect(page.getByText('Administrator: Andrei Popescu')).toBeVisible();
  await expect(page.getByTestId('billing-seat-usage')).toHaveText('2/5');
  await expect(page.getByTestId('billing-available-seats')).toHaveText('3 locuri disponibile');
  await expect(page.getByText('billing@demo.ro')).toBeVisible();
  await expect(page.getByText('•••• 4242')).toBeVisible();
  await expect(page.getByRole('row', {name: /INV-2026-009/})).toContainText('Plătită');

  for (const name of ['Upgrade plan', 'Vezi toate facturile', 'Actualizează datele de facturare', 'Schimbă cardul', 'Descarcă']) {
    const action = page.getByRole('button', {name, exact: true}).first();
    await expect(action).toHaveAttribute('aria-disabled', 'true');
    await action.evaluate((button: HTMLButtonElement) => button.click());
    await expect(page).toHaveURL(/\/company\/settings\/billing$/);
  }
});

test('English Plan & Billing route retains company-scoped data and active navigation', async ({page}) => {
  await page.goto('/en/company/settings/billing');
  await expect(page.getByRole('heading', {level: 1, name: 'Plan & billing'})).toBeVisible();
  const navigation = page.getByRole('navigation', {name: 'Application navigation'});
  await expect(navigation.getByRole('link', {name: 'Plan & billing'})).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('billing-seat-usage')).toHaveText('2/5');
  await expect(page.getByTestId('billing-available-seats')).toHaveText('3 available seats');
  await expect(page.getByRole('heading', {name: 'Payment method'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Invoices'})).toBeVisible();
});

test('a local member invitation stays pending and does not consume a billing seat', async ({page}) => {
  await page.goto('/company/settings/members');
  await page.getByRole('button', {name: 'Invită membru'}).click();
  const drawer = page.getByRole('dialog', {name: 'Invită membru'});
  await drawer.getByRole('textbox', {name: /Nume complet/}).fill('Radu Ionescu');
  await drawer.getByRole('textbox', {name: /Adresă de email/}).fill('radu.billing@demo.ro');
  await drawer.getByRole('radio', {name: /Viewer/}).check();
  await drawer.getByRole('button', {name: 'Trimite invitația'}).click();
  await expect(page.getByRole('row', {name: /Radu Ionescu/})).toContainText('Invitație trimisă');
  await expect(page.getByText('2 utilizatori activi din 5 disponibili. 2 invitații în așteptare.')).toBeVisible();

  const navigation = page.getByRole('navigation', {name: 'Navigare în aplicație'});
  await navigation.getByRole('link', {name: 'Plan și facturare'}).click();
  await expect(page).toHaveURL(/\/company\/settings\/billing$/);
  await expect(navigation.getByRole('link', {name: 'Plan și facturare'})).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('button', {name: 'Setări companie'})).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('billing-seat-usage')).toHaveText('2/5');
  await expect(page.getByTestId('billing-available-seats')).toHaveText('3 locuri disponibile');

  await navigation.getByRole('link', {name: 'Membri și acces'}).click();
  await expect(page.getByRole('row', {name: /Radu Ionescu/})).toContainText('Invitație trimisă');
});

test('Plan & Billing remains contained at required widths', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1024, 768], [758, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/company/settings/billing');
    await page.evaluate(async () => {await document.fonts.ready;});
    expect(await page.evaluate(() => document.documentElement.scrollWidth), width + 'px page overflow').toBeLessThanOrEqual(width);
    await expect(page.getByRole('heading', {level: 1, name: 'Plan și facturare'})).toBeVisible();
    if (width <= 600) {
      const invoiceRegion = page.getByRole('region', {name: 'Istoric facturi'});
      expect(await invoiceRegion.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    }
  }
});
