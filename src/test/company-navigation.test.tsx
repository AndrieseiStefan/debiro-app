import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {AppSidebar} from '@/components/layout/AppSidebar';

const route = vi.hoisted(() => ({path: '/company/documents'}));
vi.mock('@/i18n/navigation', () => ({usePathname: () => route.path, useRouter: () => ({push: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));

describe('additive Company navigation group', () => {
  it.each(['ro', 'en'] as const)('%s separates Company expansion, route ownership and Company Settings', (locale) => {
    const copy = locale === 'ro' ? ro : en;
    route.path = `${locale === 'en' ? '/en' : ''}/company/documents`;
    const view = () => <NextIntlClientProvider locale={locale} messages={copy}><AppSidebar locale={locale} currentPath="/company/documents" notificationCount={0} notifications={[]} notificationReferenceTime="2026-10-02T12:00:00Z"/></NextIntlClientProvider>;
    const rendered = render(view());
    const nav = screen.getByRole('navigation', {name: copy.AppShell.navigationLabel});
    const group = within(nav).getByRole('button', {name: copy.AppShell.navigation.company});
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getByRole('link', {name: copy.AppShell.navigation.companyDocuments})).toHaveAttribute('aria-current', 'page');
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    fireEvent.click(group); expect(group).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(group); expect(group).toHaveAttribute('aria-expanded', 'true');
    route.path = '/documents'; rendered.rerender(view());
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getByRole('link', {name: copy.AppShell.navigation.documents})).toHaveAttribute('aria-current', 'page');
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    const settings = within(nav).getByRole('button', {name: copy.AppShell.navigation.settings});
    fireEvent.click(settings); expect(group).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(group); expect(group).toHaveAttribute('aria-expanded', 'false');
    route.path = '/company/employees'; rendered.rerender(view());
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getByRole('link', {name: copy.AppShell.navigation.employees})).toHaveAttribute('aria-current', 'page');
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    const order = [...nav.children].map((item) => item.textContent);
    expect(order[0]).toBe('Dashboard'); expect(order[1]).toBe(copy.AppShell.navigation.suppliers); expect(order[2]).toBe(copy.AppShell.navigation.documents);
    expect(order[3]).toContain(copy.AppShell.navigation.companyDocuments); expect(order[4]).toBe(copy.AppShell.navigation.requirements);
  });
});
