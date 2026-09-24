import {expect, test, type Page} from '@playwright/test';

const viewports = [
  {width: 1448, height: 1086},
  {width: 1024, height: 768},
  {width: 801, height: 900},
  {width: 600, height: 833},
  {width: 375, height: 812},
  {width: 320, height: 700}
] as const;

async function waitForDashboard(page: Page) {
  await expect(page.locator('#dashboard-title')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
}

async function navigate(page: Page, locale: 'ro' | 'en', destination: 'dashboard' | 'vendors') {
  const navigation = page.getByRole('navigation', {name: locale === 'ro' ? 'Navigare în aplicație' : 'Application navigation'});
  const label = destination === 'dashboard' ? 'Dashboard' : locale === 'ro' ? 'Furnizori' : 'Suppliers';
  await navigation.getByRole('link', {name: label}).click();
  await expect(page).toHaveURL(new RegExp(`${locale === 'en' ? '/en' : ''}/${destination}$`));
  await expect(navigation.getByRole('link', {name: label})).toHaveAttribute('aria-current', 'page');
}

async function dashboardGeometry(page: Page) {
  await waitForDashboard(page);
  return page.evaluate(() => {
    const main = document.querySelector('main')!;
    const pageContent = main.firstElementChild!;
    const header = pageContent.firstElementChild!;
    const title = header.querySelector('h1')!;
    const kpiGrid = header.nextElementSibling!;
    const kpiCard = kpiGrid.firstElementChild!;
    const dashboardGrid = kpiGrid.nextElementSibling!;
    const documents = dashboardGrid.firstElementChild!;
    const documentBadge = documents.querySelector('table tbody tr td:nth-child(3) > span')!;
    const rightColumn = dashboardGrid.lastElementChild!;
    const status = rightColumn.firstElementChild!;
    const activity = rightColumn.lastElementChild!;
    const rect = (element: Element) => {
      const {x, y, width, height} = element.getBoundingClientRect();
      return {x, y, width, height};
    };
    return {
      documentWidth: document.documentElement.scrollWidth,
      boxes: {
        main: rect(main), pageContent: rect(pageContent), header: rect(header), title: rect(title),
        kpiGrid: rect(kpiGrid), kpiCard: rect(kpiCard), dashboardGrid: rect(dashboardGrid),
        documents: rect(documents), documentBadge: rect(documentBadge), status: rect(status), activity: rect(activity)
      },
      styles: {
        mainPadding: getComputedStyle(main).padding,
        titleFontSize: getComputedStyle(title).fontSize,
        kpiCardPadding: getComputedStyle(kpiCard).padding,
        documentsPadding: getComputedStyle(documents).padding,
        documentBadgePadding: getComputedStyle(documentBadge).padding,
        documentBadgeFontSize: getComputedStyle(documentBadge).fontSize,
        statusPadding: getComputedStyle(status).padding,
        activityPadding: getComputedStyle(activity).padding,
        gridColumns: getComputedStyle(dashboardGrid).gridTemplateColumns,
        mainTransform: getComputedStyle(main).transform,
        mainZoom: getComputedStyle(main).zoom
      }
    };
  });
}

function expectEquivalent(before: Awaited<ReturnType<typeof dashboardGeometry>>, after: Awaited<ReturnType<typeof dashboardGeometry>>, viewportWidth: number) {
  expect(before.documentWidth).toBeLessThanOrEqual(viewportWidth);
  expect(after.documentWidth).toBeLessThanOrEqual(viewportWidth);
  for (const key of ['main', 'pageContent', 'header', 'title', 'kpiGrid', 'kpiCard', 'dashboardGrid', 'documents', 'documentBadge', 'status', 'activity'] as const) {
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(before.boxes[key][dimension] - after.boxes[key][dimension]), `${key}.${dimension}`).toBeLessThanOrEqual(1);
    }
  }
  expect(after.styles).toEqual(before.styles);
}

test('keeps Romanian Dashboard geometry stable across authenticated navigation at every required width', async ({page}) => {
  test.setTimeout(60_000);
  for (const viewport of viewports) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard');
      const direct = await dashboardGeometry(page);
      await page.evaluate(() => { (window as Window & {__routeProbe?: string}).__routeProbe = 'client-navigation'; });

      await navigate(page, 'ro', 'vendors');
      await navigate(page, 'ro', 'dashboard');
      expect(await page.evaluate(() => (window as Window & {__routeProbe?: string}).__routeProbe)).toBe('client-navigation');
      expectEquivalent(direct, await dashboardGeometry(page), viewport.width);

      if (viewport.width === 1448) {
        await navigate(page, 'ro', 'vendors');
        await navigate(page, 'ro', 'dashboard');
        expectEquivalent(direct, await dashboardGeometry(page), viewport.width);
      }
    });
  }
});

test('keeps reverse-entry Dashboard layout stable and Vendors summary treatment intact', async ({page}) => {
  await page.goto('/dashboard');
  const direct = await dashboardGeometry(page);

  await page.goto('/vendors');
  const vendorCard = page.getByRole('region', {name: 'Rezumat furnizori'}).locator(':scope > div').first();
  await expect(vendorCard).toBeVisible();
  const vendorBackground = await vendorCard.evaluate((element) => getComputedStyle(element).backgroundColor);
  await navigate(page, 'ro', 'dashboard');
  expectEquivalent(direct, await dashboardGeometry(page), 1448);
  await navigate(page, 'ro', 'vendors');
  await expect(vendorCard).toHaveCSS('background-color', vendorBackground);
});

test('keeps English Dashboard geometry stable across authenticated navigation', async ({page}) => {
  for (const viewport of [viewports[0], viewports[4]]) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto('/en/dashboard');
      const direct = await dashboardGeometry(page);
      await navigate(page, 'en', 'vendors');
      await navigate(page, 'en', 'dashboard');
      expectEquivalent(direct, await dashboardGeometry(page), viewport.width);
    });
  }
});
