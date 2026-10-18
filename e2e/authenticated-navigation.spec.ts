import {expect, test, type Page} from '@playwright/test';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import {switchWorkspaceCompany} from './support/company-workspace';

const sections = [
  {path: '/dashboard', ro: 'Dashboard', en: 'Dashboard', breadcrumbRo: null, breadcrumbEn: null},
  {path: '/vendors', ro: 'Furnizori', en: 'Suppliers', breadcrumbRo: 'DashboardFurnizori', breadcrumbEn: 'DashboardSuppliers'},
  {path: '/documents', ro: 'Documente', en: 'Documents', breadcrumbRo: 'DashboardDocumente', breadcrumbEn: 'DashboardDocuments'},
  {path: '/requirements', ro: 'Șabloane', en: 'Templates', breadcrumbRo: 'DashboardȘabloane', breadcrumbEn: 'DashboardTemplates'},
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

for (const english of [false, true]) {
  const copy = english ? en : ro, prefix = english ? '/en' : '', locale = english ? 'en' : 'ro';
  const group = {label: copy.AppShell.navigation.company}, settings = {label: copy.AppShell.navigation.settings};
  const workspacePages: {path: string; items: {label: string; href?: string}[]}[] = [
    {path: '/vendors', items: [{label: copy.Vendors.title}]},
    {path: '/vendors/construct-pro', items: [{label: copy.Vendors.title, href: '/vendors'}, {label: 'Construct Pro SRL'}]},
    {path: '/documents', items: [{label: copy.Documents.title}]},
    {path: '/documents/construct-pro-tax-2024/review', items: [{label: copy.AppShell.navigation.documents, href: '/documents'}, {label: copy.DocumentReview.breadcrumbCurrent}]},
    {path: '/requirements', items: [{label: copy.AppShell.navigation.requirements}]},
    {path: '/notifications', items: [{label: copy.AppShell.navigation.notifications}]},
    {path: '/company/documents', items: [group, {label: copy.CompanyDocuments.title}]},
    {path: '/company/employees', items: [group, {label: copy.Employees.title}]},
    {path: '/company/employees/employee%3Aandrei-popescu', items: [group, {label: copy.Employees.title, href: '/company/employees'}, {label: 'Andrei Popescu'}]},
    {path: '/company/settings/profile', items: [settings, {label: copy.CompanyProfile.title}]},
    {path: '/company/settings/members', items: [settings, {label: copy.CompanyMembers.title}]},
    {path: '/company/settings/billing', items: [settings, {label: copy.CompanyBilling.title}]}
  ];

  test(`${locale.toUpperCase()} every workspace breadcrumb has one linked Dashboard and only real parent destinations`, async ({page}) => {
    test.setTimeout(90_000);
    for (const {path, items} of workspacePages) {
      await page.goto(prefix + path);
      const breadcrumb = page.locator('main').getByRole('navigation').first();
      await expect(breadcrumb).toHaveText(copy.AppShell.navigation.dashboard + items.map((item) => item.label).join(''));
      const dashboard = breadcrumb.getByRole('link', {name: copy.AppShell.navigation.dashboard, exact: true}); await expect(dashboard).toHaveCount(1); await expect(dashboard).toHaveAttribute('href', prefix + '/dashboard');
      await expect(breadcrumb.locator('[aria-current="page"]')).toHaveCount(1); await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(items.at(-1)!.label);
      for (const item of items) {
        const link = breadcrumb.getByRole('link', {name: item.label, exact: true});
        if (item.href) await expect(link).toHaveAttribute('href', prefix + item.href);
        else await expect(link).toHaveCount(0);
      }
      await dashboard.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(prefix + '/dashboard');
      await expect(page.getByRole('button', {name: 'Demo Company SRL', exact: true})).toBeVisible(); await expect(page.locator('main').getByRole('navigation')).toHaveCount(0);
    }
  });

  test(`${locale.toUpperCase()} Company breadcrumb roots preserve the active company and locale on client navigation`, async ({page}) => {
    await page.goto(prefix + '/company/documents'); await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services', english);
    const nav = page.getByRole('navigation', {name: copy.AppShell.navigationLabel}), company = nav.getByRole('button', {name: group.label, exact: true});
    if (await company.getAttribute('aria-expanded') !== 'true') await company.click();
    for (const path of ['/company/documents', '/company/employees']) {
      await nav.locator(`a[href="${prefix}${path}"]`).click();
      const breadcrumb = page.locator('main').getByRole('navigation').first();
      await breadcrumb.getByRole('link', {name: copy.AppShell.navigation.dashboard, exact: true}).click(); await expect(page).toHaveURL(prefix + '/dashboard');
      await expect(page.getByRole('button', {name: 'Global Clean Services', exact: true})).toBeVisible(); await expect(page.locator('section[aria-label] [data-tone] strong').first()).toHaveText('0');
    }
  });

  test(`${locale.toUpperCase()} Company breadcrumbs remain readable at mobile widths and locale switching retains the employee route`, async ({page}) => {
    for (const width of [1448, 768, 375, 320]) for (const path of ['/company/documents', '/company/employees', '/company/employees/employee%3Aandrei-popescu']) {
      await page.setViewportSize({width, height: 900}); await page.goto(prefix + path);
      const breadcrumb = page.locator('main').getByRole('navigation').first(); await expect(breadcrumb).toBeInViewport();
      // Measure actual text and chevrons, not only flex boxes, to detect squeezed breadcrumb content.
      const layout = await breadcrumb.evaluate((element) => {
        const rects = [...element.children].flatMap((item) => {const range = document.createRange(); range.selectNodeContents(item.lastElementChild!); const icon = item.querySelector('svg'); return [...range.getClientRects(), ...(icon ? [icon.getBoundingClientRect()] : [])].filter((rect) => rect.width && rect.height);});
        return {contained: rects.every((rect) => rect.left >= 0 && rect.right <= innerWidth), separated: rects.every((rect, index) => rects.slice(index + 1).every((next) => rect.right <= next.left + 1 || next.right <= rect.left + 1 || rect.bottom <= next.top + 1 || next.bottom <= rect.top + 1))};
      });
      expect(layout.contained).toBe(true); expect(layout.separated).toBe(true); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: `artifacts/visual/e1c-006a4/${path.split('/').at(-1)}-${locale}-${width}.png`});
    }
    const route = '/company/employees/employee%3Aandrei-popescu'; await page.getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).filter({visible: true}).click(); await expect(page).toHaveURL((english ? '' : '/en') + route);
    const next = english ? ro : en, breadcrumb = page.locator('main').getByRole('navigation').first(); await expect(breadcrumb).toHaveText(`${next.AppShell.navigation.dashboard}${next.AppShell.navigation.company}${next.Employees.title}Andrei Popescu`);
    await breadcrumb.getByRole('link', {name: next.Employees.title, exact: true}).click(); await expect(page).toHaveURL((english ? '' : '/en') + '/company/employees');
  });
}
