import {expect, test, type Page} from '@playwright/test';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import type {NotificationActivityItem} from '../src/features/notifications/types';
import type {readCompanyState} from '../src/features/companies/company-state';
import {notificationRecords} from './support/notification-records';
import {switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

const companyId = 'demo-company', employeeId = 'employee:andrei-popescu';
test.afterEach(async ({page}) => {await page.unrouteAll({behavior: 'wait'});});
function notice(id: string, overrides: Partial<NotificationActivityItem> = {}): NotificationActivityItem {
  return {id, companyId, domain: 'company_document', type: 'document_missing', title: {ro: 'Notificare înregistrată', en: 'Recorded notification'}, description: {ro: 'Context înregistrat', en: 'Recorded context'}, occurredAt: '2026-10-02T11:00:00Z', isUnread: true, actor: 'system', ...overrides};
}
async function role(page: Page, role: 'administrator' | 'viewer' | 'reviewer') {
  await page.evaluate((role) => {
    const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
    owner.state = {...owner.state, companies: owner.state.companies.map((company) => company.company.id === 'demo-company' ? {...company, members: company.members.map((member) => member.isCurrentUser ? {...member, role} : member)} : company)};
    owner.listeners.forEach((notify) => notify());
  }, role);
}

for (const english of [false, true]) {
  const c = english ? en : ro, prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} actual Company records open Details, missing context and safe stale rows`, async ({page}) => {
    await notificationRecords(page, [notice('company-current', {documentId: 'company-document:iso'}), notice('company-missing', {requirementId: 'company-requirement:criminal-record'}), notice('company-deleted', {documentId: 'removed', requirementId: 'company-requirement:tax', href: '/forged'})]);
    await page.goto(prefix + '/vendors'); await workspaceSection(page, 'notifications', english);
    const bell = page.getByRole('button', {name: c.AppShell.notificationLabel, exact: true}).last(); await bell.click();
    let panel = page.getByRole('dialog', {name: c.NotificationCenter.title});
    await expect(panel.locator('[data-notification-id^="attention:"]')).toHaveCount(0);
    await expect(panel.locator('[data-notification-id="company-deleted"] a, [data-notification-id="company-deleted"] button')).toHaveCount(0);
    await panel.locator('[data-notification-id="company-current"] button').focus(); await page.keyboard.press('Enter');
    const details = page.getByRole('dialog');
    await expect(details.getByRole('heading', {name: c.DocumentManagement.detailsTitle, exact: true})).toBeVisible();
    await expect(details.getByText(c.CompanyDocuments.status.needs_review, {exact: true}).first()).toBeVisible();
    await page.screenshot({path: `artifacts/visual/e1c-007b1/company-record-${english ? 'en' : 'ro'}.png`});
    await page.keyboard.press('Escape'); await expect(details).toHaveCount(0); await expect(bell).toBeFocused();
    // Navigation preserves the existing explicit mark-read semantics (no implicit read).
    await expect(bell).toContainText('3'); await bell.click(); panel = page.getByRole('dialog', {name: c.NotificationCenter.title});
    await panel.locator('[data-notification-id="company-missing"] a').click();
    await expect(page).toHaveURL(prefix + '/company/documents');
    await expect(page.getByRole('heading', {name: c.CompanyDocuments.title, exact: true})).toBeVisible();
  });

  test(`${english ? 'EN' : 'RO'} Employee records respect personnel authorization, company scope and existing Details routes`, async ({page}) => {
    const privateRecord = notice('employee-record', {domain: 'employee', entityId: employeeId, title: {ro: 'Private personnel notice', en: 'Private personnel notice'}, href: '/vendors/construct-pro'});
    await notificationRecords(page, [privateRecord]);
    await page.goto(prefix + '/vendors'); await workspaceSection(page, 'notifications', english);
    const bell = page.getByRole('button', {name: c.AppShell.notificationLabel, exact: true}).last();
    for (const value of ['reviewer', 'viewer'] as const) {
      await role(page, value); await expect(bell.locator('span')).toHaveCount(0); await bell.click();
      const panel = page.getByRole('dialog', {name: c.NotificationCenter.title});
      await expect(panel.getByText(c.NotificationCenter.empty)).toBeVisible();
      expect(await panel.innerHTML()).not.toContain(employeeId); await expect(panel).not.toContainText('Private personnel notice');
      await page.keyboard.press('Escape');
    }
    await role(page, 'administrator'); await bell.click();
    await page.getByRole('dialog', {name: c.NotificationCenter.title}).getByRole('link', {name: /Private personnel notice/}).click();
    await expect(page).toHaveURL(prefix + '/company/employees/employee%3Aandrei-popescu');
    await expect(page.getByRole('heading', {level: 2, name: 'Andrei Popescu', exact: true})).toBeVisible();
    await workspaceSection(page, 'notifications', english);
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services', english); await workspaceSection(page, 'notifications', english);
    await expect(bell.locator('span')).toHaveCount(0); await bell.click();
    await expect(page.getByRole('dialog', {name: c.NotificationCenter.title}).getByText(c.NotificationCenter.empty)).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Private personnel notice');
  });

  test(`${english ? 'EN' : 'RO'} full-source unread totals, latest-six preview, mark-all-read and passive-only empty state`, async ({page}) => {
    const records = Array.from({length: 8}, (_, index) => notice(`actual-record-${index}`, {occurredAt: `2026-09-${30 - index}T09:00:00Z`, isUnread: index === 0 || index >= 6}));
    await notificationRecords(page, records); await page.goto(prefix + '/vendors'); await workspaceSection(page, 'notifications', english);
    const bell = page.getByRole('button', {name: c.AppShell.notificationLabel, exact: true}).last(); await expect(bell).toContainText('3'); await bell.click();
    const panel = page.getByRole('dialog', {name: c.NotificationCenter.title});
    await expect(panel.locator('[data-notification-id]')).toHaveCount(6); await expect(panel.locator('[data-unread="true"]')).toHaveCount(1);
    for (const [width, height] of [[1448, 900], [768, 900], [375, 812], [320, 720]]) {
      if (await panel.count()) await page.keyboard.press('Escape');
      await page.setViewportSize({width, height}); await bell.click(); await expect(panel).toBeVisible();
      await expect.poll(() => panel.evaluate((element) => {const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth;})).toBe(true);
      await page.screenshot({path: `artifacts/visual/e1c-007b1/actual-records-${english ? 'en' : 'ro'}-${width}.png`});
    }
    await panel.getByRole('button', {name: c.NotificationCenter.markAllRead}).click(); await expect(bell.locator('span')).toHaveCount(0);
    await expect(panel.locator('[data-unread="true"]')).toHaveCount(0); await page.keyboard.press('Escape');
    const filters = page.getByRole('navigation', {name: c.Notifications.categoriesLabel});
    await expect(filters.getByRole('button', {name: new RegExp(`^${c.Notifications.categories.unread} 0$`)})).toBeVisible();
    await workspaceSection(page, 'vendors', english); await workspaceSection(page, 'notifications', english); await expect(bell.locator('span')).toHaveCount(0);
    await filters.getByRole('button', {name: new RegExp(`^${c.Notifications.categories.unread}`)}).click(); await expect(page.locator('#recent-section [data-notification-id]')).toHaveCount(0);
    await page.unrouteAll({behavior: 'wait'}); await notificationRecords(page, []); await page.goto(prefix + '/vendors'); await workspaceSection(page, 'notifications', english);
    await expect(page.locator('#missing-section tbody tr')).not.toHaveCount(0); await expect(page.locator('#expiring-section tbody tr')).not.toHaveCount(0);
    await bell.click(); await expect(page.getByRole('dialog', {name: c.NotificationCenter.title}).getByText(c.NotificationCenter.empty)).toBeVisible();
  });
}
