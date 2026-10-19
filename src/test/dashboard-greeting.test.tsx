import {act, render, screen} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {NextIntlClientProvider, createTranslator} from 'next-intl';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {dashboardGreetings, greetingDaypart, greetingFirstName, nextDashboardGreeting} from '@/features/dashboard/greetings';
import {beginDashboardGreetingSession, endDashboardGreetingSession, resolveDashboardGreetingSession, useDashboardGreeting, type DashboardGreetingSelection} from '@/features/dashboard/greeting-session';

const user = vi.hoisted(() => ({profile: {userId: 'user-a', firstName: 'Ștefan', fullName: 'Ștefan Andriesei'} as {userId?: string; firstName?: string; fullName?: string} | null}));
vi.mock('@/features/profile/user-profile-state', () => ({useUserProfile: () => user.profile}));
const key = 'debiro.dashboard-greeting.v1';
const memory = () => Reflect.get(window, Symbol.for('debiro.dashboard-greeting')) as {current: DashboardGreetingSelection | null; resolvedUserId: string | null; previous: Map<string, string>};
beforeEach(() => {sessionStorage.clear(); localStorage.clear(); memory().current = null; memory().resolvedUserId = null; memory().previous.clear(); user.profile = {userId: 'user-a', firstName: 'Ștefan', fullName: 'Ștefan Andriesei'};});
afterEach(() => {vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals();});
const seen: string[] = [];
const pairs: ReturnType<typeof useDashboardGreeting>[] = [];
function Probe() {const greeting = useDashboardGreeting(); seen.push(greeting.title); pairs.push(greeting); return <><h1 aria-hidden={greeting.pending || undefined}>{greeting.title}</h1><p aria-hidden={greeting.pending || undefined}>{greeting.subtitle}</p></>;}
function content(locale: 'ro' | 'en' = 'ro', messages: typeof ro | typeof en = locale === 'ro' ? ro : en) {return <NextIntlClientProvider locale={locale} messages={messages}><Probe/></NextIntlClientProvider>;}

describe('curated Dashboard greetings', () => {
  it('provides at least 24 stable unique IDs with complete, usable RO/EN named and unnamed copy', () => {
    expect(dashboardGreetings.length).toBeGreaterThanOrEqual(24); expect(new Set(dashboardGreetings.map((item) => item.id)).size).toBe(dashboardGreetings.length);
    for (const [locale, messages] of [['ro', ro], ['en', en]] as const) {
      const t = createTranslator({locale, messages, namespace: 'Dashboard'});
      expect(Object.keys(messages.Dashboard.greetings)).toHaveLength(dashboardGreetings.length);
      for (const variant of dashboardGreetings) {
        const named = t(`greetings.${variant.id}.title`, {name: 'named', firstName: 'Ștefan'}), generic = t(`greetings.${variant.id}.title`, {name: 'generic', firstName: ''});
        expect(named).toContain('Ștefan'); expect(generic).not.toMatch(/Ștefan|undefined|null|\{|,\s*!/); expect(generic.trim()).not.toBe('');
        expect(t(`greetings.${variant.id}.subtitle`).length).toBeGreaterThan(10);
      }
    }
  });
  it.each([[4, 'evening'], [5, 'morning'], [11, 'morning'], [12, 'afternoon'], [17, 'afternoon'], [18, 'evening'], [23, 'evening'], [0, 'evening']] as const)('resolves local hour %i to %s', (hour, daypart) => {expect(greetingDaypart(hour)).toBe(daypart);});
  it.each([0, 5, 11, 12, 17, 18, 23])('cycles without repeats and only through eligible variants at hour %i', (hour) => {
    let previous = 'unknown'; const visited = new Set<string>();
    for (let index = 0; index < 60; index++) {
      const next = nextDashboardGreeting(previous, hour), variant = dashboardGreetings.find((item) => item.id === next)!;
      expect(next).not.toBe(previous); if ('daypart' in variant) expect(variant.daypart).toBe(greetingDaypart(hour));
      visited.add(next); previous = next;
    }
    expect(visited.size).toBe(20);
    expect(nextDashboardGreeting('hello', hour, 'welcome_back')).toBe('good_day');
  });
  it('falls back to unrestricted greetings for an invalid clock and resolves names without changing spelling', () => {
    expect(greetingDaypart(NaN)).toBeUndefined(); expect(greetingDaypart(24)).toBeUndefined();
    expect(nextDashboardGreeting('calm_day', NaN)).toBe('hello');
    expect(greetingFirstName({firstName: '  Ștefan Maria  ', fullName: 'Other User'})).toBe('Ștefan Maria');
    expect(greetingFirstName({firstName: ' ', displayName: '  Élodie   Dupont ', fullName: 'Other User'})).toBe('Élodie');
    expect(greetingFirstName({firstName: null, fullName: '  Andrei\tPopescu '})).toBe('Andrei');
    expect(greetingFirstName({firstName: 1, fullName: null})).toBe(''); expect(greetingFirstName(null)).toBe('');
  });
});

describe('presentation-only greeting lifecycle', () => {
  it('selects once, restores after a new JS realm, and never reads the clock again for a valid selection', () => {
    const selected = resolveDashboardGreetingSession('user-a')!;
    expect(selected.variantId).toBe('hello'); expect(resolveDashboardGreetingSession('user-a')).toBe(selected);
    expect(Object.keys(JSON.parse(sessionStorage.getItem(key)!)).sort()).toEqual(['selectionId', 'userId', 'variantId', 'version']);
    expect(localStorage.getItem('debiro.dashboard-greeting.previous:user-a')).toBe('hello');
    memory().current = null; const clock = vi.spyOn(Date.prototype, 'getHours');
    expect(resolveDashboardGreetingSession('user-a')).toEqual(selected); expect(clock).not.toHaveBeenCalled();
  });
  it('rotates after each demo Login and future end/start hook, without changing other storage', () => {
    sessionStorage.setItem('unrelated', 'preserved'); localStorage.setItem('unrelated', 'preserved');
    const first = beginDashboardGreetingSession('user-a')!, second = beginDashboardGreetingSession('user-a')!;
    expect(second.variantId).not.toBe(first.variantId); expect(second.selectionId).not.toBe(first.selectionId);
    endDashboardGreetingSession('other-user'); expect(resolveDashboardGreetingSession('user-a')).toEqual(second);
    endDashboardGreetingSession('user-a'); expect(sessionStorage.getItem(key)).toBeNull(); expect(memory().current).toBeNull();
    memory().previous.clear(); expect(beginDashboardGreetingSession('user-a')!.variantId).not.toBe(second.variantId);
    expect(sessionStorage.getItem('unrelated')).toBe('preserved'); expect(localStorage.getItem('unrelated')).toBe('preserved');
  });
  it('isolates accounts and preserves per-user repeat avoidance on return', () => {
    const a = beginDashboardGreetingSession('user-a')!, b = resolveDashboardGreetingSession('user-b')!;
    expect(b.userId).toBe('user-b'); expect(b.selectionId).not.toBe(a.selectionId);
    expect(resolveDashboardGreetingSession('user-a')!.variantId).not.toBe(a.variantId);
    expect(beginDashboardGreetingSession('')).toBeNull(); expect(resolveDashboardGreetingSession('')).toBeNull();
  });
  it('rejects corrupt/unknown/cross-user storage safely, without deleting business state', () => {
    for (const value of ['not-json', JSON.stringify({version: 99}), JSON.stringify({version: 1, userId: 'user-a', variantId: 'missing', selectionId: 'old'})]) {
      memory().current = null; sessionStorage.setItem(key, value);
      expect(resolveDashboardGreetingSession('user-a')!.userId).toBe('user-a');
    }
    memory().current = null; sessionStorage.setItem(key, JSON.stringify({version: 1, userId: 'foreign-user', variantId: 'morning', selectionId: 'other'}));
    expect(resolveDashboardGreetingSession('user-a')!.userId).toBe('user-a');
  });
  it('keeps a safe in-memory selection when browser storage getters throw', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {throw new Error('blocked');});
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {throw new Error('blocked');});
    const first = resolveDashboardGreetingSession('user-a')!;
    expect(resolveDashboardGreetingSession('user-a')).toBe(first); expect(beginDashboardGreetingSession('user-a')!.variantId).not.toBe(first.variantId);
    endDashboardGreetingSession('user-a'); expect(beginDashboardGreetingSession('user-a')!.variantId).not.toBe(first.variantId);
  });
  it('retains memory when writes exceed quota and never rewinds a newer tab history on end', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {throw new Error('quota');});
    const first = resolveDashboardGreetingSession('user-a')!; expect(resolveDashboardGreetingSession('user-a')).toBe(first);
    expect(beginDashboardGreetingSession('user-a')!.variantId).not.toBe(first.variantId); write.mockRestore();
    localStorage.setItem('debiro.dashboard-greeting.previous:user-a', 'good_day'); endDashboardGreetingSession('user-a');
    expect(localStorage.getItem('debiro.dashboard-greeting.previous:user-a')).toBe('good_day');
  });
  it('ignores a daypart change during the same tab session, but applies the new window on Login', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 19, 8)); localStorage.setItem('debiro.dashboard-greeting.previous:user-a', 'calm_day');
    const morning = beginDashboardGreetingSession('user-a')!; expect(morning.variantId).toBe('morning');
    vi.setSystemTime(new Date(2026, 9, 19, 21)); memory().current = null;
    expect(resolveDashboardGreetingSession('user-a')).toEqual(morning); expect(beginDashboardGreetingSession('user-a')!.variantId).toBe('evening');
  });
});

describe('SSR-safe localized greeting presentation', () => {
  it('does not create presentation state or read the clock when lifecycle hooks run on the server', () => {
    vi.stubGlobal('window', undefined); const clock = vi.spyOn(Date.prototype, 'getHours');
    expect(beginDashboardGreetingSession('user-a')).toBeNull(); expect(resolveDashboardGreetingSession('user-a')).toBeNull();
    expect(endDashboardGreetingSession('user-a')).toBeUndefined(); expect(clock).not.toHaveBeenCalled();
  });
  it('reserves neutral text lines on the server without fallback copy, storage/time access or mutations', () => {
    beginDashboardGreetingSession('user-a'); const before = sessionStorage.getItem(key);
    const storage = vi.spyOn(Storage.prototype, 'getItem'), clock = vi.spyOn(Date.prototype, 'getHours');
    const html = renderToString(content()); expect(html).not.toContain(ro.Dashboard.overview.title); expect(html).not.toContain(ro.Dashboard.overview.description);
    expect(html).toBe('<h1 aria-hidden="true">\u00a0</h1><p aria-hidden="true">\u00a0</p>');
    expect(storage).not.toHaveBeenCalled(); expect(clock).not.toHaveBeenCalled(); storage.mockRestore(); expect(sessionStorage.getItem(key)).toBe(before);
  });
  it.each(['ro', 'en'] as const)('hydrates the stored %s title/subtitle together without rendering fallback copy or rotating', (locale) => {
    const messages = locale === 'ro' ? ro : en;
    const selected = beginDashboardGreetingSession('user-a')!;
    const stored = {...selected, variantId: 'welcome_back'};
    sessionStorage.setItem(key, JSON.stringify(stored)); memory().current = null;
    const container = document.createElement('div'); container.innerHTML = renderToString(content(locale)); document.body.append(container);
    seen.length = 0; pairs.length = 0;
    const errors = vi.spyOn(console, 'error'), clock = vi.spyOn(Date.prototype, 'getHours');
    const view = render(content(locale), {container, hydrate: true});
    expect(screen.getByRole('heading')).toHaveTextContent(locale === 'ro' ? 'Bine ai revenit, Ștefan!' : 'Welcome back, Ștefan!');
    expect(screen.getByText(messages.Dashboard.greetings.welcome_back.subtitle)).toBeVisible();
    expect(pairs[0]).toMatchObject({title: '\u00a0', subtitle: '\u00a0', pending: true});
    for (const pair of pairs) {
      expect(pair.title).not.toBe(messages.Dashboard.overview.title); expect(pair.subtitle).not.toBe(messages.Dashboard.overview.description);
      if (pair.pending) expect([pair.title, pair.subtitle]).toEqual(['\u00a0', '\u00a0']);
      else {expect(pair.title).toContain('Ștefan'); expect(pair.subtitle).toBe(messages.Dashboard.greetings.welcome_back.subtitle);}
    }
    expect(clock).not.toHaveBeenCalled(); expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(stored); expect(errors).not.toHaveBeenCalled();
    view.unmount(); container.remove();
  });
  it('reuses the same variant on rerender/remount/locale changes, with the live profile name', () => {
    const view = render(content()); const selection = JSON.parse(sessionStorage.getItem(key)!);
    expect(screen.getByRole('heading')).toHaveTextContent('Salut, Ștefan!'); view.rerender(content('en'));
    expect(screen.getByRole('heading')).toHaveTextContent('Hey, Ștefan!'); expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(selection);
    user.profile = {...user.profile, firstName: 'Élodie'}; view.rerender(content('en')); expect(screen.getByRole('heading')).toHaveTextContent('Hey, Élodie!');
    view.unmount(); render(content()); expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(selection);
  });
  it('never renders the previous account name during account changes or missing identity', () => {
    const view = render(content()); seen.length = 0;
    user.profile = {userId: 'user-b', firstName: 'Élodie'}; view.rerender(content()); expect(seen.join(' ')).not.toContain('Ștefan');
    expect(screen.getByRole('heading')).toHaveTextContent('Élodie'); seen.length = 0;
    user.profile = null; view.rerender(content()); expect(screen.getByRole('heading')).toHaveTextContent(ro.Dashboard.overview.title); expect(seen.join(' ')).not.toContain('Élodie');
  });
  it('uses a generic greeting for missing names and the established fallback for missing translations', () => {
    user.profile = {userId: 'user-a', firstName: '', fullName: ''}; const view = render(content()); expect(screen.getByRole('heading')).toHaveTextContent('Salut!');
    const messages = structuredClone(ro); Reflect.deleteProperty(messages.Dashboard.greetings, 'hello'); view.rerender(content('ro', messages));
    expect(screen.getByRole('heading')).toHaveTextContent(ro.Dashboard.overview.title); expect(screen.getByText(ro.Dashboard.overview.description)).toBeVisible();
  });
  it('responds to a lifecycle boundary while mounted without changing the profile', () => {
    render(content()); act(() => {beginDashboardGreetingSession('user-a');}); expect(screen.getByRole('heading')).toHaveTextContent('Bine ai revenit, Ștefan!');
    act(() => {endDashboardGreetingSession('user-a');}); expect(screen.getByRole('heading')).toHaveTextContent(ro.Dashboard.overview.title);
  });
});
