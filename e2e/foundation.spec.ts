import {expect, test} from '@playwright/test';
import {viewports} from './support/viewports';

test('boots the Romanian and English landing routes', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByRole('heading', {level: 1})).toContainText('Toate documentele');
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toContainText("All your suppliers'");
});

test('shows the development-only primitive preview without horizontal overflow', async ({page}) => {
  await page.goto('/__dev/design-system');
  await expect(page.getByRole('heading', {name: 'Previzualizare sistem de design'})).toBeVisible();
  await expect(page.getByText('DEBIRO')).toBeVisible();
  await page.setViewportSize(viewports.mobile);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewports.mobile.width);
});

test('centers the same border-box page shell on landing and onboarding', async ({page}) => {
  const widths = [viewports.mobile.width, viewports.tablet.width, viewports.desktop.width, 1625, 1920];
  const wideMargins: Record<string, number[]> = {'/': [], '/onboarding': []};

  for (const width of widths) {
    const contentEdges: number[] = [];
    for (const route of ['/', '/onboarding']) {
      await test.step(`${route} at ${width}px`, async () => {
        await page.setViewportSize({width, height: 1086});
        await page.goto(route);
        const shell = await page.evaluate((path) => {
          const element = document.querySelector('header > div')!;
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const backgroundLayer = path === '/'
            ? document.querySelector('main > section')!
            : element.parentElement!;
          return {
            left: box.left,
            right: box.right,
            width: box.width,
            maxWidth: style.maxWidth,
            boxSizing: style.boxSizing,
            paddingLeft: parseFloat(style.paddingLeft),
            paddingRight: parseFloat(style.paddingRight),
            backgroundWidth: backgroundLayer.getBoundingClientRect().width,
            scrollWidth: document.documentElement.scrollWidth
          };
        }, route);
        const gutter = width >= 1200 ? 32 : width >= 768 ? 24 : 16;
        expect(shell.maxWidth).toBe('1350px');
        expect(shell.boxSizing).toBe('border-box');
        expect(shell.width).toBeCloseTo(Math.min(width, 1350), 0);
        expect(shell.paddingLeft).toBe(gutter);
        expect(shell.paddingRight).toBe(gutter);
        expect(shell.backgroundWidth).toBeCloseTo(width, 0);
        expect(Math.abs(shell.left - (width - shell.right))).toBeLessThanOrEqual(1);
        expect(shell.scrollWidth).toBeLessThanOrEqual(width);
        contentEdges.push(shell.left + shell.paddingLeft);
        if (width >= 1625) wideMargins[route].push(shell.left);
      });
    }
    expect(contentEdges[0]).toBeCloseTo(contentEdges[1], 0);
  }

  for (const margins of Object.values(wideMargins)) {
    expect(margins[1]).toBeGreaterThan(margins[0]);
  }
});

test('configures page-specific actions within the shared public header', async ({page}) => {
  const widths = [1920, 1625, 1448, 1200, 1199, 1024, 768, 767, 640, 600, 520, 497, 496, 480, 400, 397, 396, 375, 320];

  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({width, height: 1086});
      const layouts = [];

      for (const route of ['/', '/onboarding']) {
        await page.goto(route);
        if (route === '/onboarding') {
          await expect(page.locator('header')).not.toContainText('Parteneri siguri.');
          await expect(page.getByRole('button', {name: 'Ai nevoie de ajutor?'})).toBeVisible();
          await expect(page.getByRole('button', {name: 'Autentificare'})).toHaveCount(0);
          await expect(page.getByRole('button', {name: 'Încearcă gratuit'})).toHaveCount(0);
        } else {
          await expect(page.getByRole('button', {name: 'Autentificare'})).toBeVisible();
          await expect(page.getByRole('button', {name: 'Încearcă gratuit'}).first()).toBeVisible();
        }
        layouts.push(await page.evaluate(() => {
          const header = document.querySelector('header')!;
          const shell = header.firstElementChild!;
          const brand = shell.children[0];
          const help = shell.children[1];
          const actions = shell.children[2];
          const locale = actions.children[0];
          const rect = (element: Element) => {
            const {x, y, width, height, right, bottom} = element.getBoundingClientRect();
            return {x, y, width, height, right, bottom};
          };
          return {
            header: rect(header),
            shell: rect(shell),
            brand: rect(brand),
            help: rect(help),
            locale: rect(locale),
            accountActionCount: actions.children[1]?.children.length ?? 0,
            headerBackground: getComputedStyle(header).backgroundColor,
            scrollWidth: document.documentElement.scrollWidth,
            brandText: brand.textContent?.trim(),
            clipped: [brand, locale, ...(actions.children[1] ? Array.from(actions.children[1].children) : []), ...(help.tagName === 'BUTTON' ? [help] : [])]
              .some((element) => element.scrollWidth > element.clientWidth + 1)
          };
        }));
      }

      const [landing, onboarding] = layouts;
      for (const edge of ['x', 'width'] as const) {
        expect(onboarding.shell[edge]).toBeCloseTo(landing.shell[edge], 0);
      }
      for (const edge of ['x', 'width', 'height'] as const) {
        expect(onboarding.brand[edge]).toBeCloseTo(landing.brand[edge], 0);
      }
      if (width > 496 || width <= 396) {
        expect(onboarding.brand.y).toBeCloseTo(landing.brand.y, 0);
      }
      expect(onboarding.headerBackground).toBe(landing.headerBackground);
      expect(landing.brandText).toBe('DEBIRO');
      expect(onboarding.brandText).toBe('DEBIRO');
      expect(landing.accountActionCount).toBe(2);
      expect(onboarding.accountActionCount).toBe(0);
      expect(onboarding.locale.width).toBeCloseTo(landing.locale.width, 0);
      expect(onboarding.locale.width).toBeLessThan(100);
      expect(onboarding.locale.right).toBeCloseTo(onboarding.shell.right - (width >= 1200 ? 32 : width >= 768 ? 24 : 16), 0);
      expect(landing.clipped).toBe(false);
      expect(onboarding.clipped).toBe(false);
      expect(landing.scrollWidth).toBeLessThanOrEqual(width);
      expect(onboarding.scrollWidth).toBeLessThanOrEqual(width);
      if (width <= 496) {
        expect(landing.header.height).toBeGreaterThan(66);
      } else {
        expect(landing.header.height).toBe(66);
      }
      if (width > 396) {
        expect(onboarding.header.height).toBe(66);
        expect(Math.abs(onboarding.help.y - onboarding.locale.y)).toBeLessThan(10);
        expect(onboarding.help.x).toBeGreaterThanOrEqual(onboarding.brand.right + 16 - 1);
        expect(onboarding.locale.x).toBeGreaterThanOrEqual(onboarding.help.right + 16 - 1);
      } else {
        expect(onboarding.header.height).toBeGreaterThan(66);
        expect(onboarding.locale.y + onboarding.locale.height / 2).toBeCloseTo(onboarding.brand.y + onboarding.brand.height / 2, 0);
        expect(onboarding.help.y).toBeGreaterThanOrEqual(onboarding.brand.bottom + 8 - 1);
        expect((onboarding.help.x + onboarding.help.right) / 2).toBeCloseTo(width / 2, 0);
      }
    });
  }
});
