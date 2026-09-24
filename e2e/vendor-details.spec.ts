import {expect, test} from '@playwright/test';

const detailsPath = '/vendors/construct-pro';

test('opens canonical Romanian details from the existing list action and returns by breadcrumb', async ({page}) => {
  await page.goto('/vendors');
  await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
  await expect(page).toHaveURL(new RegExp(`${detailsPath}$`));
  await expect(page.getByRole('heading', {level: 1, name: 'Construct Pro SRL'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'})).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('tab', {name: 'Documente'})).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(6);
  await page.getByRole('navigation', {name: 'Navigare pe pagină'}).getByRole('link', {name: 'Furnizori'}).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
  await expect(page.getByText('4 din 5 documente valide')).toBeVisible();
});

test('opens English details and preserves the route on locale switch', async ({page}) => {
  await page.goto('/en/vendors');
  await page.getByRole('link', {name: 'Details for Construct Pro SRL'}).click();
  await expect(page).toHaveURL(/\/en\/vendors\/construct-pro$/);
  await expect(page.getByText('4 of 5 valid documents')).toBeVisible();
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`${detailsPath}$`));
});

test('unknown fixture ID returns not found', async ({page}) => {
  const response = await page.goto('/vendors/does-not-exist');
  expect(response?.status()).toBe(404);
});

test('details stay within the document at authenticated responsive widths', async ({page}) => {
  await page.goto(detailsPath);
  for (const width of [1448, 1216, 1199, 1024, 801, 799, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : width === 1216 || width === 1199 || width === 758 ? 833 : 768});
    await expect(page.getByRole('heading', {level: 1, name: 'Construct Pro SRL'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Adaugă document'})).toBeVisible();
    const dimensions = await page.evaluate(() => ({document: document.documentElement.scrollWidth, table: document.querySelector('[role="region"][aria-label="Documentele furnizorului"]')!.getBoundingClientRect().right}));
    expect(dimensions.document, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(dimensions.table).toBeLessThanOrEqual(width + 1);
  }
});

test('keeps vendor identity, status, actions, and contact cells distinct at responsive transitions', async ({page}) => {
  await page.goto(detailsPath);
  for (const [width, expectedColumns] of [[1448, 3], [1216, 2], [1199, 2], [1024, 2], [801, 2], [758, 1], [600, 1], [375, 1], [320, 1]]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : 833});
    const geometry = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const identity = box('[data-vendor-identity]');
      const icon = box('[data-vendor-icon]');
      const name = box('[data-vendor-name]');
      const category = box('[data-vendor-category]');
      const status = box('[data-vendor-status]');
      const actions = box('[data-vendor-actions]');
      const buttons = [...document.querySelectorAll('[data-vendor-actions] button')].map((button) => button.getBoundingClientRect());
      const contacts = [...document.querySelectorAll('[data-vendor-contact]')].map((item) => item.getBoundingClientRect());
      const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
      return {
        documentWidth: document.documentElement.scrollWidth,
        iconBesideName: icon.right <= name.left + 1 && icon.top < name.bottom && icon.bottom > name.top,
        categoryContained: category.left >= identity.left && category.right <= identity.right + 1 && category.bottom <= identity.bottom + 1,
        categoryNoWrap: getComputedStyle(document.querySelector('[data-vendor-category]')!).whiteSpace === 'nowrap',
        headerOverlap: overlaps(identity, status) || overlaps(identity, actions) || overlaps(status, actions) || overlaps(buttons[0], buttons[1]),
        actionsContained: buttons.every((button) => button.left >= actions.left - 1 && button.right <= actions.right + 1),
        contactColumns: contacts.filter((item) => Math.abs(item.top - contacts[0].top) < 1).length,
        finalContactFillsRow: contacts[4].width > contacts[0].width * 1.5
      };
    });
    expect(geometry.documentWidth, `${width}px document overflow`).toBeLessThanOrEqual(width);
    expect(geometry.iconBesideName, `${width}px company icon separated from name`).toBe(true);
    expect(geometry.categoryContained, `${width}px category escaped identity`).toBe(true);
    expect(geometry.categoryNoWrap, `${width}px category wrapped`).toBe(true);
    expect(geometry.headerOverlap, `${width}px header collision`).toBe(false);
    expect(geometry.actionsContained, `${width}px actions escaped their region`).toBe(true);
    expect(geometry.contactColumns, `${width}px contact column count`).toBe(expectedColumns);
    if (expectedColumns === 2) expect(geometry.finalContactFillsRow, `${width}px stranded final contact cell`).toBe(true);
  }
});

test('direct and client-navigated details have equivalent geometry', async ({page}) => {
  const measure = async () => page.evaluate(() => {
    const heading = document.querySelector('h1')!.getBoundingClientRect();
    const panel = document.querySelector('[role="tabpanel"]')!.getBoundingClientRect();
    return {heading: [heading.x, heading.y, heading.width], panel: [panel.x, panel.y, panel.width]};
  });
  for (const width of [1448, 1216, 758]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 833});
    await page.goto(detailsPath);
    const direct = await measure();
    await page.goto('/vendors');
    await page.getByRole('link', {name: 'Detalii pentru Construct Pro SRL'}).click();
    await expect(page.getByRole('heading', {level: 1, name: 'Construct Pro SRL'})).toBeVisible();
    const navigated = await measure();
    expect(navigated.heading, `${width}px heading after client navigation`).toEqual(direct.heading);
    expect(navigated.panel, `${width}px panel after client navigation`).toEqual(direct.panel);
  }
});
