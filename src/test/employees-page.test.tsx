import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {EmployeesPage} from '@/features/employees/EmployeesPage';
import {EmployeeDetailsPage} from '@/features/employees/EmployeeDetailsPage';
import {employeeWorkspace, readEmployeeState} from '@/features/employees/employees-state';
import {readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import type {EmployeeState} from '@/features/employees/types';

const push = vi.fn();
vi.mock('@/i18n/navigation', () => ({usePathname: () => '/company/employees', useRouter: () => ({push}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
const initial = readEmployeeState();
const owner = () => Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState; listeners: Set<() => void>};
afterEach(() => {owner().state = initial; switchActiveCompany('demo-company'); vi.restoreAllMocks();});
const view = (locale: 'ro' | 'en' = 'en', employeeId?: string) => render(<NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : ro}>{employeeId ? <EmployeeDetailsPage locale={locale} employeeId={employeeId}/> : <EmployeesPage locale={locale}/>}</NextIntlClientProvider>);
function fill(dialog: HTMLElement, email = 'ana@example.test') {
  for (const [field, value] of Object.entries({firstName: 'Ana', lastName: 'Marinescu', email, phone: '+44 20 1234', jobTitle: 'New free-text title', hireDate: '28.02.2026'})) fireEvent.change(dialog.querySelector(`#employee-${field}`)!, {target: {value}});
}

describe('Employees shared list/drawer UI', () => {
  it.each(['ro', 'en'] as const)('renders localized shared list controls and truthful employee/document states in %s', (locale) => {
    const copy = locale === 'ro' ? ro : en; view(locale);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(copy.Employees.title);
    expect(screen.getByRole('navigation', {name: copy.Employees.breadcrumbLabel})).toHaveTextContent(`${copy.AppShell.navigation.company}${copy.Employees.title}`);
    const summary = screen.getByRole('region', {name: copy.Employees.summaryLabel}); expect([...summary.querySelectorAll('strong')].map((item) => item.textContent)).toEqual(['8', '—', '—']);
    expect(within(screen.getByRole('table')).getAllByText(copy.Employees.notConfigured)).toHaveLength(8);
    expect(screen.getByRole('row', {name: /Marius Radu/})).toHaveTextContent(copy.Employees.inactive);
    const download = screen.getByRole('button', {name: copy.Employees.download}); expect(download).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(download); expect(screen.getByRole('tooltip')).toHaveTextContent(copy.Employees.bulkUnavailable); expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(/6\/7|5\/6/)).toBeNull();
  });

  it('retains failed values, creates a department only on valid save, supports keyboard suggestions, and closes/restores focus', async () => {
    view(); const add = screen.getByRole('button', {name: en.Employees.add}); act(() => add.focus()); fireEvent.click(add);
    const dialog = screen.getByRole('dialog'); expect(document.body.style.overflow).toBe('hidden'); fill(dialog, 'not-an-email');
    const job = dialog.querySelector('#employee-jobTitle')!; fireEvent.change(job, {target: {value: 'cont'}}); fireEvent.focus(job); fireEvent.keyDown(job, {key: 'ArrowDown'}); fireEvent.keyDown(job, {key: 'Enter'}); expect(job).toHaveValue('Contabil');
    const department = dialog.querySelector('#employee-department')!; fireEvent.change(department, {target: {value: 'Production'}}); fireEvent.keyDown(department, {key: 'ArrowDown'}); fireEvent.keyDown(department, {key: 'ArrowDown'}); fireEvent.keyDown(department, {key: 'Enter'});
    expect(within(dialog).getByText(en.Employees.departmentPending)).toBeVisible();
    const submit = within(dialog).getByRole('button', {name: en.Employees.add}); fireEvent.click(submit);
    expect(dialog.querySelector('#employee-email')).toHaveValue('not-an-email'); expect(within(dialog).getByText(en.Employees.errors.email)).toBeVisible();
    expect(employeeWorkspace('demo-company').departments.some((item) => item.name === 'Production')).toBe(false);
    fireEvent.change(dialog.querySelector('#employee-email')!, {target: {value: 'ana@example.test'}}); fireEvent.click(submit); fireEvent.click(submit);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(add).toHaveFocus(); expect(document.body.style.overflow).toBe('');
    expect(employeeWorkspace('demo-company').employees.filter((item) => item.email === 'ana@example.test')).toHaveLength(1);
    expect(screen.getByRole('row', {name: /Ana Marinescu/})).toHaveTextContent('Production'); expect(screen.getByText(en.Employees.success.added)).toBeVisible();
  });

  it('prepopulates edit, rejects duplicate email, clears optional department and updates status in the same record', async () => {
    view(); const original = initial.byCompany['demo-company'].employees[0];
    fireEvent.click(screen.getByRole('button', {name: 'Actions for Andrei Popescu'})); fireEvent.click(screen.getByRole('menuitem', {name: en.Employees.edit}));
    const dialog = screen.getByRole('dialog'); expect(dialog.querySelector('#employee-firstName')).toHaveValue('Andrei'); expect(dialog.querySelector('#employee-hireDate')).toHaveValue('10.03.2025');
    fireEvent.change(dialog.querySelector('#employee-email')!, {target: {value: initial.byCompany['demo-company'].employees[1].email.toUpperCase()}});
    fireEvent.click(within(dialog).getByRole('button', {name: en.Employees.save})); expect(within(dialog).getByText(en.Employees.errors.duplicateEmail)).toBeVisible();
    fireEvent.change(dialog.querySelector('#employee-email')!, {target: {value: original.email}});
    const department = dialog.querySelector('#employee-department')!; fireEvent.focus(department); fireEvent.keyDown(department, {key: 'ArrowDown'}); fireEvent.keyDown(department, {key: 'Enter'});
    fireEvent.change(dialog.querySelector('#employee-status')!, {target: {value: 'inactive'}}); fireEvent.click(within(dialog).getByRole('button', {name: en.Employees.save}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(employeeWorkspace('demo-company').employees.find((item) => item.id === original.id)).toMatchObject({id: original.id, createdAt: original.createdAt, departmentId: null, employmentStatus: 'inactive'});
    fireEvent.click(screen.getByRole('button', {name: 'Actions for Andrei Popescu'})); fireEvent.click(screen.getByRole('menuitem', {name: en.Employees.markActive})); expect(screen.getByRole('row', {name: /Andrei Popescu/})).toHaveTextContent('Active');
  });

  it('does not consume Escape when free-text job title has no suggestion popup', async () => {
    view(); fireEvent.click(screen.getByRole('button', {name: en.Employees.add})); const dialog = screen.getByRole('dialog');
    const job = dialog.querySelector('#employee-jobTitle')!; fireEvent.change(job, {target: {value: 'A completely new title'}}); fireEvent.focus(job);
    expect(job).toHaveAttribute('aria-expanded', 'false'); expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyDown(job, {key: 'Escape'}); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('composes filters/sort, preserves page selection across pagination, supports deselect/reset and no matches', () => {
    const state = structuredClone(initial), base = state.byCompany['demo-company'].employees[0];
    state.byCompany['demo-company'].employees = Array.from({length: 22}, (_, index) => ({...base, id: `employee-${index}`, firstName: `Person ${String(index).padStart(2, '0')}`, email: `person${index}@example.test`})); owner().state = state; view();
    fireEvent.click(screen.getByRole('checkbox', {name: en.Employees.selectPage})); expect(screen.getByRole('status')).toHaveTextContent('10 selected');
    fireEvent.click(screen.getByRole('button', {name: 'Next page'})); fireEvent.click(screen.getByRole('checkbox', {name: en.Employees.selectPageHeader})); expect(screen.getByRole('status')).toHaveTextContent('20 selected');
    fireEvent.click(screen.getByRole('button', {name: en.Employees.bulkActions})); fireEvent.click(screen.getByRole('menuitem', {name: en.Employees.deselectAll})); expect(screen.getByRole('status')).toHaveTextContent('0 selected');
    fireEvent.click(screen.getByRole('button', {name: en.Employees.table.name})); expect(screen.getAllByRole('row')[1]).toHaveTextContent('Person 21');
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'person 03'}}); expect(screen.getAllByRole('row')).toHaveLength(2);
    fireEvent.change(document.querySelector('#employee-status-filter')!, {target: {value: 'inactive'}}); expect(screen.getByText(en.Employees.noMatches)).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: en.Employees.resetFilters})); expect(screen.getByRole('searchbox')).toHaveValue(''); expect(screen.getAllByRole('row')).toHaveLength(11);
  });

  it('shows recoverable save errors without losing fields, handles malformed state, and clears drawer/selection across companies', async () => {
    view(); fireEvent.click(screen.getByRole('checkbox', {name: en.Employees.selectPage})); fireEvent.click(screen.getByRole('button', {name: en.Employees.add}));
    const dialog = screen.getByRole('dialog'); fill(dialog);
    vi.spyOn(crypto, 'randomUUID').mockImplementationOnce(() => {throw new Error('unavailable');});
    fireEvent.click(within(dialog).getByRole('button', {name: en.Employees.add})); expect(within(dialog).getByRole('alert')).toHaveTextContent(en.Employees.errors.save); expect(dialog.querySelector('#employee-firstName')).toHaveValue('Ana');
    act(() => {switchActiveCompany('global-clean-services');}); expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.getByText(en.Employees.empty)).toBeVisible(); expect(screen.queryByRole('button', {name: en.Employees.add})).toBeNull();
    act(() => {switchActiveCompany('demo-company');}); expect(screen.getByRole('status')).toHaveTextContent('0 selected'); expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {owner().state = {byCompany: {'demo-company': {employees: [null] as unknown as EmployeeState['byCompany'][string]['employees'], departments: []}}}; owner().listeners.forEach((notify) => notify());});
    expect(screen.getByRole('alert')).toHaveTextContent(en.Employees.errors.unavailable); expect(screen.queryByRole('table')).toBeNull();
  });

  it('provides minimal owned details and does not reveal invalid/foreign records', () => {
    const rendered = view('en', initial.byCompany['demo-company'].employees[0].id); expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Andrei Popescu'); expect(screen.getByText(en.Employees.documentsDeferred)).toBeVisible();
    act(() => {switchActiveCompany('global-clean-services');}); expect(screen.getByRole('alert')).toHaveTextContent(en.Employees.employeeUnavailable); expect(screen.queryByText('andrei.popescu@demo.ro')).toBeNull();
    rendered.unmount(); view('en', 'invalid-id'); expect(screen.getByRole('link', {name: en.Employees.back})).toHaveAttribute('href', '/company/employees');
    const member = readCompanyState().companies[1].members[0]; const status = member.status; member.status = 'invited';
    try {expect(employeeWorkspace('global-clean-services').employees).toEqual([]);} finally {member.status = status;}
  });

  it('keeps personnel readable but removes management affordances for non-administrator membership', () => {
    const member = readCompanyState().companies[0].members.find((item) => item.isCurrentUser)!, role = member.role;
    member.role = 'viewer';
    try {view(); expect(screen.getByRole('table')).toBeVisible(); expect(screen.queryByRole('button', {name: en.Employees.add})).toBeNull(); expect(screen.queryByRole('button', {name: 'Actions for Andrei Popescu'})).toBeNull(); expect(screen.getByRole('link', {name: 'Andrei Popescu'})).toBeVisible();}
    finally {member.role = role;}
  });
});
