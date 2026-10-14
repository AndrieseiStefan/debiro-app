import {expect, test, type Page} from '@playwright/test';
import {createWorkspaceCompany, switchWorkspaceCompany} from './support/company-workspace';

async function billing(page: Page, english = false) {
  const settings = page.getByRole('button', {name: english ? 'Company settings' : 'Setări companie', exact: true});
  if (await settings.getAttribute('aria-expanded') !== 'true') await settings.click();
  await page.getByRole('link', {name: english ? 'Plan & billing' : 'Plan și facturare', exact: true}).click();
}

for (const english of [false, true]) {
  const prefix = english ? '/en' : '', language = english ? 'EN' : 'RO';
  const saveName = english ? 'Save changes' : 'Salvează modificările';
  const closeName = english ? 'Close' : 'Închide';
  test(`${language} billing edit validates, guards dirty dismissal and updates canonical company fields`, async ({page}) => {
    await page.goto(`${prefix}/company/settings/billing`);
    const trigger = page.getByRole('button', {name: english ? 'Update billing details' : 'Actualizează datele de facturare', exact: true});
    await trigger.click();
    const drawer = page.getByRole('dialog', {name: english ? 'Billing details' : 'Date de facturare', exact: true});
    const save = drawer.getByRole('button', {name: saveName});
    await expect(drawer.locator('#billing-name')).toHaveValue('Demo Company SRL');
    await expect(drawer.locator('#billing-email')).toHaveValue('billing@demo.ro');
    await expect(save).toBeDisabled();
    await drawer.locator('#billing-name').fill('');
    await expect(save).toBeDisabled();
    await expect(drawer.locator('#billing-name')).toHaveAttribute('aria-invalid', 'true');
    await drawer.locator('#billing-name').fill('Billing Updated SRL');
    await drawer.locator('#billing-taxId').fill('RO87654321');
    await expect(save).toBeDisabled();
    await drawer.locator('#billing-taxId').fill('RO12345678');
    await drawer.locator('#billing-email').fill('invalid');
    await expect(save).toBeDisabled();
    await drawer.locator('#billing-email').fill('finance@example.ro');
    await page.keyboard.press('Escape');
    const guard = page.getByRole('alertdialog');
    await expect(guard).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(guard).toHaveCount(0);
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('#billing-name')).toHaveValue('Billing Updated SRL');
    await drawer.getByRole('button', {name: closeName, exact: true}).click();
    await guard.getByRole('button', {name: english ? 'Discard changes' : 'Renunță la modificări'}).click();
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(drawer.locator('#billing-name')).toHaveValue('Demo Company SRL');
    await drawer.locator('#billing-name').fill('Billing Updated SRL');
    await drawer.locator('#billing-contactPersonName').fill('Billing Contact');
    await drawer.locator('#billing-addressLine').fill('Sample street 10');
    await drawer.locator('#billing-city').fill('Iași');
    await drawer.locator('#billing-email').fill('finance@example.ro');
    await save.click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText(english ? 'Billing details updated.' : 'Datele de facturare au fost actualizate.');
    await expect(page.getByRole('button', {name: 'Billing Updated SRL', exact: true})).toBeVisible();
    await expect(page.getByText('finance@example.ro', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: english ? 'Company profile' : 'Profil companie', exact: true}).click();
    await expect(page.locator('#profile-name')).toHaveValue('Billing Updated SRL');
    await expect(page.locator('#profile-contactPersonName')).toHaveValue('Billing Contact');
    await expect(page.locator('#profile-city')).toHaveValue('Iași');
    await expect(page.locator('#profile-addressLine')).toHaveValue('Sample street 10');
    await expect(page.locator('#profile-contactEmail')).not.toHaveValue('finance@example.ro');
    await switchWorkspaceCompany(page, 'Billing Updated SRL', 'Global Clean Services', english);
    await billing(page, english);
    await expect(page.getByRole('heading', {name: 'Global Clean Services', exact: true})).toBeVisible();
    for (const name of [english ? 'Update billing details' : 'Actualizează datele de facturare', english ? 'Compare plans' : 'Compară planurile', english ? 'Add payment method' : 'Adaugă metodă de plată']) await expect(page.getByRole('button', {name, exact: true})).toBeDisabled();
    await expect(page.getByText('finance@example.ro')).toHaveCount(0);
    await switchWorkspaceCompany(page, 'Global Clean Services', 'Billing Updated SRL', english);
    await billing(page, english);
    await expect(page.getByText('finance@example.ro', {exact: true})).toBeVisible();
  });

  test(`${language} invoices expand newest-first and safe payment replacement stays company-owned`, async ({page}) => {
    await page.goto(`${prefix}/company/settings/billing`);
    const rows = page.locator('#billing-invoice-rows tr');
    await expect(rows).toHaveCount(3);
    await expect(rows.locator('td:first-child')).toHaveText(['INV-2026-009', 'INV-2026-008', 'INV-2026-007']);
    await page.getByRole('button', {name: english ? 'View all' : 'Vezi toate', exact: true}).click();
    await expect(rows).toHaveCount(4);
    await expect(rows.locator('td:first-child')).toHaveText(['INV-2026-009', 'INV-2026-008', 'INV-2026-007', 'INV-2026-006']);
    for (const row of await rows.all()) await expect(row.getByRole('button')).toHaveCount(1);
    await page.getByRole('button', {name: english ? 'Show less' : 'Vezi mai puține', exact: true}).click();
    await expect(rows).toHaveCount(3);
    const trigger = page.getByRole('button', {name: english ? 'Change card' : 'Schimbă cardul', exact: true});
    await trigger.click();
    const drawer = page.getByRole('dialog', {name: english ? 'Change payment method' : 'Schimbă metoda de plată', exact: true});
    await expect(drawer.locator('#payment-last-four')).toHaveValue('4242');
    await expect(drawer.getByRole('button', {name: saveName})).toBeDisabled();
    await expect(drawer.locator('input')).toHaveCount(3);
    await expect(drawer.locator('input[autocomplete="cc-number"], input[autocomplete="cc-csc"]')).toHaveCount(0);
    await drawer.locator('#payment-last-four').fill('88');
    await expect(drawer.getByRole('button', {name: saveName})).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.getByRole('alertdialog').getByRole('button', {name: english ? 'Discard changes' : 'Renunță la modificări'}).click();
    await expect(drawer).toHaveCount(0);
    await trigger.click();
    await expect(drawer.locator('#payment-last-four')).toHaveValue('4242');
    await drawer.locator('#payment-last-four').fill('8888');
    await drawer.locator('#payment-brand').selectOption('Mastercard');
    await drawer.getByRole('button', {name: saveName}).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByText('•••• 8888', {exact: true})).toBeVisible();
    await expect(page.getByText('Mastercard', {exact: true})).toBeVisible();
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services', english);
    await billing(page, english);
    await expect(page.getByText('•••• 8888')).toHaveCount(0);
    await expect(page.getByRole('button', {name: english ? 'Add payment method' : 'Adaugă metodă de plată'})).toBeDisabled();
    await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL', english);
    await billing(page, english);
    await expect(page.getByText('•••• 8888')).toBeVisible();
  });

  test(`${language} upgrade comparison traps focus, confirms safely and propagates plan without restarting trial`, async ({page}) => {
    await page.goto(`${prefix}/company/settings/billing`);
    const trigger = page.getByRole('button', {name: 'Upgrade plan', exact: true});
    await trigger.click();
    const modal = page.getByRole('dialog', {name: 'Upgrade plan', exact: true});
    await expect(modal).toBeVisible();
    const current = modal.locator('[data-current="true"]'), next = modal.locator('[data-recommended="true"]');
    await expect(current).toContainText('Professional');
    await expect(current).toContainText(english ? 'Trial • 12 days remaining' : 'Trial • 12 zile rămase');
    await expect(current.getByRole('button')).toHaveCount(0);
    await expect(modal.locator('[data-plan-id="Starter"]').getByRole('button')).toHaveCount(0);
    await expect(next).toHaveAttribute('data-plan-id', 'Business');
    const backdrop = await modal.evaluate((element) => {const style = getComputedStyle(element.parentElement!); return {blur: style.backdropFilter, color: style.backgroundColor};});
    expect(backdrop.blur).toContain('blur'); expect(backdrop.color).toMatch(/rgba\(.+, 0\./);
    const close = modal.getByRole('button', {name: closeName, exact: true});
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(next.getByRole('button')).toBeFocused();
    await page.keyboard.press('Tab'); await expect(close).toBeFocused();
    // Existing modal convention: backdrop does not dismiss.
    await page.mouse.click(2, 2); await expect(modal).toBeVisible();
    await next.getByRole('button').click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText('Professional'); await expect(confirm).toContainText('Business');
    await page.keyboard.press('Escape');
    await expect(confirm).toHaveCount(0); await expect(modal).toBeVisible();
    await expect(next.getByRole('button')).toBeFocused();
    await next.getByRole('button').click();
    await confirm.getByRole('button', {name: english ? 'Confirm change' : 'Confirmă schimbarea'}).click();
    await expect(modal).toHaveCount(0); await expect(confirm).toHaveCount(0);
    await expect(page.getByTestId('billing-seat-usage')).toHaveText('2/10');
    await expect(page.getByText(english ? 'Trial • 12 days remaining' : 'Trial • 12 zile rămase', {exact: true})).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await expect.poll(() => page.evaluate(() => !!document.querySelector('main')?.closest('[inert]'))).toBe(false);
    const compare = page.getByRole('button', {name: english ? 'Compare plans' : 'Compară planurile'});
    await expect(compare).toBeFocused();
    await compare.click();
    await expect(modal.locator('[data-recommended]')).toHaveCount(0);
    await expect(modal.locator('[data-current="true"]')).toHaveAttribute('data-plan-id', 'Business');
    await expect(modal.getByRole('button')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await page.getByRole('link', {name: english ? 'Members & access' : 'Membri și acces', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/company/settings/members$`));
    await expect(page.getByText('Business', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: english ? 'User profile: Andrei Popescu' : 'Profil utilizator: Andrei Popescu'}).click();
    await page.getByRole('dialog', {name: english ? 'Profile menu' : 'Meniu profil'}).getByRole('link', {name: english ? 'My companies 2' : 'Companiile mele 2'}).click();
    await expect(page.locator('[data-company-id="demo-company"]')).toContainText('Business');
    await expect(page.locator('[data-company-id="global-clean-services"]')).toContainText('Business');
    await billing(page, english);
    await expect(page.getByTestId('billing-seat-usage')).toHaveText('2/10');
  });
}

test('new company has empty billing states, can add safe metadata and select any eligible higher plan', async ({page}) => {
  await createWorkspaceCompany(page, 'Billing Workspace');
  await billing(page);
  await expect(page.getByText('Nu există încă facturi.', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Vezi toate', exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Adaugă metodă de plată', exact: true}).click();
  const drawer = page.getByRole('dialog');
  await drawer.locator('#payment-name').fill('Fictional Holder');
  await drawer.locator('#payment-last-four').fill('1111');
  await drawer.getByRole('button', {name: 'Salvează modificările'}).click();
  await expect(page.getByText('•••• 1111')).toBeVisible();
  await page.getByRole('button', {name: 'Upgrade plan', exact: true}).click();
  const modal = page.getByRole('dialog', {name: 'Upgrade plan', exact: true});
  await expect(modal.locator('[data-recommended="true"]')).toHaveAttribute('data-plan-id', 'Professional');
  await expect(modal.locator('[data-plan-id="Business"]').getByRole('button')).toBeEnabled();
  await modal.locator('[data-plan-id="Business"]').getByRole('button').click();
  await page.getByRole('alertdialog').getByRole('button', {name: 'Anulează', exact: true}).click();
  await expect(modal.locator('[data-current="true"]')).toHaveAttribute('data-plan-id', 'Starter');
  await modal.locator('[data-plan-id="Business"]').getByRole('button').click();
  await page.getByRole('alertdialog').getByRole('button', {name: 'Confirmă schimbarea'}).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByTestId('billing-seat-usage')).toHaveText('1/10');
  await expect(page.getByText('Trial • 14 zile rămase', {exact: true})).toBeVisible();
  await switchWorkspaceCompany(page, 'Billing Workspace', 'Demo Company SRL');
  await billing(page);
  await expect(page.getByTestId('billing-seat-usage')).toHaveText('2/5');
  await expect(page.getByText('•••• 4242')).toBeVisible();
});

for (const fallback of [false, true]) test(`dirty billing drawer protects browser Back${fallback ? ' without Navigation API' : ''}`, async ({page}) => {
  if (fallback) await page.addInitScript(() => Object.defineProperty(window, 'navigation', {value: undefined, configurable: true}));
  await page.goto('/documents');
  await billing(page);
  await expect(page).toHaveURL(/\/company\/settings\/billing$/);
  await page.getByRole('button', {name: 'Actualizează datele de facturare', exact: true}).click();
  const drawer = page.getByRole('dialog');
  await drawer.locator('#billing-name').fill('Dirty billing');
  await page.evaluate(() => history.back());
  const guard = page.getByRole('alertdialog');
  await expect(guard).toBeVisible();
  await guard.getByRole('button', {name: 'Continuă editarea'}).click();
  await expect(drawer.locator('#billing-name')).toHaveValue('Dirty billing');
  await page.evaluate(() => history.back());
  await guard.getByRole('button', {name: 'Renunță la modificări'}).click();
  await expect(page).toHaveURL(/\/documents$/);
  await expect(drawer).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await expect.poll(() => page.evaluate(() => !!document.querySelector('main')?.closest('[inert]'))).toBe(false);
});

test('billing drawers and plan cards remain contained and usable at authenticated widths', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1024, 768], [758, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/company/settings/billing');
    for (const name of ['Actualizează datele de facturare', 'Schimbă cardul']) {
      await page.getByRole('button', {name, exact: true}).click();
      const drawer = page.getByRole('dialog');
      await expect(drawer).toBeVisible();
      await expect(drawer).toHaveAttribute('data-phase', 'open');
      await drawer.evaluate(async (element) => {await Promise.all(element.getAnimations().map((animation) => animation.finished));});
      const controls = await drawer.locator('input, select').evaluateAll((elements) => elements.map((element) => {const box = element.getBoundingClientRect(); return {left: box.left, right: box.right, height: box.height};}));
      for (const control of controls) {expect(control.left).toBeGreaterThanOrEqual(0); expect(control.right).toBeLessThanOrEqual(width); expect(control.height).toBeGreaterThanOrEqual(40);}
      await drawer.getByRole('button', {name: 'Salvează modificările'}).scrollIntoViewIfNeeded();
      await page.keyboard.press('Escape'); await expect(drawer).toHaveCount(0);
    }
    await page.getByRole('button', {name: 'Upgrade plan', exact: true}).click();
    const modal = page.getByRole('dialog', {name: 'Upgrade plan', exact: true});
    await expect(modal).toBeVisible();
    const cards = await modal.locator('[data-plan-id]').evaluateAll((elements) => elements.map((element) => {const r = element.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, width: r.width};}));
    for (const card of cards) {expect(card.left).toBeGreaterThanOrEqual(0); expect(card.right).toBeLessThanOrEqual(width); expect(card.width).toBeGreaterThan(200);}
    if (width >= 1200) expect(new Set(cards.map((card) => card.top)).size).toBe(1);
    else if (width >= 768) expect(cards[0].top).toBe(cards[1].top);
    else expect(new Set(cards.map((card) => card.left)).size).toBe(1);
    await modal.locator('[data-recommended="true"]').getByRole('button').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px overflow`).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape'); await expect(modal).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Upgrade plan', exact: true})).toBeFocused();
  }
});
