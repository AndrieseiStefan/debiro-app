import {expect, test} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {boundaryViewports, headerBoundaryViewports, regressionViewports, viewports} from './support/viewports';

test('renders canonical Romanian copy, navigation and textual branding', async ({page}) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', {level: 1})).toHaveText(/Toate documentele furnizorilor tăi, într-un singur loc\./);
  await expect(page.getByRole('navigation', {name: 'Navigare principală'})).toBeVisible();
  await expect(page.getByRole('link', {name: /Încearcă gratuit/}).first()).toBeVisible();
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

test('account entry links preserve locale and support keyboard and browser Back', async ({page}) => {
  test.setTimeout(90_000);
  for (const {landing, login, onboarding, loginLabel, trialLabel} of [
    {landing: '/', login: '/login', onboarding: '/onboarding', loginLabel: 'Autentificare', trialLabel: 'Încearcă gratuit'},
    {landing: '/en', login: '/en/login', onboarding: '/en/onboarding', loginLabel: 'Log in', trialLabel: 'Try for free'}
  ]) {
    for (const width of [1448, 375]) {
      await test.step(`${landing} at ${width}px`, async () => {
        await page.setViewportSize({width, height: 812});
        expect((await page.goto(login))?.status()).toBe(200);
        expect((await page.goto(onboarding))?.status()).toBe(200);
        await page.goto(landing);

        const loginLink = page.getByRole('link', {name: loginLabel, exact: true});
        const trialLinks = page.locator('header, #product').getByRole('link', {name: trialLabel, exact: true});
        await expect(loginLink).not.toHaveAttribute('aria-disabled');
        await expect(trialLinks).toHaveCount(2);
        for (const link of await trialLinks.all()) await expect(link).not.toHaveAttribute('aria-disabled');

        await loginLink.click();
        await expect(page).toHaveURL(login);
        await page.goBack();
        await expect(page).toHaveURL(landing);

        await trialLinks.first().focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(onboarding);
        await page.goBack();
        await expect(page).toHaveURL(landing);

        await trialLinks.last().click();
        await expect(page).toHaveURL(onboarding);
        await page.goBack();
        await expect(page).toHaveURL(landing);
      });
    }
  }
});

test('keeps the landing page stable across the responsive viewport matrix', async ({page}) => {
  await page.goto('/');
  const matrix = [
    ...Object.values(viewports),
    ...boundaryViewports,
    ...regressionViewports,
    ...headerBoundaryViewports
  ];

  for (const {width, height} of matrix) {
    const gutter = width >= 1200 ? 32 : width >= 768 ? 24 : 16;
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({width, height});
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await expect(page.getByRole('heading', {name: 'Simplu. Automat. Fără bătăi de cap.'})).toBeVisible();
      await expect(page.getByRole('heading', {name: 'Planuri flexibile pentru orice dimensiune de companie.'})).toBeVisible();
      await expect(page.getByRole('link', {name: 'DEBIRO'})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Autentificare'})).toBeVisible();
      await expect(page.getByRole('link', {name: 'RO', exact: true})).toBeVisible();
      await expect(page.getByRole('link', {name: 'EN', exact: true})).toBeVisible();
      await expect(page.getByRole('navigation', {name: 'Navigare principală'})).toBeVisible();

      const geometry = await page.evaluate(() => {
        const rect = (element: Element) => {
          const box = element.getBoundingClientRect();
          return {left: box.left, right: box.right, top: box.top, bottom: box.bottom};
        };
        const overlaps = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) =>
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const anyOverlap = (boxes: ReturnType<typeof rect>[]) =>
          boxes.some((box, index) => boxes.slice(index + 1).some((other) => overlaps(box, other)));
        const sections = document.querySelectorAll('main section');
        const contentContainers = Array.from(document.querySelectorAll('header > div, main section > div'))
          .filter((element) => getComputedStyle(element).maxWidth === '1350px');
        const heroInner = sections[0].children[1];
        const heroCopy = heroInner.children[0];
        const heroVisual = heroInner.children[1];
        const preview = heroVisual.firstElementChild!;
        const controls = Array.from(heroCopy.querySelectorAll('a, button'));
        const trustItems = Array.from(heroCopy.querySelector('ul')!.children);
        const cards = Array.from(sections[1].querySelectorAll('article'));
        const pricingInner = sections[3].children[1];
        const pricingCopy = pricingInner.children[1];
        const pricingCards = Array.from(pricingInner.querySelectorAll('[data-plan-id]'));
        const heroDecoration = heroVisual.lastElementChild!;
        const headerInner = document.querySelector('header > div')!;
        const headerActions = headerInner.children[2];
        const headerItems = [
          headerInner.children[0],
          ...Array.from(headerInner.children[1].children),
          headerActions.children[0],
          ...Array.from(headerActions.children[1].children)
        ].filter((element) => element.getBoundingClientRect().width > 0).map(rect);
        const previewRect = rect(preview);
        const copyRect = rect(heroCopy);
        const controlRects = controls.map(rect);
        const trustRects = trustItems.map(rect);
        const cardRects = cards.map(rect);
        const decorations = [heroDecoration]
          .filter((element) => getComputedStyle(element).display !== 'none')
          .map(rect);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          gutter: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-gutter')),
          contentContainers: contentContainers.map((element) => ({
            left: rect(element).left + parseFloat(getComputedStyle(element).paddingLeft),
            right: rect(element).right - parseFloat(getComputedStyle(element).paddingRight)
          })),
          heroInnerLeft: rect(heroInner).left,
          heroInnerRight: rect(heroInner).right,
          heroCopyWidth: rect(heroCopy).right - rect(heroCopy).left,
          heroVisualWidth: rect(heroVisual).right - rect(heroVisual).left,
          heroStacked: rect(heroVisual).top >= rect(heroCopy).bottom,
          heroVisualLeft: rect(heroVisual).left,
          heroVisualRight: rect(heroVisual).right,
          contentLeft: rect(heroInner).left + parseFloat(getComputedStyle(heroInner).paddingLeft),
          contentRight: rect(heroInner).right - parseFloat(getComputedStyle(heroInner).paddingRight),
          previewLeft: previewRect.left,
          previewRight: previewRect.right,
          previewRatio: (previewRect.right - previewRect.left) / (previewRect.bottom - previewRect.top),
          decorationAttached: heroDecoration.parentElement === heroVisual,
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
          pricingCollision: anyOverlap(pricingCards.map(rect)) || pricingCards.some((card) => overlaps(rect(card), rect(pricingCopy))),
          pricingLeft: Math.min(...pricingCards.map((card) => rect(card).left)),
          pricingRight: Math.max(...pricingCards.map((card) => rect(card).right)),
          decorationCollision: decorations.some((box) =>
            [...controlRects, ...trustRects, ...cardRects, rect(pricingCopy), ...pricingCards.map(rect)]
              .some((content) => overlaps(box, content))),
          decorationOutsideViewport: decorations.some((box) => box.left < 0 || box.right > innerWidth),
          headerCollision: anyOverlap(headerItems)
        };
      });

      expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
      expect(geometry.gutter).toBe(gutter);
      expect(geometry.contentContainers).toHaveLength(6);
      for (const container of geometry.contentContainers) {
        expect(container.left).toBeCloseTo(geometry.contentLeft, 0);
        expect(container.right).toBeCloseTo(geometry.contentRight, 0);
      }
      expect(geometry.heroInnerLeft).toBeGreaterThanOrEqual(0);
      expect(geometry.heroInnerRight).toBeLessThanOrEqual(width);
      if (width < 1200) {
        expect(geometry.heroStacked).toBe(true);
        expect(geometry.heroCopyWidth).toBeCloseTo(geometry.contentRight - geometry.contentLeft, 0);
        expect(geometry.heroVisualWidth).toBeCloseTo(geometry.contentRight - geometry.contentLeft, 0);
        expect(geometry.heroVisualLeft).toBeCloseTo(geometry.contentLeft, 0);
        expect(geometry.heroVisualRight).toBeCloseTo(geometry.contentRight, 0);
      } else {
        expect(geometry.heroStacked).toBe(false);
      }
      expect(geometry.previewLeft).toBeGreaterThanOrEqual(gutter - 1);
      expect(geometry.previewRight).toBeLessThanOrEqual(width - gutter + 1);
      expect(geometry.previewRatio).toBeCloseTo(700 / 478, 2);
      expect(geometry.decorationAttached).toBe(true);
      expect(geometry.heroGap).toBeGreaterThanOrEqual(23);
      expect(geometry.heroCollision).toBe(false);
      expect(geometry.controlCollision).toBe(false);
      expect(geometry.trustCollision).toBe(false);
      expect(geometry.trustOutsideCopy).toBe(false);
      expect(geometry.cardCollision).toBe(false);
      expect(geometry.numberCollision).toBe(false);
      expect(geometry.pricingCollision).toBe(false);
      expect(geometry.pricingLeft).toBeGreaterThanOrEqual(gutter - 1);
      expect(geometry.pricingRight).toBeLessThanOrEqual(width - gutter + 1);
      expect(geometry.decorationCollision).toBe(false);
      expect(geometry.decorationOutsideViewport).toBe(false);
      expect(geometry.headerCollision).toBe(false);

      for (const cta of await page.getByRole('link', {name: 'Încearcă gratuit'}).all()) {
        const bounds = await cta.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
    });
  }
});

test('reflows only the reduced header when its content needs a second row', async ({page}) => {
  await page.goto('/');
  const widths = [767, 700, 640, 600, 520, 497, 496, 495, 480, 375, 320];
  const desktopLocaleWidth = await page.evaluate(() =>
    document.querySelector('header > div')!.children[2].children[0].getBoundingClientRect().width
  );

  for (const width of widths) {
    await test.step(`${width}px header`, async () => {
      await page.setViewportSize({width, height: 812});
      const layout = await page.evaluate(() => {
        const header = document.querySelector('header > div')!;
        const brand = header.children[0];
        const actions = header.children[2];
        const locale = actions.children[0];
        const account = actions.children[1];
        const login = account.children[0];
        const cta = account.children[1];
        const rect = (element: Element) => {
          const {left, right, top, bottom, width} = element.getBoundingClientRect();
          return {left, right, top, bottom, width, centerY: (top + bottom) / 2};
        };
        return {
          brand: rect(brand),
          locale: rect(locale),
          login: rect(login),
          cta: rect(cta),
          loginClipped: login.scrollWidth > login.clientWidth + 1,
          ctaClipped: cta.scrollWidth > cta.clientWidth + 1,
          scrollWidth: document.documentElement.scrollWidth
        };
      });

      expect(layout.locale.width).toBeCloseTo(desktopLocaleWidth, 0);
      expect(layout.locale.width).toBeLessThan(100);
      expect(layout.scrollWidth).toBeLessThanOrEqual(width);
      expect(layout.brand.left).toBeGreaterThanOrEqual(16);
      expect(layout.cta.right).toBeLessThanOrEqual(width - 16 + 1);
      expect(layout.loginClipped).toBe(false);
      expect(layout.ctaClipped).toBe(false);

      if (width > 496) {
        for (const item of [layout.locale, layout.login, layout.cta]) {
          expect(Math.abs(item.centerY - layout.brand.centerY)).toBeLessThan(2);
        }
        expect(layout.locale.left).toBeGreaterThanOrEqual(layout.brand.right + 16 - 1);
        expect(layout.login.left).toBeGreaterThanOrEqual(layout.locale.right + 16 - 1);
        expect(layout.cta.left).toBeGreaterThanOrEqual(layout.login.right + 16 - 1);
      } else {
        expect(Math.abs(layout.locale.centerY - layout.brand.centerY)).toBeLessThan(2);
        expect(layout.locale.right).toBeLessThanOrEqual(width - 16 + 1);
        expect(layout.login.top).toBeGreaterThanOrEqual(layout.brand.bottom + 8 - 1);
        expect(Math.abs(layout.login.centerY - layout.cta.centerY)).toBeLessThan(2);
        expect(Math.abs((layout.login.left + layout.cta.right) / 2 - width / 2)).toBeLessThan(2);
        expect(layout.cta.left).toBeGreaterThanOrEqual(layout.login.right + 16 - 1);
      }
    });
  }
});

test('keeps English copy and the preview within responsive gutters', async ({page}) => {
  await page.goto('/en');
  for (const {width, gutter} of [{width: 1024, gutter: 24}, {width: 950, gutter: 24}, {width: 864, gutter: 24}, {width: 863, gutter: 24}, {width: 768, gutter: 24}, {width: 480, gutter: 16}, {width: 375, gutter: 16}, {width: 320, gutter: 16}]) {
    await page.setViewportSize({width, height: 900});
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Try for free'}).first()).toBeVisible();
    const geometry = await page.evaluate(() => {
      const preview = document.querySelector('#product')!.children[1].children[1].firstElementChild!;
      const bounds = preview.getBoundingClientRect();
      const links = Array.from(document.querySelectorAll('header a'), (link) => link.getBoundingClientRect());
      const collision = links.some((a, index) => links.slice(index + 1).some((b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
      return {scrollWidth: document.documentElement.scrollWidth, left: bounds.left, right: bounds.right, collision, navLeft: Math.min(...links.map((link) => link.left)), navRight: Math.max(...links.map((link) => link.right))};
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
    expect(geometry.left).toBeGreaterThanOrEqual(gutter - 1);
    expect(geometry.right).toBeLessThanOrEqual(width - gutter + 1);
    expect(geometry.collision).toBe(false);
    expect(geometry.navLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.navRight).toBeLessThanOrEqual(width);
  }
});

test('uses one desktop content grid and centers both CTA labels and arrows', async ({page}) => {
  await page.goto('/');
  const grid = await page.evaluate(() =>
    Array.from(document.querySelectorAll('header > div, main section > div'))
      .filter((element) => getComputedStyle(element).maxWidth === '1350px')
      .map((element) => ({
        left: element.getBoundingClientRect().left,
        width: element.getBoundingClientRect().width,
        paddingLeft: getComputedStyle(element).paddingLeft,
        paddingRight: getComputedStyle(element).paddingRight
      }))
  );
  expect(grid).toHaveLength(6);
  for (const container of grid) {
    expect(container).toEqual({left: 49, width: 1350, paddingLeft: '32px', paddingRight: '32px'});
  }

  const heroSpacing = await page.evaluate(() => {
    const heroInner = document.querySelector('#product')!.children[1];
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
  expect(heroSpacing.previewWidth).toBeGreaterThanOrEqual(698);
  expect(heroSpacing.previewWidth).toBeLessThanOrEqual(700);

  const links = await page.locator('header, #product').getByRole('link', {name: 'Încearcă gratuit'}).all();
  expect(links).toHaveLength(2);
  for (const [index, link] of links.entries()) {
    const alignment = await link.evaluate((element) => {
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

for (const english of [false, true]) {
  const route = english ? '/en' : '/', language = english ? 'EN' : 'RO';
  test(`${language} marketing anchors use native history, keyboard navigation and preserve locale anchors`, async ({page}) => {
    await page.goto(route);
    const origin = await page.evaluate(() => performance.timeOrigin);
    const navigation = page.getByRole('navigation', {name: english ? 'Main navigation' : 'Navigare principală'});
    for (const anchor of ['product', 'solutions', 'pricing', 'resources']) {
      const link = navigation.locator(`[href="#${anchor}"]`);
      await link.focus();
      await expect(link).toHaveCSS('outline-style', 'solid');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(`${route}#${anchor}`);
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
      await expect(page.locator(`#${anchor}`)).toBeInViewport();
      const heading = page.locator(`#${anchor}`).getByRole('heading').first();
      await expect(heading).toBeInViewport();
      expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    }
    await page.goBack(); await expect(page).toHaveURL(`${route}#pricing`);
    await page.goForward(); await expect(page).toHaveURL(`${route}#resources`);
    await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).click();
    await expect(page).toHaveURL(`${english ? '/' : '/en'}#resources`);
    await expect(page.locator('#resources h2')).toBeInViewport();
    await expect(page.locator('#resources a, #resources button')).toHaveCount(0);
    await expect(page.locator('#resources')).toContainText(english ? 'Pregătim ghiduri și materiale care te vor ajuta să folosești DEBIRO.' : "We're preparing guides and materials to help you get the most out of DEBIRO.");
    for (const hash of ['pricing', 'product']) {
      await page.goto(`${route}#${hash}`);
      await expect(page.locator(`#${hash} h${hash === 'product' ? 1 : 2}`).first()).toBeInViewport();
    }
    const previousScroll = await page.evaluate(() => scrollY);
    await page.goto(`${route}#missing-section`);
    expect(await page.evaluate(() => scrollY)).toBe(previousScroll);
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  });

  test(`${language} public pricing uses all shared demo tiers, only marketing emphasis and existing signup`, async ({page}) => {
    await page.goto(`${route}#pricing`);
    const pricing = page.locator('#pricing');
    await expect(pricing.locator('[data-plan-id]')).toHaveCount(3);
    await expect(pricing.locator('[data-featured]')).toHaveAttribute('data-plan-id', 'Professional');
    await expect(pricing.locator('[data-current], [data-recommended]')).toHaveCount(0);
    await expect(pricing).not.toContainText('Trial');
    await expect(page.getByText(english ? 'View all plans' : 'Vezi toate planurile', {exact: true})).toHaveCount(0);
    for (const planId of ['Starter', 'Professional', 'Business']) {
      const card = pricing.locator(`[data-plan-id="${planId}"]`);
      await expect(card).toContainText(english ? 'E1 demo price' : 'Preț demonstrativ E1');
      const link = card.getByRole('link');
      await expect(link).toHaveAttribute('href', `${english ? '/en' : ''}/onboarding`);
      await link.click();
      await expect(page).toHaveURL(`${english ? '/en' : ''}/onboarding`);
      await page.goBack(); await expect(page).toHaveURL(`${route}#pricing`);
    }
    await page.setViewportSize({width: 375, height: 812});
    await page.goto(route);
    const nav = page.getByRole('navigation', {name: english ? 'Main navigation' : 'Navigare principală'});
    for (const anchor of ['product', 'solutions', 'pricing', 'resources']) {
      await nav.locator(`[href="#${anchor}"]`).click();
      await expect(page.locator(`#${anchor}`)).toBeInViewport();
    }
  });
}

test('viewport presentation and shared pricing remain naturally contained; captures for visual review', async ({page}) => {
  await mkdir('artifacts/visual/e1-032bh', {recursive: true});
  for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [1448, 600], [1024, 768], [768, 900], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/');
    await page.evaluate(async () => {await document.fonts.ready;});
    const geometry = await page.evaluate(() => {
      const presentation = document.querySelector('[data-landing-presentation]')!.getBoundingClientRect();
      const header = document.querySelector('header')!.getBoundingClientRect();
      const pricing = document.querySelector('#pricing')!.getBoundingClientRect();
      const cards = Array.from(document.querySelectorAll('#pricing [data-plan-id]'), (card) => {const r = card.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top};});
      return {presentationHeight: presentation.height, headerHeight: header.height, pricingTop: pricing.top, presentationBottom: presentation.bottom, overflow: document.documentElement.scrollWidth, cards};
    });
    expect(geometry.presentationHeight).toBeGreaterThanOrEqual(height - geometry.headerHeight - 1);
    expect(geometry.pricingTop).toBeGreaterThanOrEqual(height);
    expect(geometry.pricingTop).toBe(geometry.presentationBottom);
    expect(geometry.overflow).toBeLessThanOrEqual(width);
    for (const card of geometry.cards) {expect(card.left).toBeGreaterThanOrEqual(0); expect(card.right).toBeLessThanOrEqual(width);}
    if (width >= 1200) expect(new Set(geometry.cards.map((card) => card.top)).size).toBe(1);
    else if (width >= 768) {expect(geometry.cards[0].top).toBe(geometry.cards[1].top); expect(geometry.cards[2].top).toBeGreaterThan(geometry.cards[0].top);}
    else expect(new Set(geometry.cards.map((card) => card.left)).size).toBe(1);
    await page.screenshot({path: `artifacts/visual/e1-032bh/landing-${width}x${height}.png`});
    if ([1448, 768, 375, 320].includes(width) && height !== 600) {
      await page.locator('#pricing').screenshot({path: `artifacts/visual/e1-032bh/pricing-${width}.png`});
    }
  }
  await page.setViewportSize({width: 1448, height: 900});
  await page.goto('/en');
  await page.screenshot({path: 'artifacts/visual/e1-032bh/landing-en-desktop.png', fullPage: true});
  await page.goto('/company/settings/billing');
  await page.getByRole('button', {name: 'Upgrade plan', exact: true}).click();
  await page.getByRole('dialog', {name: 'Upgrade plan', exact: true}).screenshot({path: 'artifacts/visual/e1-032bh/upgrade-desktop.png'});
});
