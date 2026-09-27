import {expect, test} from '@playwright/test';

test('renders Romanian login and validates its local fields before Dashboard navigation', async ({page}) => {
  const response = await page.goto('/login');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByRole('heading', {name: 'Bun venit înapoi!'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Conectează-te în contul tău'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Conectează-te'})).toBeDisabled();
  await expect(page.getByRole('button', {name: /Google|Facebook|Apple/i})).toHaveCount(0);

  const email = page.getByLabel('Email');
  const password = page.getByLabel('Parolă');
  await email.focus();
  await email.blur();
  await expect(page.getByText('Introdu adresa de email.')).toBeVisible();
  await email.fill('invalid');
  await email.blur();
  await expect(page.getByText('Introdu o adresă de email validă.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Conectează-te'})).toBeDisabled();
  await email.fill('andrei@example.ro');
  await password.focus();
  await password.blur();
  await expect(page.getByText('Introdu parola.')).toBeVisible();
  await expect(password).toHaveAttribute('type', 'password');
  await password.fill('demo-password');
  await page.getByRole('button', {name: 'Afișează parola'}).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', {name: 'Ascunde parola'}).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', {name: 'Conectează-te'})).toBeEnabled();

  await expect(page.getByRole('button', {name: 'Ai uitat parola?'})).toBeDisabled();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', {name: 'Conectează-te'}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('English login keeps locale and links to English onboarding', async ({page}) => {
  const response = await page.goto('/en/login');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {name: 'Sign in to your account'})).toBeVisible();
  await page.getByRole('link', {name: 'Get started free'}).click();
  await expect(page).toHaveURL(/\/en\/onboarding$/);
  await page.goto('/en/login');
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('English valid local submission navigates to the English Dashboard', async ({page}) => {
  await page.goto('/en/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.locator('#login-password').fill('demo-password');
  await page.getByRole('button', {name: 'Sign in'}).click();
  await expect(page).toHaveURL(/\/en\/dashboard$/);
});

test('login stays contained at canonical and reduced viewport widths', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1024, 768], [768, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/login');
    await expect(page.getByRole('heading', {name: 'Conectează-te în contul tău'})).toBeVisible();
    const geometry = await page.evaluate(() => {
      const card = document.querySelector('main section[aria-label="Autentificare"] > div:last-child')!.getBoundingClientRect();
      const inputs = [...document.querySelectorAll('input, button, a')].map((element) => element.getBoundingClientRect());
      return {
        scrollWidth: document.documentElement.scrollWidth,
        cardLeft: card.left,
        cardRight: card.right,
        controlsOutside: inputs.some((rect) => rect.left < -1 || rect.right > innerWidth + 1)
      };
    });
    expect(geometry.scrollWidth, `${width}px horizontal overflow`).toBeLessThanOrEqual(width);
    expect(geometry.cardLeft, `${width}px card left`).toBeGreaterThanOrEqual(-1);
    expect(geometry.cardRight, `${width}px card right`).toBeLessThanOrEqual(width + 1);
    expect(geometry.controlsOutside, `${width}px control containment`).toBe(false);
  }
});
