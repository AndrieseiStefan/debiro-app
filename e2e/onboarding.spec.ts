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

test('optional requirements need explicit selection and supplier finish needs a valid row', async ({page}) => {
  await page.goto('/onboarding');
  await page.getByRole('button', {name: 'Continuă'}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Configurează cerințele documentelor · Opțional');
  await expect(page.getByRole('list', {name: 'Progres configurare'}).locator('[aria-current="step"]')).toContainText('Cerințe documente');
  await expect(page.getByText('Recomandat', {exact: true})).toBeVisible();
  await expect(page.getByRole('radio', {name: /Subcontractori construcții/})).not.toBeChecked();
  await expect(page.getByRole('radio', {name: /Șablon general/})).not.toBeChecked();
  const tax = page.getByRole('checkbox', {name: /Certificat fiscal/});
  await expect(tax).not.toBeChecked();
  await expect(page.getByRole('button', {name: 'Continuă'})).toBeDisabled();
  await page.getByRole('radio', {name: /Șablon general/}).check();
  await expect(tax).toBeChecked();
  await expect(page.getByRole('checkbox', {name: /Asigurare răspundere civilă/})).not.toBeChecked();
  await tax.uncheck();
  await expect(page.getByRole('button', {name: 'Continuă'})).toBeEnabled();
  await page.getByRole('button', {name: 'Continuă'}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Invită primii furnizori · Opțional');
  await expect(page.getByRole('list', {name: 'Progres configurare'}).locator('[aria-current="step"]')).toContainText('Invită primii furnizori');
  await expect(page.getByText('Nu ai adăugat încă furnizori.')).toBeVisible();
  await expect(page.getByLabel(/^Numele furnizorului/)).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Finalizează configurarea'})).toBeDisabled();
  await page.getByRole('button', {name: 'Cerințe documente'}).click();
  await expect(page.getByRole('radio', {name: /Șablon general/})).toBeChecked();
  await expect(tax).not.toBeChecked();
  await page.getByRole('button', {name: 'Continuă'}).click();

  await page.getByRole('button', {name: 'Adaugă furnizor'}).click();
  const names = page.getByLabel(/^Numele furnizorului/);
  const emails = page.getByLabel(/^Email de contact/);
  await expect(names).toHaveCount(1);
  await expect(page.getByRole('button', {name: 'Finalizează configurarea'})).toBeDisabled();
  await names.first().fill('Furnizor Test');
  await emails.first().fill('invalid-email');
  await expect(page.getByText('Introdu o adresă de email validă.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Finalizează configurarea'})).toBeDisabled();
  await emails.first().fill('test@example.ro');
  await names.first().fill('');
  await expect(page.getByText('Introdu numele furnizorului.')).toBeVisible();
  await names.first().fill('Furnizor Test');
  await expect(page.getByText('Gata de invitat')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Finalizează configurarea'})).toBeEnabled();
  await page.getByRole('button', {name: 'Elimină Furnizor Test'}).click();
  await expect(names).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Finalizează configurarea'})).toBeDisabled();
  await page.getByRole('button', {name: 'Adaugă furnizor'}).click();
  await names.first().fill('Furnizor Test');
  await emails.first().fill('test@example.ro');
  await page.getByRole('button', {name: 'Adaugă alt furnizor'}).click();
  await expect(page.getByRole('button', {name: 'Finalizează configurarea'})).toBeEnabled();
  await page.getByRole('button', {name: 'Finalizează configurarea'}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('skipping either optional step clears local drafts without creating setup data', async ({page}) => {
  await page.goto('/onboarding');
  await page.getByRole('button', {name: 'Continuă'}).click();
  await page.getByRole('checkbox', {name: /Certificat fiscal/}).check();
  await expect(page.getByRole('button', {name: 'Continuă'})).toBeEnabled();
  await page.getByRole('button', {name: 'Configurează mai târziu'}).click();
  await expect(page.getByText('Nu ai adăugat încă furnizori.')).toBeVisible();
  await page.getByRole('button', {name: 'Cerințe documente'}).click();
  await expect(page.getByRole('checkbox', {name: /Certificat fiscal/})).not.toBeChecked();
  await expect(page.getByRole('button', {name: 'Continuă'})).toBeDisabled();
  await page.getByRole('button', {name: 'Configurează mai târziu'}).click();
  await page.getByRole('button', {name: 'Adaugă furnizor'}).click();
  await page.getByLabel(/^Numele furnizorului/).fill('Neconfirmat SRL');
  await expect(page.getByRole('button', {name: 'Finalizează configurarea'})).toBeDisabled();
  await page.getByRole('button', {name: 'Sari peste'}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('English onboarding completes all three steps with locale-aware dashboard navigation', async ({page}) => {
  await page.goto('/en/onboarding');
  await page.getByRole('button', {name: 'Continue'}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Configure document requirements · Optional');
  await expect(page.getByRole('button', {name: 'Continue'})).toBeDisabled();
  await page.getByRole('radio', {name: /General template/}).check();
  await page.getByRole('button', {name: 'Continue'}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Invite your first suppliers · Optional');
  await expect(page.getByRole('button', {name: 'Finish setup'})).toBeDisabled();
  await page.getByRole('button', {name: 'Add supplier'}).click();
  await page.getByLabel(/^Supplier name/).fill('Example Supplier');
  await page.getByLabel(/^Contact email/).fill('supplier@example.com');
  await page.getByRole('button', {name: 'Finish setup'}).click();
  await expect(page).toHaveURL(/\/en\/dashboard$/);
});

test('steps two and three stay contained at the required viewport widths', async ({page}) => {
  const widths = [[1448, 1086], [1024, 768], [768, 833], [600, 800], [375, 812], [320, 700]];
  for (const targetStep of [2, 3]) {
    await page.goto('/onboarding');
    await page.getByRole('button', {name: 'Continuă'}).click();
    if (targetStep === 3) await page.getByRole('button', {name: 'Configurează mai târziu'}).click();
    for (const [width, height] of widths) {
      await page.setViewportSize({width, height});
      const geometry = await page.evaluate(() => {
        const form = document.querySelector('[class*="formColumn"]')!.getBoundingClientRect();
        const guidance = document.querySelector('aside[aria-label]')!.getBoundingClientRect();
        const controls = [...document.querySelectorAll('input, button')].map((element) => element.getBoundingClientRect());
        return {
          documentWidth: document.documentElement.scrollWidth,
          formRight: form.right,
          guidanceLeft: guidance.left,
          formBottom: form.bottom,
          guidanceTop: guidance.top,
          controlOutsideViewport: controls.some((rect) => rect.left < -1 || rect.right > innerWidth + 1)
        };
      });
      expect(geometry.documentWidth, `step ${targetStep}, ${width}px overflow`).toBeLessThanOrEqual(width);
      expect(geometry.controlOutsideViewport, `step ${targetStep}, ${width}px control containment`).toBe(false);
      if (width >= 1200) expect(geometry.guidanceLeft, `step ${targetStep}, ${width}px rail overlap`).toBeGreaterThanOrEqual(geometry.formRight + 15);
      else expect(geometry.guidanceTop, `step ${targetStep}, ${width}px rail stacking`).toBeGreaterThanOrEqual(geometry.formBottom);
    }
  }
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
