import {expect, test, type Page} from '@playwright/test';

const sections = [
  {path: '/dashboard', ro: 'Dashboard', en: 'Dashboard', breadcrumbRo: null, breadcrumbEn: null},
  {path: '/vendors', ro: 'Furnizori', en: 'Suppliers', breadcrumbRo: 'DashboardFurnizori', breadcrumbEn: 'DashboardSuppliers'},
  {path: '/documents', ro: 'Documente', en: 'Documents', breadcrumbRo: 'DashboardDocumente', breadcrumbEn: 'DashboardDocuments'},
  {path: '/requirements', ro: 'Cerințe', en: 'Requirements', breadcrumbRo: 'DashboardCerințe', breadcrumbEn: 'DashboardRequirements'},
  {path: '/notifications', ro: 'Notificări', en: 'Notifications', breadcrumbRo: 'DashboardNotificări', breadcrumbEn: 'DashboardNotifications'}
] as const;

async function assertSection(page: Page, locale: 'ro' | 'en', section: typeof sections[number]) {
  const navigation = page.getByRole('navigation', {name: locale === 'ro' ? 'Navigare în aplicație' : 'Application navigation'});
  const active = navigation.locator('a[aria-current="page"]');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveAttribute('href', `${locale === 'en' ? '/en' : ''}${section.path}`);
  await expect(active).toContainText(section[locale]);
  const breadcrumb = page.getByRole('navigation', {name: locale === 'ro' ? 'Navigare pe pagină' : /^(Breadcrumb|Page navigation)$/});
  if (section.path === '/dashboard') {
    await expect(breadcrumb).toHaveCount(0);
  } else {
    await expect(breadcrumb).toHaveText(locale === 'ro' ? section.breadcrumbRo! : section.breadcrumbEn!);
    await expect(breadcrumb.getByRole('link', {name: 'Dashboard'})).toHaveAttribute('href', `${locale === 'en' ? '/en' : ''}/dashboard`);
  }
}

for (const locale of ['ro', 'en'] as const) {
  const prefix = locale === 'en' ? '/en' : '';
  const reportsLabel = locale === 'ro' ? 'Rapoarte' : 'Reports';
  const explanation = locale === 'ro' ? 'În lucru · Disponibil în curând' : 'In progress · Coming soon';

  test(`${locale.toUpperCase()} Reports explains its unavailable state without route, history or active-state changes`, async ({page}) => {
    await page.goto(`${prefix}/dashboard`);
    const navigation = page.getByRole('navigation', {name: locale === 'ro' ? 'Navigare în aplicație' : 'Application navigation'});
    const reports = navigation.getByRole('button', {name: reportsLabel, exact: true});
    await expect(reports).toHaveAttribute('aria-disabled', 'true'); await expect(reports).not.toHaveAttribute('disabled');
    await expect(navigation.getByRole('link', {name: reportsLabel, exact: true})).toHaveCount(0);
    const historySnapshot = () => page.evaluate(() => ({url: location.href, length: history.length, state: JSON.stringify(history.state)}));
    const before = await historySnapshot();
    const geometry = await reports.boundingBox();
    const appearance = await reports.evaluate((element) => ({color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor, cursor: getComputedStyle(element).cursor}));
    expect(appearance.cursor).toBe('default');
    expect(appearance.color).not.toBe(await navigation.getByRole('link', {name: 'Dashboard', exact: true}).evaluate((element) => getComputedStyle(element).color));

    await reports.hover();
    await expect(page.getByRole('tooltip')).toHaveText(explanation); await expect(reports).toHaveAccessibleDescription(explanation);
    const expectRightPlacement = async () => {
      const trigger = (await reports.boundingBox())!, tooltip = (await page.getByRole('tooltip').boundingBox())!;
      expect(tooltip.x - trigger.x - trigger.width).toBeCloseTo(8, 1);
      expect(tooltip.y + tooltip.height / 2).toBeCloseTo(trigger.y + trigger.height / 2, 1);
      expect(tooltip.x + tooltip.width).toBeLessThanOrEqual(page.viewportSize()!.width - 12);
      const settings = (await navigation.getByRole('button', {name: locale === 'ro' ? 'Setări companie' : 'Company settings', exact: true}).boundingBox())!;
      expect(tooltip.x).toBeGreaterThanOrEqual(settings.x + settings.width);
    };
    await expectRightPlacement();
    expect(await reports.boundingBox()).toEqual(geometry);
    expect(await reports.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(appearance.background);
    await page.getByRole('tooltip').hover(); await expect(page.getByRole('tooltip')).toBeVisible();
    await page.mouse.move(800, 300);
    await expect(page.getByRole('tooltip')).toHaveCount(0);

    await navigation.locator(`a[href="${prefix}/notifications"]`).focus();
    await page.keyboard.press('Tab'); await expect(reports).toBeFocused();
    await expect(page.getByRole('tooltip')).toHaveText(explanation);
    await expectRightPlacement();
    expect(await reports.evaluate((element) => element.matches(':focus-visible') && getComputedStyle(element).outlineStyle !== 'none')).toBe(true);
    await page.keyboard.press('Escape'); await expect(page.getByRole('tooltip')).toHaveCount(0); await expect(reports).toBeFocused();
    for (const key of ['Enter', 'Space']) {await page.keyboard.press(key); expect(await historySnapshot()).toEqual(before);}
    // aria-disabled remains focusable; send the actual mouse click despite Playwright's disabled-action guard.
    await reports.click({force: true}); await expect(page.getByRole('tooltip')).toHaveText(explanation);
    expect(await historySnapshot()).toEqual(before); await assertSection(page, locale, sections[0]);
    await expect(reports).not.toHaveAttribute('aria-current');
    await navigation.getByRole('link', {name: locale === 'ro' ? 'Furnizori' : 'Suppliers', exact: true}).click();
    await assertSection(page, locale, sections[1]);
    const afterNavigation = await historySnapshot(); await reports.click({force: true}); expect(await historySnapshot()).toEqual(afterNavigation);
    await assertSection(page, locale, sections[1]);
    expect((await page.goto(`${prefix}/reports`))?.status()).toBe(404);
  });

  test(`${locale.toUpperCase()} coming-soon navigation stays contained in tablet and compact shells`, async ({page}) => {
    for (const width of [1024, 801, 800, 758, 600]) {
      await page.setViewportSize({width, height: 900}); await page.goto(`${prefix}/dashboard`);
      const navigation = page.getByRole('navigation', {name: locale === 'ro' ? 'Navigare în aplicație' : 'Application navigation'});
      const reports = navigation.getByRole('button', {name: reportsLabel, exact: true});
      await reports.scrollIntoViewIfNeeded(); await reports.focus();
      const tooltip = page.getByRole('tooltip'); await expect(tooltip).toHaveText(explanation);
      const bounds = (await tooltip.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
      await reports.click({force: true}); await expect(page).toHaveURL(`${prefix}/dashboard`); await expect(reports).not.toHaveAttribute('aria-current');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });

  test(`${locale.toUpperCase()} touch users can discover Reports help without activating navigation`, async ({browser, baseURL}) => {
    const context = await browser.newContext({baseURL, hasTouch: true, isMobile: true});
    const page = await context.newPage();
    try {
      for (const width of [375, 320]) {
        await page.setViewportSize({width, height: 812}); await page.goto(`${prefix}/dashboard`);
        const navigation = page.getByRole('navigation', {name: locale === 'ro' ? 'Navigare în aplicație' : 'Application navigation'});
        const reports = navigation.getByRole('button', {name: reportsLabel, exact: true});
        await reports.scrollIntoViewIfNeeded(); const bounds = (await reports.boundingBox())!;
        const before = await page.evaluate(() => ({url: location.href, length: history.length, state: JSON.stringify(history.state)}));
        await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        const tooltip = page.getByRole('tooltip'); await expect(tooltip).toHaveText(explanation); await expect(reports).toHaveAccessibleDescription(explanation);
        const tip = (await tooltip.boundingBox())!; expect(tip.x).toBeGreaterThanOrEqual(0); expect(tip.x + tip.width).toBeLessThanOrEqual(width);
        // These narrow viewports cannot fit the preferred right side: keep the existing vertical fallback.
        expect(bounds.x + bounds.width + 8 + tip.width).toBeGreaterThan(width - 12);
        expect(tip.y >= bounds.y + bounds.height + 8 || tip.y + tip.height <= bounds.y - 8).toBe(true);
        expect(await page.evaluate(() => ({url: location.href, length: history.length, state: JSON.stringify(history.state)}))).toEqual(before);
        await assertSection(page, locale, sections[0]);
        await page.getByRole('heading', {level: 1}).tap(); await expect(tooltip).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    } finally {await context.close();}
  });

  test(`${locale.toUpperCase()} direct routes and repeated sidebar navigation agree on one active section`, async ({page}) => {
    test.setTimeout(60_000);
    const prefix = locale === 'en' ? '/en' : '';
    for (const section of sections) {
      await page.goto(`${prefix}${section.path}`);
      await assertSection(page, locale, section);
    }

    await page.goto(`${prefix}/dashboard`);
    await page.evaluate(() => {(window as Window & {__navigationProbe?: string}).__navigationProbe = 'client';});
    for (const path of ['/vendors', '/documents', '/requirements', '/notifications', '/vendors', '/documents', '/dashboard'] as const) {
      const section = sections.find((item) => item.path === path)!;
      const navigation = page.getByRole('navigation', {name: locale === 'ro' ? 'Navigare în aplicație' : 'Application navigation'});
      await navigation.locator(`a[href="${prefix}${path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${prefix}${path}$`));
      await assertSection(page, locale, section);
      expect(await page.evaluate(() => (window as Window & {__navigationProbe?: string}).__navigationProbe)).toBe('client');
    }
  });

  test(`${locale.toUpperCase()} nested pages retain their owning section in breadcrumbs and sidebar`, async ({page}) => {
    const prefix = locale === 'en' ? '/en' : '';
    for (const [path, expected, section] of [
      ['/vendors/construct-pro', locale === 'ro' ? 'DashboardFurnizoriConstruct Pro SRL' : 'DashboardSuppliersConstruct Pro SRL', '/vendors'],
      ['/documents/construct-pro-tax-2024/review', locale === 'ro' ? 'DashboardDocumenteRevizuiește documentul' : 'DashboardDocumentsReview document', '/documents']
    ]) {
      await page.goto(`${prefix}${path}`);
      const breadcrumb = page.getByRole('navigation', {name: locale === 'ro' ? 'Navigare pe pagină' : /^(Breadcrumb|Page navigation)$/});
      await expect(breadcrumb).toHaveText(expected);
      await expect(breadcrumb.getByRole('link', {name: 'Dashboard'})).toHaveAttribute('href', `${prefix}/dashboard`);
      const navigation = page.getByRole('navigation', {name: locale === 'ro' ? 'Navigare în aplicație' : 'Application navigation'});
      await expect(navigation.locator('a[aria-current="page"]')).toHaveCount(1);
      await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute('href', `${prefix}${section}`);
    }
  });
}
