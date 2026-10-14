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
  await expect(menu.getByRole('button')).toHaveCount(2);
  await expect(menu.getByRole('link', {name: 'Profilul meu'})).toBeFocused();
  await expect(menu.getByRole('link', {name: 'Companiile mele 2'})).toBeVisible();
  await expect(menu.getByRole('link', {name: 'Invitațiile mele 1'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Centrul de ajutor'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Logout'})).toBeVisible();
  await expect(menu).not.toContainText('Membri companie');
  await expect(menu).not.toContainText('Invită utilizator');
  await expect(menu).not.toContainText('Administrare companie');
  await menu.getByRole('link', {name: 'Companiile mele 2'}).click();
  await expect(page).toHaveURL(/\/profile\/companies$/);
  await expect(menu).not.toBeVisible();
});

test('toggles, closes on outside and Escape, and preserves focus', async ({page}) => {
  await page.goto('/dashboard');
  const trigger = page.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'});
  const menu = page.getByRole('dialog', {name: 'Meniu profil'});
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', {name: 'Companiile mele 2'})).toBeFocused();
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
  await expect(menu.getByRole('link', {name: 'My profile'})).toBeVisible();
  await expect(menu.getByRole('link', {name: 'My companies 2'})).toBeVisible();
  await expect(menu.getByRole('link', {name: 'My invitations 1'})).toBeVisible();
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

for (const english of [false, true]) {
  test(`${english ? 'EN' : 'RO'} compact circular profile trigger keeps its attached chevron and accessible states`, async ({page}) => {
    test.setTimeout(60_000);
    await page.goto(english ? '/en/dashboard' : '/dashboard');
    const trigger = page.getByRole('button', {name: english ? 'User profile: Andrei Popescu' : 'Profil utilizator: Andrei Popescu'});
    const menu = page.getByRole('dialog', {name: english ? 'Profile menu' : 'Meniu profil'});
    for (const width of [1448, 1024, 801, 800, 768, 758, 600, 375, 320]) {
      await test.step(`${width}px`, async () => {
        await page.setViewportSize({width, height: 1086});
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(trigger).toBeVisible();
        await expect(trigger).toBeInViewport();
        const geometry = await trigger.evaluate((element) => {
          const bounds = (node: Element) => {
            const {x, y, width, height, right, bottom} = node.getBoundingClientRect();
            return {x, y, width, height, right, bottom};
          };
          const utilities = element.parentElement!.parentElement!;
          return {
            trigger: bounds(element), avatar: bounds(element.querySelector('span')!), chevron: bounds(element.querySelector('svg')!),
            bell: bounds(utilities.querySelector('button')!), locale: bounds(utilities.querySelector('nav')!),
            radius: getComputedStyle(element).borderRadius, chevronDisplay: getComputedStyle(element.querySelector('svg')!).display
          };
        });
        expect(geometry.radius).toBe('50%');
        expect(geometry.trigger.width).toBe(width > 800 ? 38 : 34);
        expect(geometry.trigger.height).toBe(geometry.trigger.width);
        expect(geometry.avatar.width).toBe(geometry.trigger.width - 2);
        expect(geometry.chevronDisplay).not.toBe('none');
        expect(geometry.chevron.x).toBeGreaterThan(geometry.trigger.x + geometry.trigger.width / 2);
        expect(geometry.chevron.y).toBeGreaterThan(geometry.trigger.y + geometry.trigger.height / 2);
        expect(geometry.chevron.right).toBeLessThanOrEqual(geometry.trigger.right + 1);
        expect(geometry.chevron.bottom).toBeLessThanOrEqual(geometry.trigger.bottom + 1);
        for (const sibling of [geometry.bell, geometry.locale]) {
          expect(Math.abs(sibling.y + sibling.height / 2 - geometry.trigger.y - geometry.trigger.height / 2)).toBeLessThanOrEqual(1);
          expect(sibling.right).toBeLessThan(geometry.trigger.x);
        }

        await trigger.hover();
        await expect(trigger).toHaveCSS('background-color', 'rgb(232, 241, 255)');
        await expect(trigger).toHaveCSS('border-radius', '50%');
        expect(await trigger.boundingBox()).toEqual({x: geometry.trigger.x, y: geometry.trigger.y, width: geometry.trigger.width, height: geometry.trigger.height});
        await trigger.focus();
        await expect(trigger).toHaveCSS('outline-style', 'solid');
        await expect(trigger).toHaveCSS('outline-width', '3px');
        await page.keyboard.press('Space');
        await expect(menu).toBeVisible();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await page.keyboard.press('Escape');
        await expect(menu).not.toBeVisible();
        await expect(trigger).toBeFocused();
        // The attached indicator is part of the same button, not a second action.
        await trigger.locator('svg').click();
        await expect(menu).toBeVisible();
        const panel = await menu.boundingBox();
        expect(panel!.x).toBeGreaterThanOrEqual(0);
        expect(panel!.x + panel!.width).toBeLessThanOrEqual(width);
        expect(panel!.y).toBeGreaterThanOrEqual(geometry.trigger.bottom);
        await page.getByRole('heading', {level: 1}).click();
        await expect(menu).not.toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });
    }
  });
}
