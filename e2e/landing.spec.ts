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

test('keeps the landing page stable across the responsive viewport matrix', async ({page}) => {
  await page.goto('/');
  const viewports = [
    {width: 1448, height: 1086, gutter: 28},
    {width: 1280, height: 800, gutter: 28},
    {width: 1024, height: 768, gutter: 28},
    {width: 950, height: 833, gutter: 24},
    {width: 768, height: 1024, gutter: 24},
    {width: 480, height: 900, gutter: 20},
    {width: 375, height: 812, gutter: 16},
    {width: 320, height: 700, gutter: 16}
  ] as const;

  for (const {width, height, gutter} of viewports) {
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({width, height});
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await expect(page.getByRole('heading', {name: 'Simplu. Automat. Fără bătăi de cap.'})).toBeVisible();
      await expect(page.getByRole('heading', {name: 'Planuri flexibile pentru orice dimensiune de companie.'})).toBeVisible();
      await expect(page.getByRole('link', {name: 'DEBIRO'})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Autentificare'})).toBeVisible();
      await expect(page.getByRole('link', {name: 'RO', exact: true})).toBeVisible();
      await expect(page.getByRole('link', {name: 'EN', exact: true})).toBeVisible();
      if (width <= 767) {
        await expect(page.getByRole('navigation', {name: 'Navigare principală'})).toBeHidden();
      } else {
        await expect(page.getByRole('navigation', {name: 'Navigare principală'})).toBeVisible();
      }

      const geometry = await page.evaluate(() => {
        const rect = (element: Element) => {
          const box = element.getBoundingClientRect();
          return {left: box.left, right: box.right, top: box.top, bottom: box.bottom};
        };
        const overlaps = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) =>
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const anyOverlap = (boxes: ReturnType<typeof rect>[]) =>
          boxes.some((box, index) => boxes.slice(index + 1).some((other) => overlaps(box, other)));
        const sections = document.querySelectorAll('main > section');
        const heroInner = sections[0].children[1];
        const heroCopy = heroInner.children[0];
        const heroVisual = heroInner.children[1];
        const preview = heroVisual.firstElementChild!;
        const controls = Array.from(heroCopy.querySelectorAll('button'));
        const trustItems = Array.from(heroCopy.querySelector('ul')!.children);
        const cards = Array.from(sections[1].querySelectorAll('article'));
        const pricingInner = sections[3].children[1];
        const pricingCopy = pricingInner.children[1];
        const pricingButton = pricingInner.querySelector('button')!;
        const heroDecoration = heroVisual.lastElementChild!;
        const pricingDecoration = pricingInner.lastElementChild!;
        const headerInner = document.querySelector('header > div')!;
        const headerItems = [
          headerInner.children[0],
          ...Array.from(headerInner.children[1].children),
          ...Array.from(headerInner.children[2].children)
        ].filter((element) => element.getBoundingClientRect().width > 0).map(rect);
        const previewRect = rect(preview);
        const copyRect = rect(heroCopy);
        const controlRects = controls.map(rect);
        const trustRects = trustItems.map(rect);
        const cardRects = cards.map(rect);
        const pricingButtonRect = rect(pricingButton);
        const decorations = [heroDecoration, pricingDecoration]
          .filter((element) => getComputedStyle(element).display !== 'none')
          .map(rect);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          gutter: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-gutter')),
          previewLeft: previewRect.left,
          previewRight: previewRect.right,
          heroGap: previewRect.left >= copyRect.right
            ? previewRect.left - copyRect.right
            : previewRect.top - copyRect.bottom,
          heroCollision: [...controlRects, ...trustRects].some((box) => overlaps(box, previewRect)),
          controlCollision: anyOverlap(controlRects),
          trustCollision: anyOverlap(trustRects),
          trustOutsideCopy: trustRects.some((box) => box.right > copyRect.right + 1),
          cardCollision: anyOverlap(cardRects),
          numberCollision: cards.some((card) => {
            const title = card.querySelector('h3')!;
            return overlaps(rect(title), rect(title.nextElementSibling!));
          }),
          pricingCollision: overlaps(pricingButtonRect, rect(pricingCopy)),
          pricingButtonLeft: pricingButtonRect.left,
          pricingButtonRight: pricingButtonRect.right,
          decorationCollision: decorations.some((box) =>
            [...controlRects, ...trustRects, ...cardRects, rect(pricingCopy), pricingButtonRect]
              .some((content) => overlaps(box, content))),
          decorationOutsideViewport: decorations.some((box) => box.left < 0 || box.right > innerWidth),
          headerCollision: anyOverlap(headerItems)
        };
      });

      expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
      expect(geometry.gutter).toBe(gutter);
      expect(geometry.previewLeft).toBeGreaterThanOrEqual(gutter - 1);
      expect(geometry.previewRight).toBeLessThanOrEqual(width - gutter + 1);
      expect(geometry.heroGap).toBeGreaterThanOrEqual(23);
      expect(geometry.heroCollision).toBe(false);
      expect(geometry.controlCollision).toBe(false);
      expect(geometry.trustCollision).toBe(false);
      expect(geometry.trustOutsideCopy).toBe(false);
      expect(geometry.cardCollision).toBe(false);
      expect(geometry.numberCollision).toBe(false);
      expect(geometry.pricingCollision).toBe(false);
      expect(geometry.pricingButtonLeft).toBeGreaterThanOrEqual(gutter - 1);
      expect(geometry.pricingButtonRight).toBeLessThanOrEqual(width - gutter + 1);
      expect(geometry.decorationCollision).toBe(false);
      expect(geometry.decorationOutsideViewport).toBe(false);
      expect(geometry.headerCollision).toBe(false);

      for (const cta of await page.getByRole('button', {name: 'Încearcă gratuit'}).all()) {
        const bounds = await cta.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
    });
  }
});

test('keeps English copy and the preview within narrow gutters', async ({page}) => {
  await page.goto('/en');
  for (const {width, gutter} of [{width: 950, gutter: 24}, {width: 480, gutter: 20}, {width: 320, gutter: 16}]) {
    await page.setViewportSize({width, height: 900});
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Try for free'}).first()).toBeVisible();
    const geometry = await page.evaluate(() => {
      const preview = document.querySelector('main > section')!.children[1].children[1].firstElementChild!;
      const bounds = preview.getBoundingClientRect();
      return {scrollWidth: document.documentElement.scrollWidth, left: bounds.left, right: bounds.right};
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
    expect(geometry.left).toBeGreaterThanOrEqual(gutter - 1);
    expect(geometry.right).toBeLessThanOrEqual(width - gutter + 1);
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
