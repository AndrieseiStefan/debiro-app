import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {EmployeeDetailsPage} from '@/features/employees/EmployeeDetailsPage';
import {EmployeeReminderDrawer} from '@/features/employees/EmployeeReminderDrawer';
import * as employees from '@/features/employees/employees-state';
import {readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import type {EmployeeState} from '@/features/employees/types';

vi.mock('@/i18n/navigation', () => ({usePathname: () => '/company/employees/employee%3Aandrei-popescu', useRouter: () => ({push: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
const companyId = 'demo-company', employeeId = 'employee:andrei-popescu';
const initial = employees.readEmployeeState(), companies = readCompanyState();
const owner = () => Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState; listeners: Set<() => void>};
const companyOwner = () => Reflect.get(window, Symbol.for('debiro.company-session')) as {state: typeof companies; listeners: Set<() => void>};
beforeEach(() => {owner().state = structuredClone(initial); companyOwner().state = structuredClone(companies);});
afterEach(() => {owner().state = initial; companyOwner().state = companies; vi.restoreAllMocks();});
const page = (locale: 'ro' | 'en' = 'en', id = employeeId) => <NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}><EmployeeDetailsPage locale={locale} employeeId={id}/></NextIntlClientProvider>;

describe('Employee reminder drawer', () => {
  it.each(['ro', 'en'] as const)('validates, previews escaped multiline text, preserves editing and discards on close in %s', async (locale) => {
    const copy = locale === 'ro' ? ro : en; companyOwner().state.companies[0].company.name = 'Actual Workspace'; render(page(locale));
    const trigger = screen.getByRole('button', {name: copy.EmployeeDocuments.sendReminder}); act(() => trigger.focus()); fireEvent.click(trigger);
    let dialog = screen.getByRole('dialog'); expect(within(dialog).getByText('Andrei Popescu')).toBeVisible(); expect(within(dialog).getByText('andrei.popescu@demo.ro')).toBeVisible();
    const subject = within(dialog).getByLabelText(new RegExp(copy.EmployeeReminder.subject)), message = within(dialog).getByLabelText(new RegExp(`^${copy.EmployeeReminder.message}`));
    expect(subject).toHaveValue(copy.EmployeeReminder.defaultSubject.replace('{company}', 'Actual Workspace')); expect(message).toHaveValue(''); expect(within(dialog).queryByRole('textbox', {name: /email/i})).toBeNull();
    fireEvent.change(subject, {target: {value: '   '}}); fireEvent.change(message, {target: {value: '\n '}}); fireEvent.click(within(dialog).getByRole('button', {name: copy.EmployeeReminder.preview}));
    expect(within(dialog).getAllByRole('alert')).toHaveLength(2); await waitFor(() => expect(subject).toHaveFocus());
    fireEvent.change(subject, {target: {value: '  Custom administrative note  '}}); const text = 'Bună!\n\n<script>alert("not HTML")</script>\nMulțumim.\n'; fireEvent.change(message, {target: {value: text}});
    const before = employees.readEmployeeState(); fireEvent.click(within(dialog).getByRole('button', {name: copy.EmployeeReminder.preview}));
    const preview = within(dialog).getByRole('region', {name: copy.EmployeeReminder.preview}); expect(preview).toHaveTextContent('Custom administrative note'); expect(preview.textContent).toContain(text); expect(preview.querySelector('script')).toBeNull();
    expect(within(preview).getByText('andrei.popescu@demo.ro')).toBeVisible(); expect(within(dialog).queryByRole('textbox')).toBeNull();
    const send = within(dialog).getByRole('button', {name: copy.EmployeeReminder.send}); fireEvent.focus(send); expect(screen.getByRole('tooltip')).toHaveTextContent(copy.EmployeeReminder.sendUnavailable); fireEvent.click(send); expect(employees.readEmployeeState()).toBe(before);
    fireEvent.click(within(dialog).getByRole('button', {name: copy.EmployeeReminder.back})); expect(subject.isConnected).toBe(false); expect(within(dialog).getByLabelText(new RegExp(copy.EmployeeReminder.subject))).toHaveValue('Custom administrative note'); expect(within(dialog).getByLabelText(new RegExp(`^${copy.EmployeeReminder.message}`))).toHaveValue(text);
    fireEvent.click(within(dialog).getByRole('button', {name: copy.DocumentManagement.cancel})); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.click(trigger); dialog = screen.getByRole('dialog'); expect(within(dialog).getByLabelText(new RegExp(`^${copy.EmployeeReminder.message}`))).toHaveValue(''); expect(within(dialog).getByLabelText(new RegExp(copy.EmployeeReminder.subject))).toHaveValue(copy.EmployeeReminder.defaultSubject.replace('{company}', 'Actual Workspace'));
  });

  it('clears draft/context on employee/company changes and independent permission loss', async () => {
    const view = render(page()); const open = () => fireEvent.click(screen.getByRole('button', {name: en.EmployeeDocuments.sendReminder}));
    open(); fireEvent.change(screen.getByLabelText(/^Message/), {target: {value: 'Private draft'}});
    view.rerender(page('en', 'employee:cristina-mihai')); expect(screen.queryByRole('dialog')).toBeNull(); open(); expect(within(screen.getByRole('dialog')).getByText('cristina.mihai@demo.ro')).toBeVisible(); expect(screen.getByLabelText(/^Message/)).toHaveValue('');
    act(() => switchActiveCompany('global-clean-services')); expect(screen.queryByRole('dialog')).toBeNull(); act(() => switchActiveCompany(companyId)); open(); expect(screen.getByLabelText(/^Message/)).toHaveValue('');
    act(() => {companyOwner().state.companies[0].members.find((member) => member.isCurrentUser)!.role = 'viewer'; companyOwner().state = {...companyOwner().state}; companyOwner().listeners.forEach((notify) => notify());}); expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.queryByRole('button', {name: en.EmployeeDocuments.sendReminder})).toBeNull();
    act(() => {companyOwner().state.companies[0].members.find((member) => member.isCurrentUser)!.role = 'administrator'; companyOwner().state = {...companyOwner().state}; companyOwner().listeners.forEach((notify) => notify());}); open(); expect(screen.getByLabelText(/^Message/)).toHaveValue('');
  });

  it.each(['', 'invalid-address'])('shows a defensive recipient warning and existing Edit action for %s without relaxing reads', async (email) => {
    const record = employees.getEmployee(companyId, employeeId)!; vi.spyOn(employees, 'getEmployee').mockReturnValue({...record, email}); const edit = vi.fn(), close = vi.fn();
    render(<NextIntlClientProvider locale="en" messages={en}><EmployeeReminderDrawer companyId={companyId} employeeId={employeeId} onClose={close} onEditEmployee={edit}/></NextIntlClientProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent(en.EmployeeReminder.invalidRecipient); expect(screen.getByRole('textbox', {name: /^Message/})).toBeEnabled(); expect(screen.getByRole('button', {name: en.EmployeeReminder.send})).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', {name: en.Employees.edit})); await waitFor(() => expect(edit).toHaveBeenCalledOnce()); expect(close).toHaveBeenCalledOnce();
  });

  it('fails closed for foreign ownership and unauthorized membership', () => {
    const view = render(<NextIntlClientProvider locale="en" messages={en}><EmployeeReminderDrawer companyId="global-clean-services" employeeId={employeeId} onClose={vi.fn()} onEditEmployee={vi.fn()}/></NextIntlClientProvider>); expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(<NextIntlClientProvider locale="en" messages={en}><EmployeeReminderDrawer companyId={companyId} employeeId="not-owned" onClose={vi.fn()} onEditEmployee={vi.fn()}/></NextIntlClientProvider>); expect(screen.queryByRole('dialog')).toBeNull();
  });
});
