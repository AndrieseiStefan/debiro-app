import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {CompanyDocumentsPage} from '@/features/company-documents/CompanyDocumentsPage';
import {EmployeesComingSoonPage} from '@/features/company-documents/EmployeesComingSoonPage';
import type {CompanyDocumentsState} from '@/features/company-documents/types';
import {readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {readCompanyState, switchActiveCompany} from '@/features/companies/company-state';

vi.mock('@/i18n/navigation', () => ({usePathname: () => '/company/documents', useRouter: () => ({push: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
type Session = {state: CompanyDocumentsState; files: Map<string, Map<string, Blob>>; listeners: Set<() => void>};
const owner = () => Reflect.get(window, Symbol.for('debiro.company-documents-session')) as Session;
const initial = readCompanyDocumentsState();
afterEach(() => {owner().state = initial; owner().files.clear(); switchActiveCompany('demo-company');});
const view = (locale: 'ro' | 'en' = 'ro', employees = false) => render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}>{employees ? <EmployeesComingSoonPage locale={locale}/> : <CompanyDocumentsPage locale={locale}/>}</NextIntlClientProvider>);

describe('Company Documents shared listing UI', () => {
  it.each(['ro', 'en'] as const)('renders derived metrics, truthful disabled files and coming-soon actions in %s', (locale) => {
    const copy = locale === 'ro' ? ro : en;
    view(locale);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(copy.CompanyDocuments.title);
    expect(screen.getByRole('navigation', {name: copy.CompanyDocuments.breadcrumbLabel})).toHaveTextContent(`${copy.AppShell.navigation.company}${copy.CompanyDocuments.title}`);
    const summary = screen.getByRole('region', {name: copy.CompanyDocuments.summaryLabel});
    expect([...summary.querySelectorAll('strong')].map((item) => item.textContent)).toEqual(['5', '4', '0']);
    expect(screen.getAllByRole('checkbox').every((input) => input.hasAttribute('disabled'))).toBe(true);
    const action = screen.getByRole('button', {name: copy.CompanyDocuments.addDocuments});
    expect(action).toHaveAttribute('aria-disabled', 'true'); act(() => action.focus());
    expect(action).toHaveAccessibleDescription(copy.CompanyDocuments.uploadComingSoon);
    fireEvent.click(action); expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(action, {key: 'Escape'});
    const download = screen.getAllByRole('button', {name: /^Descarcă |^Download /})[1];
    fireEvent.click(download); expect(screen.getByRole('tooltip')).toHaveTextContent(copy.CompanyDocuments.fileUnavailable);
  });

  it('combines normalized search and filters and resets a no-result state', () => {
    view();
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: ' ANAF '}});
    fireEvent.change(document.querySelector('#company-document-status')!, {target: {value: 'expiring_soon'}});
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    fireEvent.change(document.querySelector('#company-document-type')!, {target: {value: 'insurance'}});
    expect(screen.getByText(ro.CompanyDocuments.noMatches)).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: ro.CompanyDocuments.resetFilters}));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(7);
  });

  it('preserves eligible selection across pages, supports deselect all, and resets page on filtering', () => {
    const snapshot = structuredClone(initial), workspace = snapshot.byCompany['demo-company'];
    const base = workspace.requirements[0], record = workspace.documents[0];
    workspace.requirements = Array.from({length: 22}, (_, index) => ({...base, id: `req-${index}`, currentDocumentId: `doc-${index}`, name: {ro: `Document ${index}`, en: `Document ${index}`}}));
    workspace.documents = workspace.requirements.map((item, index) => ({...record, id: item.currentDocumentId!, documentName: item.name, issuer: index < 3 ? 'ONRC' : 'Other'}));
    owner().state = snapshot; owner().files.set('demo-company', new Map(workspace.documents.map((doc) => [doc.id, new Blob(['test-only actual bytes'])])));
    view('en');
    fireEvent.click(screen.getByRole('checkbox', {name: en.CompanyDocuments.selectPage})); expect(screen.getByRole('status')).toHaveTextContent('10 selected');
    fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
    expect(screen.getByRole('status')).toHaveTextContent('10 selected');
    fireEvent.click(screen.getByRole('checkbox', {name: en.CompanyDocuments.selectPage})); expect(screen.getByRole('status')).toHaveTextContent('20 selected');
    fireEvent.click(screen.getByRole('button', {name: en.CompanyDocuments.bulkActions}));
    fireEvent.click(screen.getByRole('menuitem', {name: en.CompanyDocuments.deselectAll})); expect(screen.getByRole('status')).toHaveTextContent('0 selected');
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'ONRC'}});
    expect(screen.getByRole('button', {name: 'Page 1'})).toHaveAttribute('aria-current', 'page');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(4);
  });

  it('shows existing error/access states and an empty company without vendor fallback', () => {
    owner().state = {byCompany: {'demo-company': {requirements: [], documents: [null] as unknown as CompanyDocumentsState['byCompany'][string]['documents']}}};
    const rendered = view(); expect(screen.getByRole('alert')).toHaveTextContent(ro.Foundation.errorTitle); expect(screen.queryByRole('table')).toBeNull();
    act(() => {owner().state = {byCompany: {}}; owner().listeners.forEach((notify) => notify());});
    expect(screen.getByText(ro.CompanyDocuments.empty)).toBeVisible();
    const member = readCompanyState().companies[0].members.find((item) => item.isCurrentUser)!;
    const status = member.status; member.status = 'invited';
    try {rendered.rerender(<NextIntlClientProvider locale="ro" messages={ro}><CompanyDocumentsPage locale="ro"/></NextIntlClientProvider>); expect(screen.queryByRole('heading', {level: 1})).toBeNull(); expect(screen.getByText(ro.AppShell.workspaceEmptyTitle)).toBeVisible();} finally {member.status = status;}
  });

  it('renders a localized accessible Employees placeholder, not a feature or fake action', () => {
    view('en', true); expect(screen.getByRole('heading', {level: 1, name: 'Employees'})).toBeVisible();
    expect(screen.getByText(en.CompanyDocuments.employeesComingSoon)).toBeVisible(); expect(screen.queryByRole('table')).toBeNull();
  });
});
