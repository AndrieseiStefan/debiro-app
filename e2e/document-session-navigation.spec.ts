import {expect, test, type Locator, type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createDocumentFixtureFile} from '../src/features/documents/fixture-files';

async function assertContained(drawer: Locator, width: number) {
  const geometry = await drawer.evaluate((element) => ({width: element.clientWidth, scroll: element.scrollWidth, page: document.documentElement.scrollWidth}));
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
  expect(geometry.page).toBeLessThanOrEqual(width);
}
async function headerMetrics(drawer: Locator) {
  return drawer.locator('header').evaluate((header) => {
    const heading = header.querySelector('h2')!;
    const style = getComputedStyle(heading);
    return {height: header.getBoundingClientRect().height, font: style.fontSize, line: style.lineHeight, padding: getComputedStyle(header).padding};
  });
}
async function close(page: Page, english: boolean) {
  await page.getByRole('dialog').getByRole('button', {name: english ? 'Close' : 'Închide', exact: true}).first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

for (const english of [false, true]) for (const width of [1448, 375]) {
  test(`${english ? 'EN' : 'RO'} ISU session versions, exact files and drawer sizing survive repeated navigation at ${width}px`, async ({page}) => {
    const prefix = english ? '/en' : '';
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    await page.goto(`${prefix}/documents`);
    const realm = await page.evaluate(() => {const marker = crypto.randomUUID(); Reflect.set(window, '__documentSessionNavigation', marker); return marker;});
    const nav = page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'});
    const navigate = async (section: string, route: string) => {
      await nav.getByRole('link', {name: new RegExp(`^${section}(?: \\d+)?$`)}).click();
      await expect(page).toHaveURL(`${prefix}${route}`);
      expect(await page.evaluate(() => Reflect.get(window, '__documentSessionNavigation'))).toBe(realm);
    };
    const open = async () => {
      await page.getByRole('link', {name: english ? 'Fire safety authorization' : 'Autorizație ISU', exact: true}).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    };
    await open();
    const drawer = page.getByRole('dialog');
    await expect(drawer.locator('[data-preview-version]')).toHaveCount(2);
    await expect(drawer).toHaveAttribute('data-size', 'wide');
    await expect(drawer).toHaveCSS('width', `${Math.min(width, 804)}px`);
    const header = await headerMetrics(drawer);
    expect(header.font).toBe('22px');
    await expect(drawer.getByText(english ? 'Current' : 'Curent', {exact: true})).toHaveAttribute('data-tone', 'info');
    await expect(drawer.getByRole('definition').nth(2).locator('[data-tone]')).toHaveAttribute('data-tone', 'success');
    await drawer.getByRole('button', {name: english ? 'View all' : 'Vezi toate'}).click();
    await expect(drawer).toHaveAttribute('data-size', 'standard');
    await expect(drawer).toHaveCSS('width', `${width <= 600 ? width : 502}px`);
    expect(await headerMetrics(drawer)).toEqual(header);
    await assertContained(drawer, width);
    await drawer.getByRole('button', {name: english ? 'Back to document details' : 'Înapoi la detalii document'}).click();
    await expect(drawer).toHaveAttribute('data-size', 'wide');
    await expect(drawer).toHaveCSS('width', `${Math.min(width, 804)}px`);
    await drawer.getByRole('button', {name: english ? 'Replace document' : 'Înlocuiește document', exact: true}).click();
    await expect(drawer).toHaveAttribute('data-size', 'standard');
    await expect(drawer).toHaveCSS('width', `${width <= 600 ? width : 502}px`);
    expect(await headerMetrics(drawer)).toEqual(header);
    await assertContained(drawer, width);
    await drawer.getByRole('button', {name: english ? 'Back to document details' : 'Înapoi la detalii document'}).click();
    await expect(drawer).toHaveAttribute('data-size', 'wide');
    await expect(drawer).toHaveCSS('width', `${Math.min(width, 804)}px`);
    await drawer.getByRole('button', {name: english ? 'Replace document' : 'Înlocuiește document', exact: true}).click();
    const bytes = Buffer.from('ISU session renewal exact bytes');
    await drawer.locator('input[type=file]').setInputFiles({name: 'isu-session-v3.pdf', mimeType: 'application/pdf', buffer: bytes});
    await drawer.locator('#replace-issuedAt').fill('02.10.2026');
    await drawer.locator('#replace-expiresAt').fill('01.01.2099');
    await drawer.getByRole('button', {name: english ? 'Upload document' : 'Încarcă document', exact: true}).click();
    await expect(page.getByRole('dialog', {name: english ? 'Document uploaded successfully' : 'Document încărcat cu succes'})).toBeVisible();
    const currentId = new URL(page.url()).searchParams.get('document');
    await close(page, english);

    const assertVersions = async () => {
      await open();
      await expect(page).toHaveURL(new RegExp(`document=${currentId}$`));
      await expect(drawer).toContainText('isu-session-v3.pdf');
      await expect(drawer.locator('[data-preview-version]')).toHaveCount(3);
      await expect(drawer.getByRole('definition').nth(3)).toContainText('2099');
      await drawer.getByRole('button', {name: english ? 'View all' : 'Vezi toate'}).click();
      await expect(drawer.locator('[data-version]')).toHaveCount(3);
      await expect(drawer.locator('[data-version-state="current"]')).toHaveCount(1);
      await expect(drawer.locator('[data-version-state="current"]')).toHaveAttribute('data-version', '3');
      await expect(drawer.locator('[data-version="1"], [data-version="2"]')).toHaveCount(2);
      await expect(drawer.locator('[data-version-state="superseded"] button[aria-haspopup="menu"]')).toHaveCount(0);
    };
    await assertVersions(); await close(page, english);
    for (const [section, route] of [[english ? 'Suppliers' : 'Furnizori', '/vendors'], [english ? 'Requirements' : 'Cerințe', '/requirements'], [english ? 'Notifications' : 'Notificări', '/notifications'], ['Dashboard', '/dashboard']] as const) {
      await navigate(section, route);
      await navigate(english ? 'Documents' : 'Documente', '/documents');
      await expect(page.getByRole('row', {name: /isu-session-v3.pdf/})).toHaveCount(1);
      await expect(page.getByRole('row', {name: /Autorizatie_ISU.pdf/})).toHaveCount(0);
      await assertVersions(); await close(page, english);
    }
    await navigate(english ? 'Suppliers' : 'Furnizori', '/vendors');
    await page.getByRole('link', {name: english ? 'Details for Construct Pro SRL' : 'Detalii pentru Construct Pro SRL'}).click();
    await assertVersions();
    for (const version of [1, 2, 3]) {
      const download = page.waitForEvent('download');
      if (version === 3) {
        await drawer.locator('[data-version="3"]').getByRole('button').click();
        await drawer.getByRole('menuitem', {name: english ? 'Download' : 'Descarcă'}).click();
      } else await drawer.locator(`[data-version="${version}"]`).getByRole('button', {name: english ? 'Download' : 'Descarcă'}).click();
      const saved = await download;
      const filename = version === 3 ? 'isu-session-v3.pdf' : version === 2 ? 'Autorizatie_ISU.pdf' : 'Autorizatie_ISU_v1.pdf';
      expect(saved.suggestedFilename()).toBe(filename);
      const expected = version === 3 ? bytes : Buffer.from(await createDocumentFixtureFile({id: `construct-pro-fire-2024${version === 1 ? '-v1' : ''}`, filename, version, createdAt: version === 1 ? '2026-02-15T12:00:00Z' : '2026-09-29T12:00:00Z'}).arrayBuffer());
      expect(await readFile((await saved.path())!)).toEqual(expected);
    }
    await close(page, english);
    await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
    await page.locator('[data-company-switch-id="global-clean-services"]').click();
    await expect(page.getByText('isu-session-v3.pdf')).toHaveCount(0);
    await navigate(english ? 'Documents' : 'Documente', '/documents');
    await expect(page.getByRole('row', {name: /isu-session-v3.pdf/})).toHaveCount(0);
    await page.getByRole('button', {name: 'Global Clean Services', exact: true}).click();
    await page.locator('[data-company-switch-id="demo-company"]').click();
    await assertVersions(); await close(page, english);
    // Reload/new tabs are intentionally fresh E1 sessions, unlike SPA navigation.
    await page.reload();
    await expect(page.getByRole('row', {name: /isu-session-v3.pdf/})).toHaveCount(0);
    await open();
    await expect(drawer.locator('[data-preview-version]')).toHaveCount(2);
  });
}
