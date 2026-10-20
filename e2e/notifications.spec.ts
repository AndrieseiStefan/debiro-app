import {expect, test, type Page} from '@playwright/test';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import {createDocumentFixtureFile} from '../src/features/documents/fixture-files';
import type {EmployeeState} from '../src/features/employees/types';
import type {readCompanyState} from '../src/features/companies/company-state';
import {switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

test('Romanian and English notifications routes render without a redundant eyebrow', async ({page}) => {
  for (const [route, title, description, nav, breadcrumbLabel, section, eyebrow] of [
    ['/notifications', 'Notificări și Activitate de Audit', 'Vezi ce necesită atenția ta, urmărește notificările și verifică istoricul activităților.', 'Navigare în aplicație', 'Navigare pe pagină', 'Notificări', 'NOTIFICĂRI ȘI ACTIVITATE'],
    ['/en/notifications', 'Notifications and Audit Activity', 'See what needs your attention, follow notifications, and review the activity history.', 'Application navigation', 'Page navigation', 'Notifications', 'NOTIFICATIONS AND ACTIVITY']
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', {level: 1, name: title})).toBeVisible();
    await expect(page.getByText(description, {exact: true})).toBeVisible();
    const breadcrumbs = page.getByRole('navigation', {name: breadcrumbLabel});
    await expect(breadcrumbs.getByRole('link', {name: 'Dashboard'})).toBeVisible();
    await expect(breadcrumbs.getByText(section, {exact: true})).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText(eyebrow, {exact: true})).toHaveCount(0);
    await expect(page.getByRole('navigation', {name: nav}).getByRole('link', {name: /Notificări|Notifications/})).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('region', {name: route.startsWith('/en') ? 'Audit journal' : 'Jurnal de audit'})).toBeVisible();
  }
});

test('category and date filters separate actual activity from demo notices without filtering audit by notification type', async ({page}) => {
  await page.goto('/notifications');
  const categories = page.getByRole('navigation', {name: 'Filtre activitate'});
  const recent = page.getByRole('region', {name: 'Activitate recentă'});
  const audit = page.getByRole('region', {name: 'Jurnal de audit'});
  await expect(categories.getByRole('button', {name: /Toate 26/})).toBeVisible();
  await expect(categories.getByRole('button', {name: /Necitite 3/})).toBeVisible();
  await categories.getByRole('button', {name: /Necitite/}).click();
  await expect(recent.getByRole('button', {name: 'Vezi toate'})).toHaveCount(0);
  await expect(recent.locator('tbody tr')).toHaveCount(3);
  await expect(recent.locator('tbody tr').filter({hasText: 'Necitit'})).toHaveCount(3);
  await expect(audit.locator('ol li')).toHaveCount(6);
  await categories.getByRole('button', {name: /Reminder-e/}).click();
  await expect(recent.locator('tbody tr')).toHaveCount(2);
  await categories.getByRole('button', {name: /Încărcări/}).click();
  await expect(categories.getByRole('button', {name: /Încărcări 21/})).toBeVisible();
  await expect(recent.locator('tbody tr')).toHaveCount(5);
  await categories.getByRole('button', {name: /Schimbări status/}).click();
  await expect(recent.locator('tbody tr')).toHaveCount(2);
  await categories.getByRole('button', {name: /Toate/}).click();
  await audit.getByRole('button', {name: 'Vezi toate'}).click();
  await expect(audit.locator('ol li')).toHaveCount(26);
  await page.getByRole('combobox', {name: 'Perioadă activitate și audit'}).selectOption('last7');
  await expect(categories.getByRole('button', {name: /Toate 8/})).toBeVisible();
  await expect(audit.locator('ol li')).toHaveCount(8);
  await page.getByRole('combobox', {name: 'Perioadă activitate și audit'}).selectOption('all');
  await expect(categories.getByRole('button', {name: /Toate 30/})).toBeVisible();
  await expect(audit.locator('ol li')).toHaveCount(30);
  const dates = await audit.locator('ol li time').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('dateTime')));
  expect(dates).toEqual([...dates].sort().reverse());
});

test('export downloads only visible audit records as deterministic CSV', async ({page}) => {
  await page.goto('/notifications');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exportă jurnal'}).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('jurnal-audit.csv');
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const content = Buffer.concat(chunks).toString('utf8');
  expect(content).toContain('audit-confirmed-1');
  expect(content).not.toContain('audit-reminder-1');
  expect(content).toContain('domain,entityId,entityName,requirementId');
  expect(content).not.toContain('notice-reminder-1');
  expect(content).not.toContain('audit-older');
});

test('responsive containment and client navigation stay stable', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1252, 833], [1024, 768], [801, 833], [758, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/notifications');
    await page.evaluate(async () => {await document.fonts.ready;});
    const direct = await page.getByRole('region', {name: 'Jurnal de audit'}).boundingBox();
    const geometry = await page.evaluate(() => {
      const summaries = [...document.querySelectorAll('[aria-label="Rezumat activitate"] > div')];
      const summaryOverlap = summaries.some((card) => {
        const note = card.querySelector('p')!;
        const text = document.createRange();
        text.selectNodeContents(note);
        const action = card.querySelector('button')?.getBoundingClientRect();
        return action ? [...text.getClientRects()].some((line) => line.left < action.right && line.right > action.left && line.top < action.bottom && line.bottom > action.top) : false;
      });
      return {documentWidth: document.documentElement.scrollWidth, mainRight: document.querySelector('main')!.getBoundingClientRect().right, auditRight: document.querySelector('[aria-labelledby="audit-title"]')!.getBoundingClientRect().right, auditTop: document.querySelector('[aria-labelledby="audit-title"]')!.getBoundingClientRect().top, recentBottom: document.querySelector('#recent-section')!.getBoundingClientRect().bottom, summaryOverlap};
    });
    expect(geometry.documentWidth, `${width}px document overflow`).toBeLessThanOrEqual(width);
    expect(geometry.auditRight, `${width}px audit containment`).toBeLessThanOrEqual(geometry.mainRight + 1);
    expect(geometry.summaryOverlap, `${width}px summary note/action overlap`).toBe(false);
    if (width <= 1252) expect(geometry.auditTop, `${width}px audit stacks below activity`).toBeGreaterThanOrEqual(geometry.recentBottom);
    await page.goto('/dashboard');
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: /Notificări/}).click();
    await expect(page).toHaveURL(/\/notifications$/);
    await page.evaluate(async () => {await document.fonts.ready;});
    expect(await page.getByRole('region', {name: 'Jurnal de audit'}).boundingBox(), `${width}px direct/client geometry`).toEqual(direct);
  }
});

async function personnelProof(page: Page, english: boolean) {
  const c = english ? en : ro;
  await page.clock.setFixedTime(new Date('2026-10-20T09:00:00.000Z'));
  await page.goto(`${english ? '/en' : ''}/company/employees/employee%3Aandrei-popescu`);
  // Composing a reminder is not a recorded send, even with real document activity below.
  await page.getByRole('button', {name: c.EmployeeDocuments.sendReminder, exact: true}).click();
  let dialog = page.getByRole('dialog'); await dialog.locator('#employee-reminder-message').fill('Please review your document.');
  await expect(dialog.getByRole('button', {name: c.EmployeeReminder.send, exact: true})).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  await page.getByRole('button', {name: c.EmployeeDocuments.add, exact: true}).first().click(); dialog = page.getByRole('dialog');
  const file = createDocumentFixtureFile({id: 'notifications-proof', filename: 'personnel-proof.pdf', version: 1, createdAt: '2026-10-02T12:00:00Z'});
  await dialog.locator('#company-upload-name').fill('Personnel renewal proof'); await dialog.locator('#company-upload-type').selectOption('custom'); await dialog.locator('#company-upload-expires').fill('18.10.2026');
  await dialog.locator('input[type=file]').setInputFiles({name: file.name, mimeType: file.type, buffer: Buffer.from(await file.arrayBuffer())});
  await dialog.getByRole('button', {name: c.AddDocument.submit, exact: true}).click(); await expect(dialog).toHaveCount(0);
  // Test-only required-rule scenario; production template assignment stays explicit.
  return page.evaluate(() => {
    const owner = Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState; listeners: Set<() => void>};
    owner.state = structuredClone(owner.state); const workspace = owner.state.byCompany['demo-company'];
    workspace.documentWorkspaces!['employee:andrei-popescu'].requirements[0].required = true; owner.listeners.forEach((notify) => notify());
    const event = workspace.activity![0]; return {id: event.id, at: event.occurredAt, actor: event.actorName};
  });
}
async function csv(page: Page, label: string) {
  const pending = page.waitForEvent('download'); await page.getByRole('button', {name: label, exact: true}).click(); const stream = await (await pending).createReadStream();
  const chunks: Uint8Array[] = []; for await (const chunk of stream!) chunks.push(chunk); return Buffer.concat(chunks).toString('utf8');
}
async function memberRole(page: Page, role: 'administrator' | 'reviewer' | 'viewer') {
  await page.evaluate((role) => {const owner = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>}; owner.state = {...owner.state, companies: owner.state.companies.map((company) => company.company.id === owner.state.activeCompanyId ? {...company, members: company.members.map((member) => member.isCurrentUser ? {...member, role} : member)} : company)}; owner.listeners.forEach((notify) => notify());}, role);
}

for (const english of [false, true]) {
  const c = english ? en : ro, prefix = english ? '/en' : '';
  test(`${english ? 'EN' : 'RO'} recorded personnel activity shares exact Dashboard identities, dates and authorized export`, async ({page}) => {
    const failures: string[] = []; page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => {if (message.type() === 'error' && /hydrat/i.test(message.text())) failures.push(message.text());});
    const event = await personnelProof(page, english);
    await workspaceSection(page, 'dashboard', english);
    const activityIds = await page.locator('[data-dashboard-event]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-dashboard-event')));
    expect(activityIds[0]).toBe(`employee:${event.id}`);
    const expiryIds = await page.locator('[data-dashboard-expiration]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-dashboard-expiration')));
    await page.locator('[data-dashboard-panel="activity"]').getByRole('link', {name: c.Dashboard.overview.viewAllActivity}).click();
    await expect(page).toHaveURL(prefix + '/notifications#audit-title');
    await expect(page.locator('#recent-section [data-activity-id]')).toHaveCount(5);
    expect(await page.locator('#recent-section [data-activity-id]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-activity-id')))).toEqual(activityIds);
    expect(await page.locator('[data-audit-id] [datetime]').first().getAttribute('datetime')).toBe(event.at);
    await expect(page.locator('[data-audit-id]').first()).toContainText(event.actor);
    const upcoming = page.locator('#expiring-section'); await upcoming.getByRole('button', {name: c.SectionActions.viewAll}).click();
    expect((await upcoming.locator('[data-notification-document]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-notification-document')))).slice(0, 5)).toEqual(expiryIds);
    await expect(upcoming.getByRole('row', {name: /Personnel renewal proof/})).toContainText('16'); // Still the fixed 2 Oct expiry clock, not the real event clock.
    const exported = await csv(page, c.Notifications.export);
    expect(exported).toContain(event.id); expect(exported).toContain(event.at); expect(exported).toContain(event.actor); expect(exported).toContain('"employee","employee:andrei-popescu","Andrei Popescu"');
    expect(exported).not.toContain('audit-reminder'); expect(exported).not.toContain('attention:');
    const filters = page.getByRole('navigation', {name: c.Notifications.categoriesLabel});
    await filters.getByRole('button', {name: new RegExp(`^${c.Notifications.categories.reminders}`)}).click();
    await expect(page.locator('#recent-section').getByText(c.Notifications.demoNotification)).toHaveCount(2);
    expect(await page.evaluate(() => (Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState}).state.byCompany['demo-company'].activity?.length)).toBe(1);
    const bell = page.getByRole('button', {name: c.AppShell.notificationLabel, exact: true}).last(); await bell.click();
    const center = page.getByRole('dialog', {name: c.NotificationCenter.title}); await expect(center.getByText(c.Notifications.currentState)).not.toHaveCount(0);
    await center.getByRole('button', {name: c.NotificationCenter.markAllRead}).click(); await page.keyboard.press('Escape');
    await expect(filters.getByRole('button', {name: new RegExp(`^${c.Notifications.categories.unread} 0$`)})).toBeVisible();
    const other = english ? ro : en;
    await page.getByRole('navigation', {name: c.AppShell.languageLabel}).last().getByRole('link', {name: english ? 'RO' : 'EN', exact: true}).click();
    await expect(page.locator(`[data-audit-id="${event.id}"]`)).toBeVisible();
    await expect(page.getByRole('navigation', {name: other.Notifications.categoriesLabel}).getByRole('button', {name: new RegExp(`^${other.Notifications.categories.unread} 0$`)})).toBeVisible();
    await page.getByRole('navigation', {name: other.AppShell.languageLabel}).last().getByRole('link', {name: english ? 'EN' : 'RO', exact: true}).click();
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services', english); await workspaceSection(page, 'notifications', english);
    await expect(page.locator('main [data-activity-id], main [data-notification-document]')).toHaveCount(0); await expect(page.locator('main')).not.toContainText('Personnel renewal proof');
    await switchWorkspaceCompany(page, 'Global Clean Services', 'Demo Company SRL', english); await workspaceSection(page, 'notifications', english);
    await expect(page.locator(`[data-audit-id="${event.id}"]`)).toBeVisible(); await expect(bell).not.toContainText('3');
    expect(failures).toEqual([]);
  });

  test(`${english ? 'EN' : 'RO'} Company attention opens existing review and bell restores keyboard focus without inventing audit`, async ({page}) => {
    await page.goto(prefix + '/notifications');
    const auditIds = await page.locator('[data-audit-id]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-audit-id')));
    const expand = page.locator('#attention-section').getByRole('button', {name: c.SectionActions.viewAll}); if (await expand.count()) await expand.click();
    const row = page.locator('#attention-section tr').filter({hasText: c.CompanyDocuments.status.needs_review}).filter({has: page.locator('button')}).first(); const id = await row.getAttribute('data-notification-document');
    await row.getByRole('button').focus(); await page.keyboard.press('Enter'); let dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', {name: c.CompanyDocumentManagement.confirm, exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: c.CompanyDocumentManagement.confirm, exact: true}).click(); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await expect(page.locator(`#attention-section [data-notification-document="${id}"]`)).toHaveCount(0);
    expect(await page.locator('[data-audit-id]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-audit-id')))).toEqual(auditIds); // Company has no event recorder in E1.
    const bell = page.getByRole('button', {name: c.AppShell.notificationLabel, exact: true}).last(); await bell.focus(); await page.keyboard.press('Enter');
    const current = page.getByRole('dialog', {name: c.NotificationCenter.title}).locator('[data-notification-id^="attention:company:"]').filter({has: page.locator('button')}).first();
    await current.getByRole('button').focus(); await page.keyboard.press('Enter'); dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', {name: c.DocumentManagement.detailsTitle, exact: true})).toBeVisible();
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(bell).toBeFocused();
  });

  test(`${english ? 'EN' : 'RO'} personnel permissions filter metadata, counts, date reference, bell and CSV before presentation`, async ({page}) => {
    const event = await personnelProof(page, english); await workspaceSection(page, 'notifications', english);
    for (const role of ['reviewer', 'viewer'] as const) {
      await memberRole(page, role); await expect(page.locator('main [data-activity-id^="employee:"]')).toHaveCount(0); await expect(page.locator('main')).not.toContainText('Personnel renewal proof');
      await expect(page.getByRole('navigation', {name: c.Notifications.categoriesLabel}).getByRole('button', {name: new RegExp(`^${c.Notifications.categories.all} 26$`)})).toBeVisible();
      const exported = await csv(page, c.Notifications.export); expect(exported).not.toContain(event.id); expect(exported).not.toContain('Personnel renewal proof'); expect(exported).not.toContain('employee:andrei-popescu');
      await page.getByRole('button', {name: c.AppShell.notificationLabel, exact: true}).last().click(); await expect(page.getByRole('dialog')).not.toContainText('Personnel renewal proof'); await page.keyboard.press('Escape');
    }
    await memberRole(page, 'administrator'); await expect(page.locator(`[data-audit-id="${event.id}"]`)).toBeVisible();
  });

  test(`${english ? 'EN' : 'RO'} mixed-domain Notifications retains responsive structure and accessible table scrolling`, async ({page}) => {
    await personnelProof(page, english); await workspaceSection(page, 'notifications', english);
    for (const [width, height] of [[1920, 1080], [1448, 900], [1280, 800], [1024, 768], [768, 900], [375, 812], [320, 720]]) {
      await page.setViewportSize({width, height}); await page.evaluate(async () => {await document.fonts.ready;});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px page containment`).toBe(true);
      for (const table of await page.locator('main [role="region"][tabindex="0"]').all()) {await table.focus(); await expect(table).toBeFocused(); expect(await table.evaluate((element) => element.clientWidth <= innerWidth)).toBe(true);}
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({path: `artifacts/visual/e1c-007b/after-${english ? 'en' : 'ro'}-${width}.png`, fullPage: true});
      await page.getByRole('button', {name: c.AppShell.notificationLabel, exact: true}).last().click();
      const bell = page.getByRole('dialog', {name: c.NotificationCenter.title});
      await expect(bell.locator('[data-notification-id^="attention:"] time')).toHaveCount(0);
      expect(await bell.evaluate((element) => {const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight;})).toBe(true);
      await page.screenshot({path: `artifacts/visual/e1c-007b/bell-${english ? 'en' : 'ro'}-${width}.png`});
      await page.keyboard.press('Escape'); await expect(bell).toHaveCount(0);
    }
  });
}
