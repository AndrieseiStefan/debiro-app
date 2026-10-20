import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {GlobalSearch} from '@/features/global-search/GlobalSearch';
import {readWorkspaceSearchData} from '@/features/global-search/search-workspace';
import {employeeDocumentEngine} from '@/features/employees/employee-documents';

vi.mock('@/i18n/navigation', () => ({useRouter: () => ({push: vi.fn()}), Link: ({href, onClick, ...props}: React.ComponentProps<'a'>) => <a href={href} {...props} onClick={(event) => {onClick?.(event); event.preventDefault();}}/>}));
const original = structuredClone(readWorkspaceSearchData()), owner = (name: string) => Reflect.get(window, Symbol.for(name));
beforeEach(() => {
  owner('debiro.company-session').state = structuredClone(original.companies);
  owner('debiro.employees-session').state = structuredClone(original.employees); owner('debiro.employees-session').files = new Map();
  owner('debiro.company-documents-session').state = structuredClone(original.companyDocuments);
  Element.prototype.scrollIntoView = vi.fn();
  expect(employeeDocumentEngine('demo-company', 'employee:andrei-popescu').addCompanyDocument('demo-company', {name: 'Private Personnel Search', documentType: 'custom', issuer: 'Authority Search', expiresAt: '', file: new File(['test'], 'personnel-search.pdf', {type: 'application/pdf'})}).ok).toBe(true);
});

describe.each(['ro', 'en'] as const)('%s all-domain search presentation', (locale) => {
  const c = locale === 'ro' ? ro : en;
  function page() {return render(<NextIntlClientProvider locale={locale} messages={c}><GlobalSearch locale={locale} currentPath="/dashboard"/></NextIntlClientProvider>);}
  it('reuses groups, counts and arrow selection across all six domains without empty headers', () => {
    page(); const input = screen.getByRole('combobox'); fireEvent.change(input, {target: {value: 'a'}});
    const panel = document.querySelector('[data-global-search-panel]')!;
    expect(within(panel as HTMLElement).getAllByRole('group')).toHaveLength(6);
    for (const label of Object.values(c.GlobalSearch.groups)) expect(within(panel as HTMLElement).getByRole('heading', {name: new RegExp(`^${label}`)})).toBeVisible();
    fireEvent.keyDown(input, {key: 'ArrowUp'});
    const last = within(panel as HTMLElement).getAllByRole('option').at(-1)!;
    expect(last).toHaveAttribute('data-search-result', expect.stringMatching(/^employee_document:/)); expect(last).toHaveAttribute('aria-selected', 'true'); expect(input).toHaveAttribute('aria-activedescendant', last.id);
    panel.scrollTop = 120;
    fireEvent.change(input, {target: {value: 'not-a-match'}}); expect(panel.scrollTop).toBe(0); expect(input).not.toHaveAttribute('aria-activedescendant'); expect(within(panel as HTMLElement).queryByRole('group')).toBeNull();
    expect(screen.getByText(c.GlobalSearch.emptyTitle)).toBeVisible();
  });
  it('opens the existing Company Details drawer from a keyboard-selected result and restores search focus', async () => {
    page(); const input = screen.getByRole('combobox'); input.focus(); fireEvent.change(input, {target: {value: 'iso.pdf'}});
    const option = screen.getByRole('option'); expect(option.tagName).toBe('BUTTON'); expect(option).toHaveTextContent('Demo Company SRL');
    fireEvent.keyDown(input, {key: 'ArrowDown'}); fireEvent.keyDown(input, {key: 'Enter'});
    const drawer = screen.getByRole('dialog'); expect(within(drawer).getByRole('heading', {name: c.DocumentManagement.detailsTitle})).toBeVisible();
    expect(document.querySelector('[data-global-search-panel]')).toBeNull();
    fireEvent.keyDown(drawer, {key: 'Escape'});
    await waitFor(() => {expect(screen.queryByRole('dialog')).toBeNull(); expect(input).toHaveFocus(); expect(document.body.style.overflow).not.toBe('hidden');});
    expect(document.querySelector('[data-global-search-panel]')).toBeNull();
  });
  it('drops restricted personnel results/counts/selection on permission change but keeps public Employee profiles', () => {
    page(); const input = screen.getByRole('combobox'); fireEvent.change(input, {target: {value: 'Authority Search'}}); fireEvent.keyDown(input, {key: 'ArrowDown'});
    expect(screen.getByRole('option')).toHaveTextContent('Private Personnel Search');
    act(() => {const session = owner('debiro.company-session'); session.state = structuredClone(session.state); session.state.companies[0].members.find((member: {isCurrentUser: boolean}) => member.isCurrentUser).role = 'viewer'; session.listeners.forEach((notify: () => void) => notify());});
    expect(document.body).not.toHaveTextContent('Private Personnel Search'); expect(document.querySelector('[data-search-result^="employee_document:"]')).toBeNull(); expect(input).not.toHaveAttribute('aria-activedescendant');
    fireEvent.change(input, {target: {value: 'andrei.popescu@demo.ro'}}); expect(screen.getByRole('option')).toHaveTextContent('Andrei Popescu');
  });
});
