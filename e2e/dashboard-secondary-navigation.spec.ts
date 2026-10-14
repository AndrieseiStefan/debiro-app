import {expect, test, type Page} from '@playwright/test';
import en from '../messages/en.json' with {type: 'json'};
import ro from '../messages/ro.json' with {type: 'json'};
import {openFilters} from './support/filters';
import {createWorkspaceCompany, switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

const panel = (page: Page, title: string) => page.getByRole('heading', {name: title, exact: true}).locator('..').locator('..');
async function expectAttentionFilters(page: Page, english: boolean, selected: boolean) {
  const copy = english ? en : ro;
  await openFilters(page);
  for (const status of ['review', 'expiring', 'expired'] as const) {
    const checkbox = page.getByRole('checkbox', {name: new RegExp(copy.Documents.status[status])});
    if (selected) await expect(checkbox).toBeChecked(); else await expect(checkbox).not.toBeChecked();
  }
  await expect(page.getByRole('checkbox', {name: new RegExp(copy.Documents.status.valid)})).not.toBeChecked();
  await page.keyboard.press('Escape');
}

for (const english of [false, true]) {
  const copy = english ? en : ro, prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} attention navigation matches current uploaded files and resets on normal entry`, async ({page}) => {
    await page.goto(prefix + '/dashboard');
    const attention = panel(page, copy.Dashboard.documentsTitle);
    const ids = await attention.locator('[data-attention-document-id]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-attention-document-id')));
    expect(ids).toHaveLength(10); expect(ids.every((id) => !id!.startsWith('vendor-requirement:'))).toBe(true);
    await expect(attention).not.toContainText('ISO 9001');
    const notice = page.getByText(copy.Dashboard.urgentDocuments.replace('{count}', '10')).locator('..');
    await expect(notice.getByRole('button')).toHaveCount(0); await expect(notice.getByRole('link')).toHaveCount(0);
    await expect(notice.locator('svg')).toHaveCount(1);
    expect(await notice.evaluate((element) => getComputedStyle(element).cursor)).not.toBe('pointer');
    await notice.click(); await expect(page).toHaveURL(prefix + '/dashboard');
    const status = panel(page, copy.Dashboard.supplierStatusTitle);
    await expect(status.getByRole('button')).toHaveCount(0); await expect(status.getByRole('link')).toHaveCount(0);
    await status.getByRole('img').click(); await expect(page).toHaveURL(prefix + '/dashboard');
    const link = attention.getByRole('link', {name: copy.Dashboard.viewAll});
    await expect(link).toHaveAttribute('href', prefix + '/documents?attention=1'); await expect(link).not.toHaveAttribute('aria-disabled', 'true');
    await link.focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(prefix + '/documents?attention=1');
    await expect(page.getByRole('button', {name: new RegExp('^' + copy.Documents.tabs.all)})).toHaveAttribute('aria-current', 'page');
    await expectAttentionFilters(page, english, true);
    await expect(page.getByText(copy.Documents.showing.replace('{start}', '1').replace('{end}', '8').replace('{count}', '10'))).toBeVisible();
    const resultIds = await page.locator('tbody [data-document-id]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-document-id')));
    await expect(page.locator('tbody [data-status="valid"]')).toHaveCount(0);
    await page.getByRole('button', {name: copy.Documents.pageNumber.replace('{page}', '2'), exact: true}).click();
    resultIds.push(...await page.locator('tbody [data-document-id]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-document-id'))));
    expect(resultIds.sort()).toEqual(ids.sort());
    // Details remains in the same filtered context; closing does not remount/reset the list.
    await page.locator('tbody tr').first().getByRole('link').first().click();
    await expect(page).toHaveURL(/attention=1&document=/);
    await page.getByRole('dialog').getByRole('button', {name: copy.DocumentManagement.close, exact: true}).first().click();
    await expect(page).toHaveURL(prefix + '/documents?attention=1'); await expectAttentionFilters(page, english, true);
    await workspaceSection(page, 'vendors', english); await workspaceSection(page, 'documents', english);
    await expectAttentionFilters(page, english, false);
    await expect(page.getByText(copy.Documents.showing.replace('{start}', '1').replace('{end}', '8').replace('{count}', '25'))).toBeVisible();
    await page.goBack(); await expect(page).toHaveURL(prefix + '/vendors');
    await page.goBack(); await expect(page).toHaveURL(prefix + '/documents?attention=1'); await expectAttentionFilters(page, english, true);
    // Explicit normal entry also resets while the Documents route is already mounted.
    await workspaceSection(page, 'documents', english); await expectAttentionFilters(page, english, false);
    for (const query of ['attention=0', 'attention=unknown', 'attention=1&attention=1']) {
      await page.goto(prefix + '/documents?' + query); await expectAttentionFilters(page, english, false);
    }
  });

  test(`${english ? 'EN' : 'RO'} Recent Activity opens normal Notifications without growing the Dashboard preview`, async ({page}) => {
    await page.goto(prefix + '/notifications');
    const categories = page.getByRole('navigation', {name: copy.Notifications.categoriesLabel});
    await categories.getByRole('button', {name: new RegExp('^' + copy.Notifications.categories.unread)}).click();
    await page.getByRole('combobox', {name: copy.Notifications.rangeLabel}).selectOption('all');
    await workspaceSection(page, 'dashboard', english);
    const activity = panel(page, copy.Dashboard.recentActivityTitle);
    await expect(activity.locator('ol li')).toHaveCount(4);
    await expect(activity.getByRole('button')).toHaveCount(0);
    const link = activity.getByRole('link', {name: copy.Dashboard.viewAll}); await link.focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(prefix + '/notifications');
    await expect(categories.getByRole('button', {name: new RegExp('^' + copy.Notifications.categories.all)})).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('combobox', {name: copy.Notifications.rangeLabel})).toHaveValue('last30');
    await expect(page.locator('#recent-section tbody tr')).toHaveCount(5);
    await page.goBack(); await expect(page).toHaveURL(prefix + '/dashboard'); await expect(activity.locator('ol li')).toHaveCount(4);
  });

  test(`${english ? 'EN' : 'RO'} zero attention and company switches never expose another company's documents`, async ({page}) => {
    await createWorkspaceCompany(page, 'Workspace B', english);
    const attention = panel(page, copy.Dashboard.documentsTitle);
    await expect(attention.getByRole('table')).toHaveCount(0);
    await attention.getByRole('link', {name: copy.Dashboard.viewAll}).click();
    await expect(page).toHaveURL(prefix + '/documents?attention=1'); await expectAttentionFilters(page, english, true);
    await expect(page.getByText(copy.Documents.noMatches)).toBeVisible(); await expect(page.getByRole('table')).toHaveCount(0);
    await switchWorkspaceCompany(page, 'Workspace B', 'Demo Company SRL', english);
    await expect(attention.locator('[data-attention-document-id]')).toHaveCount(10);
    await attention.getByRole('link', {name: copy.Dashboard.viewAll}).click(); await expect(page.locator('tbody tr')).toHaveCount(8);
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Workspace B', english);
    await attention.getByRole('link', {name: copy.Dashboard.viewAll}).click(); await expect(page.getByText(copy.Documents.noMatches)).toBeVisible();
    await workspaceSection(page, 'documents', english); await expect(page.getByText(copy.CompanyWorkspace.documentsTitle)).toBeVisible();
  });

  test(`${english ? 'EN' : 'RO'} secondary links, all attention badges and filter controls remain contained responsively`, async ({page}) => {
    for (const width of [1448, 1024, 758, 600, 375, 320]) {
      await page.setViewportSize({width, height: 900}); await page.goto(prefix + '/dashboard');
      const attention = panel(page, copy.Dashboard.documentsTitle);
      const geometry = await attention.locator('tbody td:nth-child(3) > span').evaluateAll((badges) => badges.map((badge) => ({badgeRight: badge.getBoundingClientRect().right, cellRight: badge.parentElement!.getBoundingClientRect().right, scroll: badge.scrollWidth, width: badge.clientWidth})));
      for (const badge of geometry) {expect(badge.badgeRight).toBeLessThanOrEqual(badge.cellRight + 1); expect(badge.scroll).toBeLessThanOrEqual(badge.width + 1);}
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await attention.getByRole('link', {name: copy.Dashboard.viewAll}).click(); await expectAttentionFilters(page, english, true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });
}
