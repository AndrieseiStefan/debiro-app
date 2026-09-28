import {expect, test} from '@playwright/test';

test('profile navigation, company list, switching and company settings share one active workspace', async ({page}) => {
  await page.goto('/dashboard');
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await page.getByRole('dialog', {name: 'Meniu profil'}).getByRole('link', {name: 'Companiile mele 2'}).click();
  await expect(page).toHaveURL(/\/profile\/companies$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Companiile mele'})).toBeVisible();
  const cards = page.locator('[data-company-id]');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Administrator');
  await expect(cards.nth(0)).toContainText('Professional');
  await expect(cards.nth(0)).toHaveAttribute('data-active', 'true');
  await expect(cards.nth(1)).toContainText('Reviewer');
  await expect(cards.nth(1)).toContainText('Business');
  await cards.nth(1).getByRole('button', {name: 'Comută'}).click();
  await expect(cards.nth(1)).toHaveAttribute('data-active', 'true');
  await expect(page.getByRole('button', {name: 'Global Clean Services', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await expect(page.getByRole('dialog', {name: 'Meniu profil'})).toContainText('Reviewer');
  await expect(page.getByRole('dialog', {name: 'Meniu profil'})).toContainText('în Global Clean Services');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Global Clean Services', exact: true}).click();
  const switcher = page.getByRole('dialog', {name: 'Schimbă compania'});
  await expect(switcher.getByRole('button')).toHaveCount(2);
  await switcher.getByRole('button', {name: /Demo Company SRL/}).click();
  await expect(page.getByRole('button', {name: 'Demo Company SRL', exact: true})).toBeVisible();
  await expect(cards.nth(0)).toHaveAttribute('data-active', 'true');
});

test('switcher closes accessibly, preserves route, and prevents demo data leakage', async ({page}) => {
  await page.goto('/vendors');
  const trigger = page.getByRole('button', {name: 'Demo Company SRL'});
  await trigger.focus();
  await page.keyboard.press('Enter');
  const switcher = page.getByRole('dialog', {name: 'Schimbă compania'});
  await expect(switcher).toBeVisible();
  await expect(switcher.getByRole('button', {name: /Demo Company SRL/})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(switcher).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('heading', {name: 'Furnizori'}).click();
  await expect(switcher).not.toBeVisible();
  await trigger.click();
  await switcher.getByRole('button', {name: /Global Clean Services/}).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(page.getByText('Nu există date pentru această companie în demonstrația locală.')).toBeVisible();
  await expect(page.getByText('Construct Pro SRL')).toHaveCount(0);
  for (const path of ['/dashboard', '/documents', '/requirements', '/notifications']) {
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: path === '/dashboard' ? 'Dashboard' : path === '/documents' ? 'Documente' : path === '/requirements' ? 'Cerințe' : 'Notificări'}).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    if (path === '/requirements') await expect(page.getByText('Nu există șabloane pentru această companie')).toBeVisible();
    else await expect(page.getByText('Nu există date pentru această companie în demonstrația locală.')).toBeVisible();
    await expect(page.getByText('Construct Pro SRL')).toHaveCount(0);
  }
  await page.getByRole('button', {name: 'Global Clean Services'}).click();
  await page.getByRole('dialog', {name: 'Schimbă compania'}).getByRole('link', {name: 'Vezi toate companiile'}).click();
  await expect(page).toHaveURL(/\/profile\/companies$/);
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('button', {name: 'Setări companie'}).click();
  await page.getByRole('link', {name: 'Membri și acces'}).click();
  await expect(page.getByRole('heading', {name: 'Global Clean Services'})).toBeVisible();
  await expect(page.getByRole('row', {name: /Andrei Popescu/})).toContainText('Reviewer');
  await expect(page.getByRole('row', {name: /Ioana Radu/})).toHaveCount(0);
  await page.getByRole('link', {name: 'Plan și facturare'}).click();
  await expect(page.getByRole('heading', {name: 'Global Clean Services'})).toBeVisible();
  await expect(page.getByText('Business').first()).toBeVisible();
  await expect(page.getByText('Nu există încă o metodă de plată.')).toBeVisible();
  await expect(page.getByText('billing@demo.ro')).toHaveCount(0);
});

test('local creation validates, adds a membership and trial, and updates all three surfaces', async ({page}) => {
  await page.goto('/profile/companies');
  await page.getByRole('button', {name: 'Creează compania'}).click();
  await expect(page.getByText('Completează toate câmpurile obligatorii.', {exact: true})).toBeVisible();
  await page.getByRole('textbox', {name: /Numele companiei/}).fill('  New Horizon SRL  ');
  await page.getByRole('combobox', {name: /Industrie/}).selectOption('professional');
  await page.getByRole('textbox', {name: /CUI \/ Cod fiscal/}).fill(' ro12345678 ');
  await page.getByRole('combobox', {name: /Țară/}).selectOption('RO');
  await page.getByRole('button', {name: 'Creează compania'}).click();
  await expect(page.getByText('Există deja o companie accesibilă cu acest CUI.', {exact: true})).toBeVisible();
  await page.getByRole('textbox', {name: /CUI \/ Cod fiscal/}).fill(' ro45678912 ');
  await page.getByRole('button', {name: 'Creează compania'}).click();
  const created = page.locator('[data-company-id^="local-company-"]');
  await expect(created).toHaveCount(1);
  await expect(created).toContainText('New Horizon SRL');
  await expect(created).toContainText('Administrator');
  await expect(created).toContainText('Starter');
  await expect(created).toHaveAttribute('data-active', 'true');
  await expect(page.getByRole('button', {name: 'New Horizon SRL', exact: true})).toBeVisible();
  await expect(page.getByText('3 companii')).toBeVisible();
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  const profile = page.getByRole('dialog', {name: 'Meniu profil'});
  await expect(profile).toContainText('în New Horizon SRL');
  await expect(profile).toContainText('Administrator');
  await expect(profile.getByRole('link', {name: 'Companiile mele 3'})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'New Horizon SRL', exact: true}).click();
  const switcher = page.getByRole('dialog', {name: 'Schimbă compania'});
  await expect(switcher.getByRole('button')).toHaveCount(3);
  await expect(switcher.getByRole('button', {name: /New Horizon SRL/})).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'}).click();
  await expect(page.getByText('Nu există date pentru această companie în demonstrația locală.')).toBeVisible();
  await expect(page.getByText('Construct Pro SRL')).toHaveCount(0);
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('button', {name: 'Setări companie'}).click();
  await page.getByRole('link', {name: 'Membri și acces'}).click();
  await expect(page.getByRole('heading', {name: 'New Horizon SRL'})).toBeVisible();
  await expect(page.getByRole('row', {name: /Andrei Popescu/})).toContainText('Administrator');
  await expect(page.getByRole('row', {name: /Ioana Radu/})).toHaveCount(0);
  await expect(page.getByText('Trial • 14 zile rămase')).toBeVisible();
  await page.getByRole('link', {name: 'Plan și facturare'}).click();
  await expect(page.getByRole('heading', {name: 'New Horizon SRL'})).toBeVisible();
  await expect(page.getByText('Starter').first()).toBeVisible();
  await expect(page.getByText('Nu există încă o metodă de plată.')).toBeVisible();
  await expect(page.getByText('billing@demo.ro')).toHaveCount(0);
});

test('English routes and responsive layouts remain contained', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1024, 768], [758, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/en/profile/companies');
    await expect(page.getByRole('heading', {level: 1, name: 'My companies'})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px page overflow`).toBeLessThanOrEqual(width);
    await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
    const switcher = page.getByRole('dialog', {name: 'Switch company'});
    await expect(switcher).toBeVisible();
    const bounds = await switcher.evaluate((node) => {const rect = node.getBoundingClientRect(); return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom};});
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(width);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(height);
    await expect(switcher.getByRole('link', {name: 'View all companies'})).toBeVisible();
  }
});

test('membership roles keep one icon and semantic color across company surfaces', async ({page}) => {
  const color = (selector: ReturnType<typeof page.locator>) => selector.evaluate((node) => getComputedStyle(node).color);
  await page.goto('/profile/companies');
  const cards = page.locator('[data-company-id]');
  const adminBadge = cards.nth(0).locator('[data-role="administrator"]');
  const reviewerBadge = cards.nth(1).locator('[data-role="reviewer"]');
  await expect(adminBadge).toContainText('Administrator');
  await expect(reviewerBadge).toContainText('Reviewer');
  const adminColor = await color(adminBadge);
  const reviewerColor = await color(reviewerBadge);
  const adminIcon = await adminBadge.locator('svg').innerHTML();
  const reviewerIcon = await reviewerBadge.locator('svg').innerHTML();
  expect(adminColor).not.toBe(reviewerColor);
  expect(adminIcon).not.toBe(reviewerIcon);

  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await expect(page.getByRole('dialog', {name: 'Meniu profil'}).locator('[data-role="administrator"]')).toHaveCSS('color', adminColor);
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
  await expect(page.getByRole('dialog', {name: 'Schimbă compania'}).locator('[data-role="administrator"]')).toHaveCSS('color', adminColor);
  await expect(page.getByRole('dialog', {name: 'Schimbă compania'}).locator('[data-role="reviewer"]')).toHaveCSS('color', reviewerColor);
  await page.keyboard.press('Escape');

  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('button', {name: 'Setări companie'}).click();
  await page.getByRole('link', {name: 'Membri și acces'}).click();
  const roleCard = page.getByText('Rolul tău', {exact: true}).locator('..').locator('..');
  await expect(roleCard.locator('[data-role="administrator"]')).toHaveCSS('color', adminColor);
  expect(await roleCard.locator('[data-role="administrator"] svg').innerHTML()).toBe(adminIcon);
  await expect(page.getByRole('row', {name: /Andrei Popescu/}).locator('[data-role="administrator"]')).toHaveCSS('color', adminColor);
  await expect(page.getByRole('row', {name: /Ioana Radu/}).locator('[data-role="reviewer"]')).toHaveCSS('color', reviewerColor);
  const explainedRoles = page.getByText('Despre roluri și permisiuni').locator('..').locator('[data-role]');
  await expect(explainedRoles).toHaveCount(3);
  await expect(explainedRoles.nth(2)).toHaveAttribute('data-role', 'viewer');
  expect(await color(explainedRoles.nth(2))).not.toBe(adminColor);
  await page.getByRole('button', {name: 'Invită membru'}).click();
  const roleOptions = page.getByRole('dialog', {name: 'Invită membru'}).locator('[data-role]');
  await expect(roleOptions).toHaveCount(3);
  await expect(roleOptions.nth(0)).toHaveCSS('color', adminColor);
  await expect(roleOptions.nth(1)).toHaveCSS('color', reviewerColor);
  await page.keyboard.press('Escape');

  await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
  await page.getByRole('dialog', {name: 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
  await expect(roleCard.locator('[data-role="reviewer"]')).toHaveCSS('color', reviewerColor);
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await expect(page.getByRole('dialog', {name: 'Meniu profil'}).locator('[data-role="reviewer"]')).toHaveCSS('color', reviewerColor);
});

test('Create Company actions remain readable and reflow at constrained widths', async ({page}) => {
  for (const width of [1448, 1024, 997, 853, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: 900});
    await page.goto('/profile/companies');
    const cancel = page.getByRole('button', {name: 'Anulează'});
    const create = page.getByRole('button', {name: 'Creează compania'});
    await expect(cancel).toBeVisible();
    await expect(create).toBeVisible();
    const metrics = await create.evaluate((node) => ({clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, text: node.textContent?.trim()}));
    expect(metrics.text).toContain('Creează compania');
    expect(metrics.scrollWidth, `${width}px CTA clips`).toBeLessThanOrEqual(metrics.clientWidth);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px page overflows`).toBeLessThanOrEqual(width);
    const cancelBox = await cancel.boundingBox();
    const createBox = await create.boundingBox();
    expect(cancelBox).not.toBeNull();
    expect(createBox).not.toBeNull();
    expect(createBox!.x >= cancelBox!.x + cancelBox!.width || createBox!.y >= cancelBox!.y + cancelBox!.height, `${width}px actions overlap`).toBe(true);
  }
});
