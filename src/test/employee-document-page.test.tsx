import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {EmployeeDetailsPage} from '@/features/employees/EmployeeDetailsPage';
import {EmployeesPage} from '@/features/employees/EmployeesPage';
import {employeeDocumentEngine} from '@/features/employees/employee-documents';
import {employeeDocumentWorkspace, getEmployeeActivity, readEmployeeState} from '@/features/employees/employees-state';
import {readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {readRequirementsState} from '@/features/requirements/requirements-state';
import type {EmployeeState} from '@/features/employees/types';

vi.mock('@/i18n/navigation', () => ({usePathname: () => '/company/employees/employee%3Aandrei-popescu', useRouter: () => ({push: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
const companyId = 'demo-company', employeeId = 'employee:andrei-popescu';
const initial = readEmployeeState(), initialCompanies = readCompanyState(), initialTemplates = readRequirementsState();
const owner = () => Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState; listeners: Set<() => void>; files?: Map<string, Map<string, Map<string, Blob>>>};
const companyOwner = () => Reflect.get(window, Symbol.for('debiro.company-session')) as {state: typeof initialCompanies; listeners: Set<() => void>};
const templateOwner = () => Reflect.get(window, Symbol.for('debiro.requirements-session')) as {state: typeof initialTemplates};
beforeEach(() => {owner().state = structuredClone(initial); owner().files = new Map(); companyOwner().state = structuredClone(initialCompanies); templateOwner().state = structuredClone(initialTemplates);});
afterEach(() => {owner().state = initial; owner().files = new Map(); companyOwner().state = initialCompanies; templateOwner().state = initialTemplates; vi.restoreAllMocks();});
const view = (locale: 'ro' | 'en' = 'en', list = false) => render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}>{list ? <EmployeesPage locale={locale}/> : <EmployeeDetailsPage locale={locale} employeeId={employeeId}/>}</NextIntlClientProvider>);

describe('Employee Details shared document UI', () => {
  it.each(['ro', 'en'] as const)('has truthful empty status, no fixture activity, accessible tabs and no obsolete drawer notice in %s', async (locale) => {
    const copy = locale === 'ro' ? ro : en; view(locale);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(copy.EmployeeDocuments.title); expect(screen.getByRole('heading', {level: 2, name: 'Andrei Popescu'})).toBeVisible();
    expect(screen.getByRole('region', {name: copy.EmployeeDocuments.summaryLabel}).querySelectorAll('strong')).toHaveLength(4);
    expect([...screen.getByRole('region', {name: copy.EmployeeDocuments.summaryLabel}).querySelectorAll('strong')].map((item) => item.textContent)).toEqual(['0', '0', '0', '0']);
    expect(screen.getByText(copy.EmployeeDocuments.empty)).toBeVisible();
    const documents = screen.getByRole('tab', {name: copy.EmployeeDocuments.documents}), activity = screen.getByRole('tab', {name: copy.EmployeeDocuments.activity});
    fireEvent.keyDown(documents, {key: 'ArrowRight'}); expect(activity).toHaveFocus(); expect(activity).toHaveAttribute('aria-selected', 'true'); expect(screen.getByText(copy.EmployeeDocuments.noActivity)).toBeVisible();
    fireEvent.click(documents); const edit = screen.getByRole('button', {name: copy.Employees.edit}); act(() => edit.focus()); fireEvent.click(edit);
    expect(within(screen.getByRole('dialog')).queryByRole('note')).toBeNull(); fireEvent.keyDown(document, {key: 'Escape'}); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); await waitFor(() => expect(edit).toHaveFocus());
  });

  it('uses the scoped picker/preview/source colors and existing upload, review, replacement, history and metadata forms', async () => {
    const base = templateOwner().state.byCompany[companyId].templates[0];
    templateOwner().state.byCompany[companyId].templates.push({...base, id: 'employee-file', scope: 'employee', categoryId: null, title: {ro: 'Dosar standard', en: 'Standard file'}, accentToken: 'violet', documents: [{id: 'employee-rule', templateId: 'employee-file', catalogDocumentTypeId: 'safety', required: true, expiryWarningDays: 30, validityMonths: 12}]});
    view(); fireEvent.click(screen.getAllByRole('button', {name: en.VendorTemplates.title})[0]); let dialog = screen.getByRole('dialog');
    expect(dialog.querySelectorAll('#company-template option')).toHaveLength(2); fireEvent.change(dialog.querySelector('#company-template')!, {target: {value: 'employee-file'}});
    expect(within(dialog).getByText(/Occupational safety declaration/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentManagement.applyTemplate})); fireEvent.click(within(dialog).getByRole('button', {name: en.DocumentManagement.cancel})); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    let row = screen.getByRole('row', {name: /Occupational safety declaration/}); expect(row).toHaveAttribute('data-template-accent', 'violet'); expect(row).toHaveTextContent('Template: Standard file');
    fireEvent.click(within(row).getByRole('button', {name: en.CompanyDocuments.upload})); dialog = screen.getByRole('dialog'); expect(dialog.querySelector('#company-upload-name')).toHaveAttribute('readonly'); expect(dialog.querySelector('#company-upload-type')).toHaveAttribute('readonly');
    fireEvent.change(dialog.querySelector('input[type=file]')!, {target: {files: [new File(['actual test file'], 'safety.pdf', {type: 'application/pdf'})]}}); fireEvent.click(within(dialog).getByRole('button', {name: en.AddDocument.submit})); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const requirement = employeeDocumentWorkspace(companyId, employeeId)!.requirements[0]; expect(employeeDocumentWorkspace(companyId, employeeId)!.requirements).toHaveLength(1);
    row = screen.getByRole('row', {name: /Occupational safety declaration/}); expect(row).toHaveTextContent(en.CompanyDocuments.status.needs_review);
    fireEvent.click(within(row).getByRole('button', {name: 'Occupational safety declaration'})); dialog = screen.getByRole('dialog'); expect(within(dialog).getByText('Template: Standard file')).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentManagement.confirm})); expect(within(dialog).getByText(en.CompanyDocumentManagement.success.approved)).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentManagement.replaceTitle})); dialog = screen.getByRole('dialog'); fireEvent.change(dialog.querySelector('input[type=file]')!, {target: {files: [new File(['second file'], 'safety-new.pdf', {type: 'application/pdf'})]}}); fireEvent.click(within(dialog).getByRole('button', {name: en.AddDocument.submit})); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(employeeDocumentEngine(companyId, employeeId).companyDocumentHistory(companyId, requirement.id)).toHaveLength(2);
    fireEvent.click(screen.getByRole('tab', {name: en.EmployeeDocuments.activity})); expect(screen.getAllByText(en.EmployeeDocuments.events.document_upload)).toHaveLength(1); expect(screen.getByText(en.EmployeeDocuments.events.document_replaced)).toBeVisible();
  });

  it('restricts private metadata/files/activity, unmounts stale drawers on permission loss, and preserves basic profile access', () => {
    const engine = employeeDocumentEngine(companyId, employeeId); engine.addCompanyDocument(companyId, {name: 'Private personnel name', documentType: 'custom', issuer: '', expiresAt: '', file: new File(['private'], 'private.pdf', {type: 'application/pdf'})});
    view(); fireEvent.click(screen.getByRole('button', {name: en.EmployeeDocuments.add})); expect(screen.getByRole('dialog')).toBeVisible();
    act(() => {companyOwner().state.companies[0].members.find((member) => member.isCurrentUser)!.role = 'reviewer'; companyOwner().state = {...companyOwner().state}; companyOwner().listeners.forEach((notify) => notify());});
    expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.getByText(en.EmployeeDocuments.restrictedDescription)).toBeVisible(); expect(screen.queryByText('Private personnel name')).toBeNull(); expect(screen.queryByRole('tab')).toBeNull(); expect(screen.queryByRole('region', {name: en.EmployeeDocuments.summaryLabel})).toBeNull(); expect(screen.getByText('andrei.popescu@demo.ro')).toBeVisible();
  });

  it('activates list progress/current dates/attention rollups, excludes inactive employees, and keeps document bytes when editing', () => {
    const engine = employeeDocumentEngine(companyId, employeeId), value = engine.addCompanyDocument(companyId, {name: 'Active requirement', documentType: 'custom', issuer: '', expiresAt: '01.11.2026', required: true, file: new File(['actual'], 'active.pdf', {type: 'application/pdf'})}); if (!value.ok) throw new Error(value.reason);
    engine.reviewCompanyDocument(companyId, value.requirementId, value.document.id, 'approved'); view('en', true);
    expect(screen.getByRole('row', {name: /Andrei Popescu/})).toHaveTextContent('1/1 documents'); expect(screen.getByRole('row', {name: /Andrei Popescu/})).toHaveTextContent(en.EmployeeDocuments.tracking.attention);
    const summary = screen.getByRole('region', {name: en.Employees.summaryLabel}); expect([...summary.querySelectorAll('strong')].map((item) => item.textContent)).toEqual(['8', '1', '1']);
    fireEvent.click(screen.getByRole('button', {name: 'Actions for Andrei Popescu'})); fireEvent.click(screen.getByRole('menuitem', {name: en.Employees.markInactive}));
    expect([...summary.querySelectorAll('strong')].map((item) => item.textContent)).toEqual(['8', '0', '0']); expect(employeeDocumentWorkspace(companyId, employeeId)!.documents).toHaveLength(1);
    expect(getEmployeeActivity(companyId, employeeId).some((event) => event.type === 'employee_edited')).toBe(true);
    act(() => switchActiveCompany('global-clean-services')); expect(screen.getByText(en.Employees.empty)).toBeVisible();
  });

  it.each((['ro', 'en'] as const).flatMap((locale) => (['empty', 'configured', 'uploaded'] as const).map((state) => [locale, state] as const)))('always opens reminder composition from the document toolbar in %s/%s', async (locale, state) => {
    const copy = locale === 'ro' ? ro : en, engine = employeeDocumentEngine(companyId, employeeId);
    if (state === 'configured') {
      const base = templateOwner().state.byCompany[companyId].templates[0];
      templateOwner().state.byCompany[companyId].templates.push({...base, id: 'reminder-template', scope: 'employee', categoryId: null, documents: [{id: 'reminder-rule', templateId: 'reminder-template', catalogDocumentTypeId: 'safety', required: true, expiryWarningDays: 30, validityMonths: 12}]});
      expect(engine.applyCompanyTemplate(companyId, 'reminder-template')).toEqual({ok: true, added: 1});
    } else if (state === 'uploaded') {
      expect(engine.addCompanyDocument(companyId, {name: 'Reminder proof', documentType: 'custom', issuer: '', expiresAt: '', file: new File(['synthetic proof'], 'proof.pdf', {type: 'application/pdf'})}).ok).toBe(true);
    }
    view(locale); const before = readEmployeeState(), activity = getEmployeeActivity(companyId, employeeId);
    const download = screen.getByRole('button', {name: copy.CompanyDocuments.downloadSelected}), reminder = screen.getByRole('button', {name: copy.EmployeeDocuments.sendReminder});
    expect(download).toHaveAttribute('aria-disabled', 'true'); expect(download.nextElementSibling).toBe(reminder); expect(reminder).not.toHaveAttribute('aria-disabled');
    expect(reminder).toBeVisible(); expect(reminder).not.toBeDisabled(); expect(reminder.nextElementSibling).toBe(screen.getAllByRole('button', {name: copy.VendorTemplates.title})[0]);
    expect(screen.getByRole('checkbox', {name: copy.CompanyDocuments.selectPage}).hasAttribute('disabled')).toBe(state === 'empty');
    fireEvent.click(reminder); const dialog = screen.getByRole('dialog', {name: copy.EmployeeDocuments.sendReminder});
    expect(within(dialog).getByText('andrei.popescu@demo.ro')).toBeVisible(); expect(within(dialog).getByLabelText(copy.EmployeeReminder.message, {exact: false})).toHaveValue('');
    const send = within(dialog).getByRole('button', {name: copy.EmployeeReminder.send}); expect(send).toHaveAttribute('aria-disabled', 'true');
    fireEvent.focus(send); expect(screen.getByRole('tooltip')).toHaveTextContent(copy.EmployeeReminder.sendUnavailable); fireEvent.click(send);
    expect(readEmployeeState()).toBe(before); expect(getEmployeeActivity(companyId, employeeId)).toEqual(activity);
    expect(screen.queryByRole('status', {name: /sent|trimis/i})).toBeNull();
    fireEvent.keyDown(document, {key: 'Escape'}); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('filters the directory by existing tracking projections without exposing the filter or document data to ordinary members', () => {
    employeeDocumentEngine(companyId, employeeId).addCompanyDocument(companyId, {name: 'Needs internal review', documentType: 'custom', required: true, issuer: '', expiresAt: '', file: new File(['synthetic'], 'proof.pdf', {type: 'application/pdf'})});
    view('en', true); fireEvent.click(screen.getByRole('button', {name: en.DataFilters.trigger}));
    fireEvent.change(screen.getByRole('combobox', {name: en.EmployeeDocuments.trackingLabel}), {target: {value: 'attention'}}); expect(screen.getAllByRole('row')).toHaveLength(2); expect(screen.getByRole('row', {name: /Andrei Popescu/})).toBeVisible();
    act(() => {companyOwner().state.companies[0].members.find((member) => member.isCurrentUser)!.role = 'viewer'; companyOwner().state = {...companyOwner().state}; companyOwner().listeners.forEach((notify) => notify());});
    expect(screen.queryByRole('combobox', {name: en.EmployeeDocuments.trackingLabel})).toBeNull(); expect(screen.getAllByRole('row')).toHaveLength(9); expect(screen.queryByText('Needs internal review')).toBeNull();
  });
});
