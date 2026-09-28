import {expect, test} from '@playwright/test';

test('shows global user context and only the approved profile actions', async ({page}) => {
  await page.goto('/vendors');
  const trigger = page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'});
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  const menu = page.getByRole('dialog', {name: 'Meniu profil'});
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toContainText('Andrei Popescu');
  await expect(menu).toContainText('andrei.popescu@demo.ro');
  await expect(menu).toContainText('Administrator');
  await expect(menu).toContainText('în Demo Company SRL');
  await expect(menu.getByRole('button')).toHaveCount(5);
  await expect(menu.getByRole('button', {name: 'Profilul meu'})).toBeFocused();
  await expect(menu.getByRole('button', {name: 'Companiile mele 2'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Invitațiile mele'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Centrul de ajutor'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Logout'})).toBeVisible();
  await expect(menu).not.toContainText('Membri companie');
  await expect(menu).not.toContainText('Invită utilizator');
  await expect(menu).not.toContainText('Administrare companie');
  await menu.getByRole('button', {name: 'Companiile mele 2'}).dispatchEvent('click');
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(menu).toBeVisible();
});

test('toggles, closes on outside and Escape, and preserves focus', async ({page}) => {
  await page.goto('/dashboard');
  const trigger = page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'});
  const menu = page.getByRole('dialog', {name: 'Meniu profil'});
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('button', {name: 'Companiile mele 2'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await trigger.click();
  await expect(menu).not.toBeVisible();
  await trigger.click();
  await page.getByRole('heading', {name: 'Bun venit, Andrei!'}).click();
  await expect(menu).not.toBeVisible();
});

test('English copy, safe unresolved actions, and bell regression', async ({page}) => {
  await page.goto('/en/vendors');
  await page.getByRole('button', {name: 'User profile: Andrei Popescu'}).click();
  const menu = page.getByRole('dialog', {name: 'Profile menu'});
  await expect(menu).toContainText('at Demo Company SRL');
  await expect(menu.getByRole('button', {name: 'My profile'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'My companies 2'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'My invitations'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Help center'})).toHaveAttribute('aria-disabled', 'true');
  await expect(menu.getByRole('button', {name: 'Log out'})).toHaveAttribute('aria-disabled', 'true');
  await menu.getByRole('button', {name: 'Log out'}).dispatchEvent('click');
  await expect(page).toHaveURL(/\/en\/vendors$/);
  await page.getByRole('button', {name: 'Notifications', exact: true}).click();
  await expect(menu).not.toBeVisible();
  await expect(page.getByRole('dialog', {name: 'Notifications'})).toBeVisible();
});

test('profile menu stays contained at all contract widths', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1024, 768], [758, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/vendors');
    await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
    const menu = page.getByRole('dialog', {name: 'Meniu profil'});
    await expect(menu).toBeVisible();
    const geometry = await menu.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, documentWidth: document.documentElement.scrollWidth};
    });
    expect(geometry.left, `${width}px left`).toBeGreaterThanOrEqual(0);
    expect(geometry.right, `${width}px right`).toBeLessThanOrEqual(width);
    expect(geometry.top, `${width}px top`).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom, `${width}px bottom`).toBeLessThanOrEqual(height);
    expect(geometry.documentWidth, `${width}px document overflow`).toBeLessThanOrEqual(width);
    await expect(menu.getByRole('button', {name: 'Logout'})).toBeVisible();
  }
});

test('desktop and compact profile instances never stay open together', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/dashboard');
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await expect(page.locator('button[aria-label^="Profil utilizator:"][aria-expanded="true"]')).toHaveCount(1);
  await page.setViewportSize({width: 758, height: 833});
  await page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'}).click();
  await expect(page.locator('button[aria-label^="Profil utilizator:"][aria-expanded="true"]')).toHaveCount(1);
  await expect(page.getByRole('dialog', {name: 'Meniu profil'})).toHaveCount(1);
});
