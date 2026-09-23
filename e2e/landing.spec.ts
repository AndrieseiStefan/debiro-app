import {expect, test} from '@playwright/test';

test('renders canonical Romanian copy, navigation and textual branding', async ({page}) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', {level: 1})).toHaveText(/Toate documentele furnizorilor tăi, într-un singur loc\./);
  await expect(page.getByRole('navigation', {name: 'Navigare principală'})).toBeVisible();
  await expect(page.getByRole('button', {name: /Încearcă gratuit/}).first()).toBeVisible();
  const brand = page.getByRole('link', {name: 'DEBIRO'});
  await expect(brand).toHaveText('DEBIRO');
  await expect(brand.locator('img, svg')).toHaveCount(0);
  await expect(page.getByText('Fără Excel. Fără stres.', {exact: false})).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain('debiro');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
});

test('renders English copy and switches locale', async ({page}) => {
  const response = await page.goto('/en');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toContainText("All your suppliers'");
  expect(await page.locator('body').innerText()).not.toContain('debiro');
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
});

test('avoids document-level horizontal overflow at desktop and narrow widths', async ({page}) => {
  await page.goto('/');
  for (const width of [1448, 375, 320]) {
    await page.setViewportSize({width, height: 1086});
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const cta of await page.getByRole('button', {name: 'Încearcă gratuit'}).all()) {
      const bounds = await cta.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
  }
});

test('uses one desktop content grid and centers both CTA labels and arrows', async ({page}) => {
  await page.goto('/');
  const grid = await page.evaluate(() =>
    Array.from(document.querySelectorAll('header > div, main > section > div'))
      .filter((element) => getComputedStyle(element).maxWidth === '1350px')
      .map((element) => ({
        left: element.getBoundingClientRect().left,
        width: element.getBoundingClientRect().width,
        paddingLeft: getComputedStyle(element).paddingLeft,
        paddingRight: getComputedStyle(element).paddingRight
      }))
  );
  expect(grid).toHaveLength(5);
  for (const container of grid) {
    expect(container).toEqual({left: 49, width: 1350, paddingLeft: '28px', paddingRight: '28px'});
  }

  const heroSpacing = await page.evaluate(() => {
    const heroInner = document.querySelector('main > section')!.children[1];
    const copy = heroInner.children[0];
    const preview = heroInner.children[1].firstElementChild!;
    const trustItems = Array.from(copy.querySelector('ul')!.children);
    return {
      trustCount: trustItems.length,
      trustRight: Math.max(...trustItems.map((item) => item.getBoundingClientRect().right)),
      copyRight: copy.getBoundingClientRect().right,
      previewLeft: preview.getBoundingClientRect().left,
      previewWidth: preview.getBoundingClientRect().width
    };
  });
  expect(heroSpacing.trustCount).toBe(3);
  expect(heroSpacing.trustRight).toBeLessThanOrEqual(heroSpacing.copyRight);
  expect(heroSpacing.previewLeft - heroSpacing.trustRight).toBeGreaterThanOrEqual(24);
  expect(heroSpacing.previewWidth).toBe(700);

  const buttons = await page.getByRole('button', {name: 'Încearcă gratuit'}).all();
  expect(buttons).toHaveLength(2);
  for (const [index, button] of buttons.entries()) {
    const alignment = await button.evaluate((element) => {
      const content = element.querySelector('span')!;
      const icon = content.querySelector('svg')!;
      const label = content.firstChild!;
      const range = document.createRange();
      range.selectNodeContents(label);
      const buttonBox = element.getBoundingClientRect();
      const contentBox = content.getBoundingClientRect();
      const iconBox = icon.getBoundingClientRect();
      const labelBox = range.getBoundingClientRect();
      return {
        buttonHeight: buttonBox.height,
        contentCenterDelta: Math.abs(contentBox.top + contentBox.height / 2 - (buttonBox.top + buttonBox.height / 2)),
        iconLabelCenterDelta: Math.abs(iconBox.top + iconBox.height / 2 - (labelBox.top + labelBox.height / 2)),
        contentDisplay: getComputedStyle(content).display,
        contentAlignment: getComputedStyle(content).alignItems,
        gap: getComputedStyle(content).gap,
        iconDisplay: getComputedStyle(icon).display
      };
    });
    expect(alignment.buttonHeight).toBe(index === 0 ? 40 : 56);
    expect(alignment.contentCenterDelta).toBeLessThan(1);
    expect(alignment.iconLabelCenterDelta).toBeLessThan(2);
    expect(alignment.contentDisplay).toBe('flex');
    expect(alignment.contentAlignment).toBe('center');
    expect(alignment.gap).toBe(index === 0 ? '12px' : '14px');
    expect(alignment.iconDisplay).toBe('block');
  }
});

test('provides a visible keyboard focus indicator', async ({page}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name: 'DEBIRO'})).toBeFocused();
  await expect(page.getByRole('link', {name: 'DEBIRO'})).toHaveCSS('outline-style', 'solid');
});
