import {expect, test} from '@playwright/test';
import {boundaryViewports, regressionViewports, viewports} from './support/viewports';

test('renders the canonical Romanian first step and editable local form', async ({page}) => {
  const response = await page.goto('/onboarding');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Hai să configurăm contul companiei tale');
  await expect(page.getByRole('link', {name: 'DEBIRO'})).toContainText('DEBIRO');
  await expect(page.getByRole('list', {name: 'Progres configurare'}).locator('[aria-current="step"]')).toContainText('Date companie');

  const company = page.getByLabel(/^Numele companiei/);
  await company.fill('Firma Test SRL');
  await expect(company).toHaveValue('Firma Test SRL');
  const password = page.locator('#administrator-password');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', {name: 'Afișează parola'}).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', {name: 'Ascunde parola'}).click();
  await expect(password).toHaveAttribute('type', 'password');
  await password.fill('lowercase');
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
  await password.fill('ValidPass1!');
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(true);

  const terms = page.locator('input[name="terms"]');
  await terms.uncheck();
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
  await terms.check();
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(true);
  await page.getByRole('button', {name: 'Continuă'}).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('renders English copy and switches locale without changing routing conventions', async ({page}) => {
  const response = await page.goto('/en/onboarding');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toHaveText("Let's set up your company account");
  await expect(page.getByRole('button', {name: 'Continue'})).toBeVisible();
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
});

test('keeps onboarding readable and non-overlapping across responsive modes', async ({page}) => {
  await page.goto('/onboarding');
  const matrix = [...Object.values(viewports), ...boundaryViewports, ...regressionViewports];

  for (const {width, height} of matrix) {
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({width, height});
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await expect(page.getByText('Ex: Global Clean Services SRL')).toBeVisible();
      await expect(page.getByRole('button', {name: 'Continuă'})).toBeVisible();
      await expect(page.getByRole('list', {name: 'Pași de configurare'})).toBeVisible();
      const geometry = await page.evaluate(() => {
        const rect = (element: Element) => {
          const {left, right, top, bottom} = element.getBoundingClientRect();
          return {left, right, top, bottom};
        };
        const overlap = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) =>
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const intro = rect(document.querySelector('main > aside')!);
        const workspace = rect(document.querySelector('main > section')!);
        const form = rect(document.querySelector('form')!);
        const guidance = rect(document.querySelector('aside[aria-label]')!);
        const controls = Array.from(document.querySelectorAll('form input, form select, form button')).map(rect);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          intro,
          workspace,
          form,
          guidance,
          introWorkspaceOverlap: overlap(intro, workspace),
          formGuidanceOverlap: overlap(form, guidance),
          controlOutsideViewport: controls.some((control) => control.left < 0 || control.right > innerWidth)
        };
      });

      expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
      expect(geometry.intro.left).toBeGreaterThanOrEqual((width >= 1200 ? 20 : width >= 768 ? 24 : 16) - 1);
      expect(geometry.workspace.right).toBeLessThanOrEqual(width - (width >= 1200 ? 20 : width >= 768 ? 24 : 16) + 1);
      expect(geometry.introWorkspaceOverlap).toBe(false);
      expect(geometry.formGuidanceOverlap).toBe(false);
      expect(geometry.controlOutsideViewport).toBe(false);
      if (width >= 1200) {
        expect(geometry.workspace.left).toBeGreaterThanOrEqual(geometry.intro.right + 15);
        expect(geometry.guidance.left).toBeGreaterThanOrEqual(geometry.form.right + 15);
      } else {
        expect(geometry.workspace.top).toBeGreaterThanOrEqual(geometry.intro.bottom + 15);
        expect(geometry.guidance.top).toBeGreaterThanOrEqual(geometry.form.bottom);
      }
    });
  }
});
