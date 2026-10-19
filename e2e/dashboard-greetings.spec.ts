import {expect, test, type Page} from '@playwright/test';
import {createTranslator} from 'next-intl';
import ro from '../messages/ro.json' with {type: 'json'};
import en from '../messages/en.json' with {type: 'json'};
import type {DashboardGreetingSelection} from '../src/features/dashboard/greeting-session';
import type {UserProfile} from '../src/features/profile/user-profile-state';
import type {readCompanyState} from '../src/features/companies/company-state';
import {switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

const key = 'debiro.dashboard-greeting.v1';
async function selected(page: Page, locale: 'ro' | 'en', firstName = 'Andrei') {
  // An opener can prepopulate storage before hydration replaces its copied selection.
  await expect(page.locator('#dashboard-title')).not.toHaveText((locale === 'ro' ? ro : en).Dashboard.overview.title);
  await expect.poll(() => page.evaluate((key) => sessionStorage.getItem(key), key)).not.toBeNull();
  const selection = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!) as DashboardGreetingSelection, key);
  const t = createTranslator({locale, messages: locale === 'ro' ? ro : en, namespace: 'Dashboard'});
  const title = t(`greetings.${selection.variantId}.title`, {name: firstName ? 'named' : 'generic', firstName}), subtitle = t(`greetings.${selection.variantId}.subtitle`);
  await expect(page.locator('#dashboard-title')).toHaveText(title); await expect(page.locator('#dashboard-title + p')).toHaveText(subtitle);
  return {selection, title, subtitle};
}
async function login(page: Page, locale: 'ro' | 'en') {
  await page.goto((locale === 'en' ? '/en' : '') + '/login');
  await page.locator('#login-email').fill('demo-entry@example.test'); await page.locator('#login-password').fill('demo-only-password');
  await page.getByRole('button', {name: (locale === 'ro' ? ro : en).Login.submit, exact: true}).click();
  await expect(page).toHaveURL((locale === 'en' ? '/en' : '') + '/dashboard'); return selected(page, locale);
}
async function name(page: Page, firstName: string, fullName = `${firstName} Popescu`) {
  await page.evaluate(({firstName, fullName}) => {
    const owner = Reflect.get(window, Symbol.for('debiro.user-profile-session')) as {profile: UserProfile; listeners: Set<() => void>};
    owner.profile = {...owner.profile, firstName, fullName, initials: [firstName, owner.profile.lastName].map((part) => part[0] ?? '').join('').toLocaleUpperCase()}; owner.listeners.forEach((notify) => notify());
  }, {firstName, fullName});
}

for (const locale of ['ro', 'en'] as const) {
  const c = locale === 'ro' ? ro : en, prefix = locale === 'en' ? '/en' : '';
  test(`${locale} direct Dashboard, refresh, navigation, company and locale switches preserve a single greeting`, async ({page}) => {
    const hydration: string[] = []; page.on('pageerror', (error) => hydration.push(error.message)); page.on('console', (message) => {if (/hydration|did not match|server rendered/i.test(message.text())) hydration.push(message.text());});
    const response = await page.goto(prefix + '/dashboard'); expect(response?.status()).toBe(200);
    const first = await selected(page, locale); expect(first.selection.variantId).toBe('hello');
    await page.reload(); expect(await selected(page, locale)).toEqual(first);
    await page.goto(prefix + '/dashboard'); expect(await selected(page, locale)).toEqual(first);
    await workspaceSection(page, 'vendors', locale === 'en'); await workspaceSection(page, 'dashboard', locale === 'en'); expect(await selected(page, locale)).toEqual(first);
    await page.goBack(); await expect(page).toHaveURL(prefix + '/vendors'); await page.goForward(); expect(await selected(page, locale)).toEqual(first);
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Global Clean Services', locale === 'en'); expect(await selected(page, locale)).toEqual(first);
    await page.getByRole('link', {name: locale === 'ro' ? 'EN' : 'RO', exact: true}).filter({visible: true}).click();
    const translated = await selected(page, locale === 'ro' ? 'en' : 'ro'); expect(translated.selection).toEqual(first.selection); expect(translated.title).not.toBe(first.title);
    expect(hydration).toEqual([]);
    const ssr = await page.request.get(prefix + '/dashboard'); expect(await ssr.text()).toContain(c.Dashboard.overview.title);
  });

  test(`${locale} valid demo Login rotates without credential storage; invalid submission and unavailable Logout do not`, async ({page}) => {
    await page.goto(prefix + '/login'); await expect(page.getByRole('button', {name: c.Login.submit, exact: true})).toBeDisabled();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull();
    const first = await login(page, locale); await page.reload(); expect(await selected(page, locale)).toEqual(first);
    await page.getByRole('button', {name: `${c.AppShell.profileLabel}: Andrei Popescu`}).click();
    const logout = page.getByRole('button', {name: c.ProfileMenu.logout, exact: true}); await expect(logout).toHaveAttribute('aria-disabled', 'true');
    await logout.dispatchEvent('click'); expect(await selected(page, locale)).toEqual(first); await expect(page).toHaveURL(prefix + '/dashboard');
    await page.keyboard.press('Escape'); const second = await login(page, locale);
    expect(second.selection.variantId).not.toBe(first.selection.variantId); expect(second.selection.selectionId).not.toBe(first.selection.selectionId);
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([key]);
    const stored = await page.evaluate(() => JSON.stringify([Object.entries(sessionStorage), Object.entries(localStorage)]));
    expect(stored).not.toMatch(/demo-entry|demo-only-password|Andrei Popescu|firstName|fullName|email|token|password/i);
    expect(Object.keys(second.selection).sort()).toEqual(['selectionId', 'userId', 'variantId', 'version']);
  });

  test(`${locale} first name, display-name fallback, unnamed greeting and long names use the existing responsive header`, async ({page}) => {
    await page.goto(prefix + '/dashboard'); const original = (await selected(page, locale)).selection;
    await name(page, 'Ștefan'); await selected(page, locale, 'Ștefan');
    await name(page, '', 'Élodie Dupont'); await selected(page, locale, 'Élodie');
    await name(page, '', ''); const generic = await selected(page, locale, ''); expect(generic.title).not.toMatch(/undefined|null|,\s*!/);
    await name(page, 'AlexandruȘtefan'.repeat(12));
    for (const width of [1920, 1448, 1280, 1024, 768, 375, 320]) {
      await page.setViewportSize({width, height: 900}); await page.evaluate(() => document.fonts.ready);
      await selected(page, locale, 'AlexandruȘtefan'.repeat(12));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const header = page.locator('section[aria-labelledby="dashboard-title"]');
      expect(await header.locator('h1').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await expect(header.locator('h1 + p')).toHaveCount(1); await expect(page.locator('[data-dashboard-panel]')).toHaveCount(5);
      await header.screenshot({path: `artifacts/visual/e1c-007a3/header-long-${locale}-${width}.png`});
    }
    expect((await selected(page, locale, 'AlexandruȘtefan'.repeat(12))).selection).toEqual(original);
    await name(page, 'Ștefan');
    for (const width of [1920, 1448, 1280, 1024, 768, 375, 320]) {
      await page.setViewportSize({width, height: 900}); await page.screenshot({path: `artifacts/visual/e1c-007a3/dashboard-${locale}-${width}.png`, fullPage: true});
      await page.locator('section[aria-labelledby="dashboard-title"]').screenshot({path: `artifacts/visual/e1c-007a3/header-${locale}-${width}.png`});
    }
  });

  test(`${locale} localStorage unavailable still preserves the tab selection on refresh`, async ({page}) => {
    await page.addInitScript(() => {Object.defineProperty(window, 'localStorage', {get() {throw new Error('storage unavailable');}});});
    const first = await login(page, locale); await page.reload(); expect(await selected(page, locale)).toEqual(first);
    const next = await login(page, locale); expect(next.selection.variantId).not.toBe(first.selection.variantId);
  });

  test(`${locale} fully blocked storage uses a stable in-memory greeting without breaking navigation or Login`, async ({page}) => {
    await page.addInitScript(() => {for (const key of ['sessionStorage', 'localStorage']) Object.defineProperty(window, key, {get() {throw new Error('blocked storage');}});});
    await page.goto(prefix + '/dashboard'); const title = page.locator('#dashboard-title'); await expect(title).toHaveText(locale === 'ro' ? 'Salut, Andrei!' : 'Hey, Andrei!');
    await workspaceSection(page, 'vendors', locale === 'en'); await workspaceSection(page, 'dashboard', locale === 'en'); await expect(title).toHaveText(locale === 'ro' ? 'Salut, Andrei!' : 'Hey, Andrei!');
    await page.goto(prefix + '/login'); await page.locator('#login-email').fill('demo@example.test'); await page.locator('#login-password').fill('demo-password');
    await page.getByRole('button', {name: c.Login.submit, exact: true}).click(); await expect(title).toContainText('Andrei'); await expect(page.locator('[data-dashboard-panel]')).toHaveCount(5);
  });
}

test('new tabs rotate, including opener-copied storage; each tab then keeps its own selection on refresh', async ({page, context}) => {
  await page.goto('/dashboard'); const first = await selected(page, 'ro');
  const other = await context.newPage(); await other.goto('/dashboard'); const second = await selected(other, 'ro'); expect(second.selection.variantId).not.toBe(first.selection.variantId);
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.evaluate(() => {window.open('/dashboard');})]);
  const third = await selected(popup, 'ro'); expect(third.selection.variantId).not.toBe(second.selection.variantId); expect(third.selection.variantId).not.toBe(first.selection.variantId);
  await popup.reload(); expect(await selected(popup, 'ro')).toEqual(third);
  await page.reload(); expect(await selected(page, 'ro')).toEqual(first); await other.reload(); expect(await selected(other, 'ro')).toEqual(second);
});

test('morning, afternoon and evening selection uses local time only at the new greeting boundary', async ({page}) => {
  for (const [hour, variant] of [[8, 'morning'], [14, 'afternoon'], [21, 'evening']] as const) {
    await page.clock.setFixedTime(new Date(`2026-10-19T${String(hour).padStart(2, '0')}:00:00+03:00`));
    await page.goto('/login'); await page.evaluate(() => localStorage.setItem('debiro.dashboard-greeting.previous:andrei-popescu', 'calm_day'));
    const selection = await login(page, 'en'); expect(selection.selection.variantId).toBe(variant);
    await page.clock.setFixedTime(new Date('2026-10-20T06:00:00+03:00')); await page.reload(); expect(await selected(page, 'en')).toEqual(selection);
  }
});

test('a different profile identity never inherits the previous user name or selected record (E2 adapter seam only)', async ({page}) => {
  await page.goto('/dashboard'); const original = await selected(page, 'ro');
  await page.evaluate(() => {
    const owner = Reflect.get(window, Symbol.for('debiro.user-profile-session')) as {profile: UserProfile; listeners: Set<() => void>};
    const companies = Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>; listeners: Set<() => void>};
    // Test-only authorized identity/membership pair; never changes production auth or access rules.
    owner.profile = {...owner.profile, userId: 'test-only-second-user', firstName: 'Élodie', lastName: 'Dupont', fullName: 'Élodie Dupont', initials: 'ÉD', email: 'second-identity@example.test'};
    companies.state = {...companies.state, companies: companies.state.companies.map((record) => ({...record, members: record.members.map((member) => member.isCurrentUser ? {...member, userId: 'test-only-second-user'} : member)}))};
    owner.listeners.forEach((notify) => notify()); companies.listeners.forEach((notify) => notify());
  });
  await expect.poll(() => page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!)?.userId, key)).toBe('test-only-second-user');
  const next = await selected(page, 'ro', 'Élodie'); expect(next.selection.userId).toBe('test-only-second-user'); expect(next.selection.selectionId).not.toBe(original.selection.selectionId);
  await expect(page.locator('#dashboard-title')).not.toContainText('Andrei');
});
