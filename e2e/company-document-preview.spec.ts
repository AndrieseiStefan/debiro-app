import {expect, test} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {createDocumentFixtureFile} from '../src/features/documents/fixture-files';
import type {readCompanyState} from '../src/features/companies/company-state';

// The standard headless shell has no PDF plugin; full Chromium verifies native PDF rendering.
test.use({channel: 'chromium'});
test('renders an actual uploaded PDF in a PDF-capable browser', async ({page}) => {
  await page.goto('/en/company/documents'); await page.getByRole('button', {name: 'Add Documents', exact: true}).click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('#company-upload-name').fill('Native PDF proof'); await dialog.locator('#company-upload-type').selectOption('tax');
  const file = createDocumentFixtureFile({id: 'native-company-proof', filename: 'native-proof.pdf', createdAt: '2026-10-02T12:00:00Z'});
  await dialog.locator('input[type=file]').setInputFiles({name: file.name, mimeType: file.type, buffer: Buffer.from(await file.arrayBuffer())});
  await dialog.getByRole('button', {name: 'Upload and continue', exact: true}).click(); await expect(dialog).not.toBeVisible();
  await page.getByRole('button', {name: 'Native PDF proof', exact: true}).click(); dialog = page.getByRole('dialog');
  await page.evaluate(() => {const original = URL.revokeObjectURL.bind(URL); Reflect.set(window, 'companyPreviewRevoked', []); URL.revokeObjectURL = (url) => {Reflect.get(window, 'companyPreviewRevoked').push(url); original(url);};});
  await dialog.getByRole('button', {name: 'View file', exact: true}).click();
  await expect.poll(() => page.frames().filter((frame) => frame.url().startsWith('chrome-extension://')).length).toBe(1);
  const viewer = page.frames().find((frame) => frame.url().startsWith('chrome-extension://'))!;
  await expect(viewer.locator('pdf-viewer')).toBeVisible();
  // Chromium creates the viewer before the PDF finishes loading; capture its actual page, not the empty plugin shell.
  await expect.poll(() => viewer.locator('pdf-viewer').evaluate((element) => Reflect.get(element, 'initialLoadComplete_'))).toBe(true);
  await viewer.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const url = await dialog.getByTitle('native-proof.pdf').getAttribute('src'); expect(url).toMatch(/^blob:/);
  await mkdir('artifacts/visual/e1c-003', {recursive: true}); await page.screenshot({path: 'artifacts/visual/e1c-003/native-pdf.png'});
  await page.evaluate(() => {
    const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
    owner.state = {...owner.state, activeCompanyId: 'global-clean-services'}; owner.listeners.forEach((notify) => notify());
  });
  await expect(page).toHaveURL(/\/en\/dashboard$/); await expect(page.locator('iframe')).toHaveCount(0);
  await expect.poll(() => page.evaluate((url) => (Reflect.get(window, 'companyPreviewRevoked') as string[]).includes(url!), url)).toBe(true);
});

test('renders uploaded raster bytes through the browser image decoder', async ({page}) => {
  await page.goto('/en/company/documents');
  const png = await page.evaluate(() => {const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180; const context = canvas.getContext('2d')!; context.fillStyle = '#e5f0ff'; context.fillRect(0, 0, 320, 180); context.fillStyle = '#142448'; context.font = '20px sans-serif'; context.fillText('Company document test', 20, 45); return canvas.toDataURL('image/png').split(',')[1];});
  await page.getByRole('button', {name: 'Add Documents', exact: true}).click(); const dialog = page.getByRole('dialog');
  await dialog.locator('#company-upload-name').fill('Raster proof'); await dialog.locator('#company-upload-type').selectOption('custom');
  await dialog.locator('input[type=file]').setInputFiles({name: 'company-image.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64')});
  await dialog.getByRole('button', {name: 'Upload and continue', exact: true}).click(); await expect(dialog).not.toBeVisible();
  await page.getByRole('button', {name: 'Raster proof', exact: true}).click(); await dialog.getByRole('button', {name: 'View file', exact: true}).click();
  const image = dialog.getByRole('img', {name: 'company-image.png'});
  await expect(image).toBeVisible(); await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(320);
  await mkdir('artifacts/visual/e1c-003', {recursive: true}); await page.screenshot({path: 'artifacts/visual/e1c-003/raster-preview.png'});
});
