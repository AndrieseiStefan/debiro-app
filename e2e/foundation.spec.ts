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
          const element = path === '/'
            ? document.querySelector('header > div')!
            : document.querySelector('header')!.parentElement!;
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
