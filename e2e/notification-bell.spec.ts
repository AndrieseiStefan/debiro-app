import {expect, test} from '@playwright/test';

test('preview uses the E1-010 activity and closes accessibly', async ({page}) => {
  await page.goto('/vendors');
  const bell = page.getByRole('button', {name: 'Notificări', exact: true});
  await expect(bell).toContainText('3');
  await bell.click();
  const panel = page.getByRole('dialog', {name: 'Notificări'});
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-notification-id]')).toHaveCount(6);
  await expect(panel.locator('[data-notification-id="notice-reminder-1"]')).toContainText('Reminder trimis');
  await expect(panel.locator('[data-notification-id="notice-reminder-1"]')).toHaveAttribute('data-unread', 'true');
  await expect(panel.getByRole('button', {name: 'Marchează toate ca citite'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(bell).toBeFocused();
  await bell.click();
  await page.mouse.click(320, 800);
  await expect(panel).not.toBeVisible();
  await expect(bell).toBeFocused();
});

test('mark all read updates bell, sidebar, and full history across client navigation', async ({page}) => {
  await page.goto('/vendors');
  const bell = page.getByRole('button', {name: 'Notificări', exact: true});
  const sidebar = page.getByRole('navigation', {name: 'Navigare în aplicație'});
  await expect(sidebar.getByRole('link', {name: /Notificări/})).toContainText('3');
  await bell.click();
  const panel = page.getByRole('dialog', {name: 'Notificări'});
  await panel.getByRole('button', {name: 'Marchează toate ca citite'}).click();
  await expect(panel.locator('[data-unread="true"]')).toHaveCount(0);
  await expect(panel.getByRole('button', {name: 'Marchează toate ca citite'})).toHaveAttribute('aria-disabled', 'true');
  await expect(bell.locator('span')).toHaveCount(0);
  await expect(sidebar.getByRole('link', {name: 'Notificări'})).not.toContainText('3');
  await panel.getByRole('link', {name: 'Vezi toate notificările'}).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole('navigation', {name: 'Filtre activitate'}).getByRole('button', {name: /Necitite 0/})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Activitate recentă'}).getByText('Necitit')).toHaveCount(0);
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'}).click();
  await expect(page.getByRole('button', {name: 'Notificări', exact: true}).locator('span')).toHaveCount(0);
});

test('English footer preserves locale and known document notification navigates to review', async ({page}) => {
  await page.goto('/en/vendors');
  await page.getByRole('button', {name: 'Notifications', exact: true}).click();
  const panel = page.getByRole('dialog', {name: 'Notifications'});
  await expect(panel.locator('[data-notification-id="notice-reminder-1"]')).toContainText('Reminder sent');
  await panel.getByRole('link', {name: /Reminder sent/}).click();
  await expect(page).toHaveURL(/\/en\/documents\/construct-pro-tax-2024\/review$/);
  await page.getByRole('button', {name: 'Notifications', exact: true}).click();
  await page.getByRole('dialog', {name: 'Notifications'}).getByRole('link', {name: 'View all notifications'}).click();
  await expect(page).toHaveURL(/\/en\/notifications$/);
});

test('popover remains inside the viewport at all required widths', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1024, 768], [758, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/vendors');
    await page.getByRole('button', {name: 'Notificări', exact: true}).click();
    const panel = page.getByRole('dialog', {name: 'Notificări'});
    await expect(panel).toBeVisible();
    const geometry = await panel.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, documentWidth: document.documentElement.scrollWidth};
    });
    expect(geometry.left, `${width}px left containment`).toBeGreaterThanOrEqual(0);
    expect(geometry.right, `${width}px right containment`).toBeLessThanOrEqual(width);
    expect(geometry.top, `${width}px top containment`).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom, `${width}px bottom containment`).toBeLessThanOrEqual(height);
    expect(geometry.documentWidth, `${width}px page overflow`).toBeLessThanOrEqual(width);
    await expect(panel.getByRole('link', {name: 'Vezi toate notificările'})).toBeVisible();
  }
});
