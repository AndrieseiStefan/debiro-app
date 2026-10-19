import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {AppSidebar} from '@/components/layout/AppSidebar';
import {SidebarNavigationItem} from '@/components/layout/SidebarNavigationItem';

vi.mock('@/i18n/navigation', () => ({usePathname: () => '/dashboard', useRouter: () => ({push: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
afterEach(() => vi.useRealTimers());
const localized = (children: React.ReactNode, locale: 'ro' | 'en' = 'ro') => <NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}>{children}</NextIntlClientProvider>;

describe('shared sidebar navigation availability', () => {
  it.each(['ro', 'en'] as const)('marks only Reports coming soon in the %s sidebar', (locale) => {
    const copy = locale === 'ro' ? ro : en;
    render(localized(<AppSidebar locale={locale} currentPath="/dashboard" notificationCount={0} notifications={[]} notificationReferenceTime="2026-10-02T12:00:00.000Z"/>, locale));
    const navigation = screen.getByRole('navigation', {name: copy.AppShell.navigationLabel});
    const reports = within(navigation).getByRole('button', {name: copy.AppShell.navigation.reports});
    expect(navigation.querySelectorAll('[aria-disabled="true"]')).toHaveLength(1);
    expect(reports).toHaveAttribute('aria-disabled', 'true'); expect(reports).not.toHaveAttribute('disabled'); expect(reports).not.toHaveAttribute('href');
    expect(within(navigation).queryByRole('link', {name: copy.AppShell.navigation.reports})).toBeNull();
    act(() => reports.focus());
    expect(reports).toHaveFocus(); expect(reports).toHaveAccessibleDescription(copy.AppShell.navigationComingSoon);
    expect(screen.getByRole('tooltip')).toHaveTextContent(copy.AppShell.navigationComingSoon);
    fireEvent.click(reports);
    for (const key of ['Enter', ' ']) expect(fireEvent.keyDown(reports, {key})).toBe(false);
    expect(reports).not.toHaveAttribute('aria-current');
    expect(within(navigation).getByRole('link', {name: 'Dashboard'})).toHaveAttribute('aria-current', 'page');
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    fireEvent.keyDown(reports, {key: 'Escape'});
    expect(screen.queryByRole('tooltip')).toBeNull(); expect(reports).toHaveFocus();
  });

  it.each([false, true])('reuses coming-soon semantics for nested=%s without active styling or a link', (nested) => {
    render(localized(<SidebarNavigationItem href="/future-section" availability="comingSoon" active nested={nested}>Future section</SidebarNavigationItem>));
    const trigger = screen.getByRole('button', {name: 'Future section'});
    expect(trigger).toHaveAttribute('aria-disabled', 'true'); expect(trigger).not.toHaveAttribute('aria-current');
    expect(trigger.className).not.toMatch(/settingsActive|\bactive\b/);
    expect(screen.queryByRole('link')).toBeNull();
    fireEvent.click(trigger); expect(screen.getByRole('tooltip')).toHaveTextContent(ro.AppShell.navigationComingSoon);
    fireEvent.pointerDown(document.body); expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it.each([false, true])('preserves available links and active state for nested=%s', (nested) => {
    render(localized(<SidebarNavigationItem href="/vendors" active nested={nested}>Suppliers</SidebarNavigationItem>));
    const link = screen.getByRole('link', {name: 'Suppliers'});
    expect(link).toHaveAttribute('href', '/vendors'); expect(link).toHaveAttribute('aria-current', 'page'); expect(link).not.toHaveAttribute('aria-disabled');
    fireEvent.pointerEnter(link); expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it.each(['ro', 'en'] as const)('keeps the Company Documents destination label stable and describes its workspace in %s', (locale) => {
    const copy = locale === 'ro' ? ro : en;
    render(localized(<AppSidebar locale={locale} currentPath="/dashboard" notificationCount={0} notifications={[]} notificationReferenceTime="2026-10-02T12:00:00.000Z"/>, locale));
    const navigation = screen.getByRole('navigation', {name: copy.AppShell.navigationLabel});
    const toggle = within(navigation).getByRole('button', {name: copy.AppShell.navigation.company});
    if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle);
    const link = within(navigation).getByRole('link', {name: copy.AppShell.navigation.companyDocuments});
    expect(link).toHaveAttribute('href', '/company/documents'); expect(link).toHaveAccessibleDescription('Demo Company SRL');
    expect(within(link).getByTitle('Demo Company SRL')).toHaveTextContent('Demo Company SRL');
  });

  it('keeps hover help reachable across the trigger/tooltip gap and closes after leaving both', () => {
    vi.useFakeTimers();
    render(localized(<SidebarNavigationItem href="/future-section" availability="comingSoon">Future section</SidebarNavigationItem>));
    const trigger = screen.getByRole('button');
    fireEvent.pointerEnter(trigger); const tooltip = screen.getByRole('tooltip');
    expect(tooltip.parentElement).toBe(document.body);
    fireEvent.pointerLeave(trigger); fireEvent.pointerEnter(tooltip);
    act(() => vi.advanceTimersByTime(150)); expect(tooltip).toBeVisible();
    fireEvent.pointerLeave(tooltip); act(() => vi.advanceTimersByTime(150)); expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keeps the explanation while focused and dismisses it on blur', () => {
    render(localized(<><SidebarNavigationItem href="/future-section" availability="comingSoon">Future section</SidebarNavigationItem><button>Next control</button></>));
    const trigger = screen.getByRole('button', {name: 'Future section'});
    act(() => trigger.focus()); fireEvent.pointerLeave(trigger); expect(screen.getByRole('tooltip')).toBeVisible();
    act(() => screen.getByRole('button', {name: 'Next control'}).focus()); expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
