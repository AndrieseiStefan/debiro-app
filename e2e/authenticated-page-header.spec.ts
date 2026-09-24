import {expect, test} from '@playwright/test';

const viewports = [
  {width: 1448, height: 1086},
  {width: 1024, height: 768},
  {width: 600, height: 800},
  {width: 375, height: 812}
] as const;

test('shares authenticated page-header anchors and primary action geometry', async ({page}) => {
  for (const viewport of viewports) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      const measurements = [];

      for (const route of ['/dashboard', '/vendors']) {
        await page.goto(route);
        const header = page.locator('main section[aria-labelledby]').first();
        const action = header.locator('[data-page-primary-action]');
        await expect(header.getByRole('heading', {level: 1})).toBeVisible();
        await expect(action).toBeVisible();

        const geometry = await header.evaluate((element) => {
          const rect = (node: Element) => {
            const {left, right, top, bottom, width, height} = node.getBoundingClientRect();
            return {left, right, top, bottom, width, height};
          };
          const context = element.firstElementChild!;
          const heading = element.querySelector('h1')!;
          const description = heading.nextElementSibling!;
          const action = element.querySelector('[data-page-primary-action]')!;
          const support = element.querySelector('[data-page-header-support]');
          const feature = element.nextElementSibling!;
          const buttonStyle = getComputedStyle(action);
          const headingStyle = getComputedStyle(heading);
          const descriptionStyle = getComputedStyle(description);
          return {
            documentWidth: document.documentElement.scrollWidth,
            header: rect(element),
            context: rect(context),
            heading: rect(heading),
            description: rect(description),
            action: rect(action),
            support: support ? rect(support) : null,
            feature: rect(feature),
            buttonStyle: [buttonStyle.height, buttonStyle.paddingLeft, buttonStyle.paddingRight, buttonStyle.fontSize, buttonStyle.fontWeight, buttonStyle.borderRadius, buttonStyle.backgroundColor, buttonStyle.boxShadow],
            iconSize: rect(action.querySelector('svg')!).width,
            headingStyle: [headingStyle.fontFamily, headingStyle.fontSize, headingStyle.fontWeight, headingStyle.lineHeight, headingStyle.letterSpacing],
            descriptionStyle: [descriptionStyle.fontFamily, descriptionStyle.fontSize, descriptionStyle.lineHeight, descriptionStyle.marginTop]
          };
        });

        expect(geometry.documentWidth, `${route} document overflow`).toBeLessThanOrEqual(viewport.width);
        expect(geometry.context.left).toBeCloseTo(geometry.header.left, 0);
        expect(geometry.heading.left).toBeCloseTo(geometry.header.left, 0);
        expect(geometry.description.left).toBeCloseTo(geometry.header.left, 0);
        expect(geometry.description.right).toBeLessThanOrEqual(geometry.header.right + 1);
        expect(geometry.action.left).toBeGreaterThanOrEqual(geometry.header.left - 1);
        expect(geometry.action.right).toBeLessThanOrEqual(geometry.header.right + 1);
        expect(geometry.action.bottom).toBeLessThanOrEqual(geometry.feature.top);
        expect(geometry.description.bottom).toBeLessThanOrEqual(geometry.feature.top);
        if (geometry.support) {
          expect(geometry.support.bottom).toBeLessThanOrEqual(geometry.feature.top);
          if (viewport.width >= 1200) expect(geometry.support.right).toBeLessThanOrEqual(geometry.action.left);
          else if (viewport.width < 768) expect(geometry.support.bottom).toBeLessThanOrEqual(geometry.action.top);
        }
        measurements.push(geometry);
      }

      const [dashboard, vendors] = measurements;
      expect(dashboard.header.left).toBeCloseTo(vendors.header.left, 0);
      expect(dashboard.context.top).toBeCloseTo(vendors.context.top, 0);
      expect(dashboard.heading.top).toBeCloseTo(vendors.heading.top, 0);
      expect(dashboard.description.top).toBeCloseTo(vendors.description.top, 0);
      expect(dashboard.headingStyle).toEqual(vendors.headingStyle);
      expect(dashboard.descriptionStyle).toEqual(vendors.descriptionStyle);
      expect(dashboard.buttonStyle).toEqual(vendors.buttonStyle);
      expect(dashboard.iconSize).toBe(vendors.iconSize);
      expect(dashboard.action.width).toBeCloseTo(vendors.action.width, 0);
    });
  }
});
