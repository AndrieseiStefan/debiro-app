import {expect, test} from '@playwright/test';

const route = '/documents/construct-pro-tax-2024/review';

test('renders Romanian document review and local human confirmation', async ({page}) => {
  await page.goto(route);
  await expect(page.getByRole('heading', {level: 1, name: 'Revizuiește documentul'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByText('Documente').locator('..')).toHaveAttribute('aria-current', 'page');
  const breadcrumb = page.getByRole('navigation', {name: 'Navigare pe pagină'});
  await expect(breadcrumb).toHaveText('DocumenteRevizuiește documentul');
  await expect(breadcrumb.getByText('Furnizori')).toHaveCount(0);
  await expect(breadcrumb.getByText('Construct Pro SRL')).toHaveCount(0);
  await expect(page.getByRole('region', {name: 'Previzualizare document'}).first()).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Date extrase de AI'})).toBeVisible();
  await expect(page.getByLabel(/Numele companiei/)).toHaveValue('Construct Pro SRL');
  await page.getByLabel(/Numele companiei/).fill('Construct Pro Actualizat SRL');
  await page.getByRole('button', {name: 'Confirmă și salvează'}).click();
  await expect(page.getByRole('status')).toContainText('Date confirmate de un om, local');
  await expect(page.getByRole('status')).toContainText('Nu au fost verificate din surse oficiale');
});

test('validates required values and invalid dates before confirmation', async ({page}) => {
  await page.goto(route);
  await page.getByLabel(/Numele companiei/).fill('');
  await page.getByLabel(/Dată expirare/).fill('31.02.2025');
  await page.getByRole('button', {name: 'Confirmă și salvează'}).click();
  await expect(page.getByLabel(/Numele companiei/)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel(/Dată expirare/)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Folosește o dată validă în format ZZ.LL.AAAA.')).toBeVisible();
});

test('English route and locale navigation preserve the fixture identity and layout', async ({page}) => {
  for (const width of [1448, 1252, 853, 375]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 833});
    await page.goto(route);
    await page.evaluate(async () => { await document.fonts.ready; });
    const direct = await page.locator('[data-review-preview]').boundingBox();
    await page.getByRole('link', {name: 'EN', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`/en${route}$`));
    await expect(page.getByRole('heading', {level: 1, name: 'Review document'})).toBeVisible();
    await expect(page.getByLabel(/Company name/)).toHaveValue('Construct Pro SRL');
    await page.getByRole('link', {name: 'RO', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.getByRole('heading', {level: 1, name: 'Revizuiește documentul'})).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; });
    const navigated = await page.locator('[data-review-preview]').boundingBox();
    expect(navigated, `${width}px direct/client layout`).toEqual(direct);
  }
});

test('unknown fixture ID is a 404 and no global Documents list is exposed', async ({page}) => {
  const response = await page.goto('/documents/not-a-fixture/review');
  expect(response?.status()).toBe(404);
  const list = await page.goto('/documents');
  expect(list?.status()).toBe(404);
});

test('header, panels, actions and proportional viewer reflow without collisions', async ({page}) => {
  await page.goto(route);
  for (const [width, expectedActions] of [[1448, 3], [1252, 3], [1024, 3], [853, 2], [801, 2], [758, 3], [600, 2], [375, 1], [320, 1]]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : width === 375 ? 812 : width === 1252 || width === 853 ? 833 : 768});
    await expect(page.getByRole('button', {name: 'Confirmă și salvează'})).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const preview = rect('[data-review-preview]');
      const panel = rect('[aria-labelledby="extraction-heading"]');
      const heading = rect('header[class*="pageHeader"] > div:first-child');
      const callout = rect('header[class*="pageHeader"] > div:last-child');
      const main = document.querySelector('main')!.getBoundingClientRect();
      const buttons = [...document.querySelectorAll('[class*="actions"] > div > button')].filter((button) => ['Respinge', 'Salvează ca draft', 'Confirmă și salvează'].some((label) => button.textContent?.includes(label)));
      const buttonRects = buttons.map((button) => button.getBoundingClientRect());
      const frame = document.querySelector('[data-source-width]') as HTMLElement;
      const paper = frame.querySelector('article')!.getBoundingClientRect();
      const viewer = document.querySelector('[data-document-viewer]')!;
      return {
        documentWidth: document.documentElement.scrollWidth,
        previewLeft: preview.left, previewRight: preview.right, mainLeft: main.left, mainRight: main.right,
        headerSideBySide: heading.top < callout.bottom - 1 && heading.bottom > callout.top + 1,
        headerOverlap: heading.left < callout.right - 1 && heading.right > callout.left + 1 && heading.top < callout.bottom - 1 && heading.bottom > callout.top + 1,
        panelsSideBySide: preview.top < panel.bottom - 1 && preview.bottom > panel.top + 1,
        panelOverlap: preview.left < panel.right - 1 && preview.right > panel.left + 1 && preview.top < panel.bottom - 1 && preview.bottom > panel.top + 1,
        actionsFirstRow: buttonRects.filter((button) => Math.abs(button.top - buttonRects[0].top) < 1).length,
        actionsContained: buttonRects.every((button) => button.left >= panel.left - 1 && button.right <= panel.right + 1) && buttons.every((button) => button.scrollWidth <= button.clientWidth + 1),
        pageAspect: paper.width / paper.height,
        sourceAspect: Number(frame.dataset.sourceWidth) / Number(frame.dataset.sourceHeight),
        paperFits: paper.width <= viewer.clientWidth + 1 && paper.height <= viewer.clientHeight + 1
      };
    });
    expect(geometry.documentWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(geometry.previewLeft, `preview escaped left at ${width}px`).toBeGreaterThanOrEqual(geometry.mainLeft - 1);
    expect(geometry.previewRight, `preview escaped right at ${width}px`).toBeLessThanOrEqual(geometry.mainRight + 1);
    expect(geometry.headerOverlap, `header collision at ${width}px`).toBe(false);
    expect(geometry.panelOverlap, `panel collision at ${width}px`).toBe(false);
    expect(geometry.headerSideBySide, `${width}px header layout`).toBe(width === 1448);
    expect(geometry.panelsSideBySide, `${width}px panel layout`).toBe(width === 1448);
    expect(geometry.actionsFirstRow, `${width}px action layout`).toBe(expectedActions);
    expect(geometry.actionsContained, `${width}px button geometry`).toBe(true);
    expect(geometry.pageAspect, `${width}px document aspect`).toBeCloseTo(geometry.sourceAspect, 3);
    expect(geometry.paperFits, `${width}px document fit`).toBe(true);
  }
});

test('zoom preserves source aspect ratio and scrolls only inside the viewer', async ({page}) => {
  for (const width of [1448, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await page.goto(route);
    await page.getByRole('button', {name: 'Mărește documentul'}).click();
    await page.getByRole('button', {name: 'Mărește documentul'}).click();
    await expect(page.locator('[data-zoom="150"]')).toBeVisible();
    const zoomed = await page.evaluate(() => {
      const viewer = document.querySelector('[data-document-viewer]')!;
      const frame = document.querySelector('[data-source-width]') as HTMLElement;
      const paper = frame.querySelector('article')!.getBoundingClientRect();
      return {browserWidth: document.documentElement.scrollWidth, scrollsX: viewer.scrollWidth > viewer.clientWidth + 1, scrollsY: viewer.scrollHeight > viewer.clientHeight + 1, aspect: paper.width / paper.height, sourceAspect: Number(frame.dataset.sourceWidth) / Number(frame.dataset.sourceHeight)};
    });
    expect(zoomed.browserWidth, `${width}px zoom overflow`).toBeLessThanOrEqual(width);
    expect(zoomed.scrollsX, `${width}px viewer horizontal scroll`).toBe(true);
    expect(zoomed.scrollsY, `${width}px viewer vertical scroll`).toBe(true);
    expect(zoomed.aspect).toBeCloseTo(zoomed.sourceAspect, 3);
    await page.getByRole('button', {name: 'Micșorează documentul'}).click();
    await page.getByRole('button', {name: 'Micșorează documentul'}).click();
    await expect(page.locator('[data-zoom="100"]')).toBeVisible();
    await page.getByRole('button', {name: 'Extinde previzualizarea'}).click();
    await expect(page.getByRole('button', {name: 'Restrânge previzualizarea'})).toHaveAttribute('aria-pressed', 'true');
    const expanded = await page.evaluate(() => {
      const frame = document.querySelector('[data-source-width]') as HTMLElement;
      const paper = frame.querySelector('article')!.getBoundingClientRect();
      return {documentWidth: document.documentElement.scrollWidth, aspect: paper.width / paper.height, sourceAspect: Number(frame.dataset.sourceWidth) / Number(frame.dataset.sourceHeight)};
    });
    expect(expanded.documentWidth, `${width}px expanded overflow`).toBeLessThanOrEqual(width);
    expect(expanded.aspect).toBeCloseTo(expanded.sourceAspect, 3);
  }
});
