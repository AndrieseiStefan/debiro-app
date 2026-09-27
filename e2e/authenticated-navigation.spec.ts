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
