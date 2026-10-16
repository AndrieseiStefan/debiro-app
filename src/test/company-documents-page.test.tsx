import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {CompanyDocumentsPage} from '@/features/company-documents/CompanyDocumentsPage';
import {EmployeesComingSoonPage} from '@/features/company-documents/EmployeesComingSoonPage';
import type {CompanyDocumentsState} from '@/features/company-documents/types';
import {readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {readRequirementsState} from '@/features/requirements/requirements-state';

vi.mock('@/i18n/navigation', () => ({usePathname: () => '/company/documents', useRouter: () => ({push: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
type Session = {state: CompanyDocumentsState; files: Map<string, Map<string, Blob>>; listeners: Set<() => void>};
const owner = () => Reflect.get(window, Symbol.for('debiro.company-documents-session')) as Session;
const initial = readCompanyDocumentsState();
const initialTemplates = readRequirementsState();
const templateOwner = () => Reflect.get(window, Symbol.for('debiro.requirements-session')) as {state: ReturnType<typeof readRequirementsState>};
afterEach(() => {owner().state = initial; owner().files.clear(); templateOwner().state = initialTemplates; switchActiveCompany('demo-company');});
const view = (locale: 'ro' | 'en' = 'ro', employees = false) => render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}>{employees ? <EmployeesComingSoonPage locale={locale}/> : <CompanyDocumentsPage locale={locale}/>}</NextIntlClientProvider>);

describe('Company Documents shared listing UI', () => {
  it.each(['ro', 'en'] as const)('renders derived metrics, truthful disabled files and coming-soon actions in %s', (locale) => {
    const copy = locale === 'ro' ? ro : en;
    view(locale);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(copy.CompanyDocuments.title);
    const templateAction = screen.getByRole('button', {name: copy.VendorTemplates.title});
    expect(templateAction).toBeVisible(); expect(templateAction).toHaveAttribute('data-size', 'compact');
    expect(templateAction.closest('[aria-labelledby="company-documents-title"]')).toBeNull();
    expect(screen.queryByRole('menuitem', {name: copy.CompanyDocumentManagement.applyTemplate})).toBeNull();
    expect(screen.getByRole('navigation', {name: copy.CompanyDocuments.breadcrumbLabel})).toHaveTextContent(`${copy.AppShell.navigation.company}${copy.CompanyDocuments.title}`);
    const summary = screen.getByRole('region', {name: copy.CompanyDocuments.summaryLabel});
    expect([...summary.querySelectorAll('strong')].map((item) => item.textContent)).toEqual(['5', '4', '0']);
    expect(screen.getAllByRole('checkbox').every((input) => input.hasAttribute('disabled'))).toBe(true);
    const action = screen.getByRole('button', {name: copy.CompanyDocuments.shareDocuments});
    expect(action).toHaveAttribute('aria-disabled', 'true'); act(() => action.focus());
    expect(action).toHaveAccessibleDescription(copy.CompanyDocuments.sharingComingSoon);
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

  it('preserves eligible selection and pagination when applying a template, supports deselect all, and resets page on filtering', async () => {
    const snapshot = structuredClone(initial), workspace = snapshot.byCompany['demo-company'];
    const base = workspace.requirements[0], record = workspace.documents[0];
    workspace.requirements = Array.from({length: 22}, (_, index) => ({...base, id: `req-${index}`, currentDocumentId: `doc-${index}`, name: {ro: `Document ${index}`, en: `Document ${index}`}}));
    workspace.documents = workspace.requirements.map((item, index) => ({...record, id: item.currentDocumentId!, documentName: item.name, issuer: index < 3 ? 'ONRC' : 'Other'}));
    owner().state = snapshot; owner().files.set('demo-company', new Map(workspace.documents.map((doc) => [doc.id, new Blob(['test-only actual bytes'])])));
    const templates = structuredClone(initialTemplates), template = {...templates.byCompany['demo-company'].templates[0], scope: 'company' as const, categoryId: null};
    templates.byCompany['demo-company'].templates.push({...template, id: 'pagination-template', documents: [{id: 'pagination-rule', templateId: 'pagination-template', catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12}]});
    templateOwner().state = templates;
    view('en');
    fireEvent.click(screen.getByRole('checkbox', {name: en.CompanyDocuments.selectPage})); expect(screen.getByRole('status')).toHaveTextContent('10 selected');
    fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
    expect(screen.getByRole('status')).toHaveTextContent('10 selected');
    fireEvent.click(screen.getByRole('checkbox', {name: en.CompanyDocuments.selectPage})); expect(screen.getByRole('status')).toHaveTextContent('20 selected');
    fireEvent.click(screen.getByRole('button', {name: en.VendorTemplates.title}));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(dialog.querySelector('#company-template')!, {target: {value: 'pagination-template'}});
    fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentManagement.applyTemplate}));
    fireEvent.click(within(dialog).getByRole('button', {name: en.DocumentManagement.cancel}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('status')).toHaveTextContent('20 selected');
    expect(screen.getByRole('button', {name: 'Page 2'})).toHaveAttribute('aria-current', 'page');
    expect(owner().state.byCompany['demo-company'].documents).toEqual(workspace.documents);
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

  it('reuses the upload drawer, retains recoverable input, and integrates pending review then rejection history', async () => {
    view('en');
    fireEvent.click(screen.getByRole('button', {name: en.CompanyDocuments.addDocuments}));
    let dialog = screen.getByRole('dialog', {name: en.CompanyDocumentManagement.addTitle});
    expect(within(dialog).getByRole('note')).toHaveTextContent(en.CompanyDocumentManagement.sessionNotice);
    expect(dialog.querySelector('#company-template, #company-upload-requirement, input[type=checkbox]')).toBeNull();
    for (const id of ['name', 'type', 'issuer', 'expires']) expect(dialog.querySelector(`#company-upload-${id}`)).toHaveAttribute('data-size', 'compact');
    expect(within(dialog).queryByText(/standalone|company requirement/i)).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', {name: en.AddDocument.submit}));
    expect(within(dialog).getByText(en.CompanyDocumentManagement.errors.file)).toBeVisible();
    fireEvent.change(within(dialog).getByRole('textbox', {name: en.CompanyDocumentManagement.name}), {target: {value: 'UI company proof'}});
    fireEvent.change(dialog.querySelector('#company-upload-type')!, {target: {value: 'tax'}});
    fireEvent.change(dialog.querySelector('input[type=file]')!, {target: {files: [new File(['bytes'], 'proof.pdf', {type: 'application/pdf'})]}});
    fireEvent.click(within(dialog).getByRole('button', {name: en.AddDocument.submit}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const created = owner().state.byCompany['demo-company'].requirements.at(-1)!;
    expect(created).toMatchObject({companyId: 'demo-company', required: false});
    expect(owner().state.byCompany['demo-company'].documents.find((item) => item.id === created.currentDocumentId)?.requirementId).toBe(created.id);
    fireEvent.click(await screen.findByRole('button', {name: 'UI company proof'}, {timeout: 4000}));
    dialog = screen.getByRole('dialog', {name: en.DocumentManagement.detailsTitle});
    expect(within(dialog).getByText(en.CompanyDocuments.status.needs_review, {exact: true})).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentManagement.reject}));
    const rejection = within(dialog).getByRole('form', {name: en.CompanyDocumentManagement.reject});
    fireEvent.click(within(rejection).getByRole('button')); expect(within(dialog).getByRole('alert')).toHaveTextContent(en.CompanyDocumentManagement.errors.rejectionReason);
    fireEvent.change(within(rejection).getByRole('textbox'), {target: {value: 'Not acceptable'}}); fireEvent.click(within(rejection).getByRole('button'));
    expect(within(dialog).getByText(en.CompanyDocumentManagement.noCurrent)).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', {name: en.DocumentManagement.viewAll}));
    expect(dialog.querySelectorAll('[data-version]')).toHaveLength(1); expect(within(dialog).getByText(/Not acceptable/)).toBeVisible();
  });

  it('rejects a stale configured requirement without silently creating a standalone document', () => {
    view('en');
    const missing = screen.getByRole('row', {name: /Tax clearance record/});
    fireEvent.click(within(missing).getByRole('button', {name: en.CompanyDocuments.upload}));
    const dialog = screen.getByRole('dialog', {name: en.CompanyDocumentManagement.addTitle});
    fireEvent.change(dialog.querySelector('input[type=file]')!, {target: {files: [new File(['bytes'], 'proof.pdf', {type: 'application/pdf'})]}});
    act(() => {const state = structuredClone(initial); state.byCompany['demo-company'].requirements = state.byCompany['demo-company'].requirements.filter((item) => item.id !== 'company-requirement:criminal-record'); owner().state = state; owner().listeners.forEach((notify) => notify());});
    expect(dialog.querySelector('#company-upload-name')).toHaveAttribute('readonly');
    expect(dialog.querySelector('#company-upload-type')).toHaveAttribute('readonly');
    for (const id of ['name', 'type', 'issuer', 'expires']) expect(dialog.querySelector(`#company-upload-${id}`)).toHaveAttribute('data-size', 'compact');
    const before = structuredClone(owner().state);
    fireEvent.click(within(dialog).getByRole('button', {name: en.AddDocument.submit}));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(en.CompanyDocumentManagement.errors.unavailable);
    expect(owner().state).toEqual(before); expect(owner().files.size).toBe(0);
  });

  it.each(['ro', 'en'] as const)('binds a missing-row upload without another requirement or technical selectors in %s', async (locale) => {
    const copy = locale === 'ro' ? ro : en, requirement = initial.byCompany['demo-company'].requirements.find((item) => !item.currentDocumentId)!;
    view(locale);
    fireEvent.click(within(screen.getByRole('row', {name: new RegExp(requirement.name[locale])})).getByRole('button', {name: copy.CompanyDocuments.upload}));
    const dialog = screen.getByRole('dialog', {name: copy.CompanyDocumentManagement.addTitle});
    expect(dialog.querySelector('#company-upload-name')).toHaveValue(requirement.name[locale]);
    expect(dialog.querySelector('#company-upload-name')).toHaveAttribute('readonly');
    expect(dialog.querySelector('#company-upload-type')).toHaveValue(copy.CompanyDocuments.types[requirement.documentType]);
    expect(dialog.querySelector('#company-upload-type')).toHaveAttribute('readonly');
    expect(dialog.querySelector('#company-template, #company-upload-requirement, input[type=checkbox]')).toBeNull();
    fireEvent.change(dialog.querySelector('input[type=file]')!, {target: {files: [new File(['bytes'], 'bound.pdf', {type: 'application/pdf'})]}});
    fireEvent.change(dialog.querySelector('#company-upload-issuer')!, {target: {value: 'Issuer'}});
    fireEvent.click(within(dialog).getByRole('button', {name: copy.AddDocument.submit}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const workspace = owner().state.byCompany['demo-company'];
    expect(workspace.requirements).toHaveLength(initial.byCompany['demo-company'].requirements.length);
    const saved = workspace.requirements.find((item) => item.id === requirement.id)!;
    expect(saved).toEqual({...requirement, currentDocumentId: expect.any(String)});
    expect(workspace.documents.find((item) => item.id === saved.currentDocumentId)).toMatchObject({companyId: 'demo-company', requirementId: requirement.id, issuer: 'Issuer', reviewOutcome: 'pending'});
  });

  it.each(['ro', 'en'] as const)('applies templates separately without files, duplicate requirements or foreign scopes in %s', async (locale) => {
    const copy = locale === 'ro' ? ro : en, state = structuredClone(initialTemplates), base = state.byCompany['demo-company'].templates[0];
    const companyTemplate = {...base, id: 'company-template', scope: 'company' as const, categoryId: null, documents: [{id: 'company-rule', templateId: 'company-template', catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30 as const, validityMonths: 12 as const}]};
    state.byCompany['demo-company'].templates.push(companyTemplate, {...companyTemplate, id: 'employee-template', scope: 'employee'});
    templateOwner().state = state;
    view(locale);
    const trigger = screen.getByRole('button', {name: copy.VendorTemplates.title});
    act(() => trigger.focus());
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', {name: copy.VendorTemplates.title});
    expect(within(dialog).getAllByRole('option').map((item) => item.textContent)).toEqual([copy.CompanyDocumentManagement.chooseTemplate, base.title[locale]]);
    expect(dialog.querySelector('input[type=file], #company-upload-name')).toBeNull();
    const apply = within(dialog).getByRole('button', {name: copy.CompanyDocumentManagement.applyTemplate});
    expect(apply).toBeDisabled();
    fireEvent.change(dialog.querySelector('#company-template')!, {target: {value: companyTemplate.id}});
    fireEvent.click(apply);
    expect(within(dialog).getByRole('status')).toHaveTextContent(copy.CompanyDocumentManagement.templateApplied.replace('{count}', '1'));
    const workspace = owner().state.byCompany['demo-company'];
    expect(workspace.requirements.at(-1)).toMatchObject({templateId: companyTemplate.id, currentDocumentId: null});
    expect(workspace.documents).toEqual(initial.byCompany['demo-company'].documents); expect(owner().files.size).toBe(0);
    fireEvent.click(apply);
    expect(within(dialog).getByRole('status')).toHaveTextContent(copy.CompanyDocumentManagement.templateApplied.replace('{count}', '0'));
    expect(owner().state.byCompany['demo-company']).toEqual(workspace);
    expect(templateOwner().state).toEqual(state);
    fireEvent.click(within(dialog).getByRole('button', {name: copy.DocumentManagement.cancel}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it('shows an honest empty template state without an upload form', () => {
    view('en');
    fireEvent.click(screen.getByRole('button', {name: en.VendorTemplates.title}));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(en.CompanyDocumentManagement.noTemplates)).toBeVisible();
    expect(within(dialog).getByRole('button', {name: en.CompanyDocumentManagement.applyTemplate})).toBeDisabled();
    expect(dialog.querySelector('input[type=file], select')).toBeNull();
    expect(within(dialog).getByRole('link', {name: en.VendorTemplates.openRequirements})).toHaveAttribute('href', '/requirements');
  });

  it('rejects a selected template that becomes cross-scope without changing document data or reporting success', () => {
    const state = structuredClone(initialTemplates), base = state.byCompany['demo-company'].templates[0];
    const template = {...base, scope: 'company' as const, categoryId: null};
    state.byCompany['demo-company'].templates = [template]; templateOwner().state = state;
    view('en'); fireEvent.click(screen.getByRole('button', {name: en.VendorTemplates.title}));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(dialog.querySelector('#company-template')!, {target: {value: template.id}});
    templateOwner().state = {...state, byCompany: {...state.byCompany, 'demo-company': {...state.byCompany['demo-company'], templates: [{...template, scope: 'employee'}]}}};
    const before = structuredClone(owner().state);
    fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentManagement.applyTemplate}));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(en.CompanyDocumentManagement.errors.unavailable);
    expect(within(dialog).queryByRole('status')).toBeNull(); expect(owner().state).toEqual(before); expect(owner().files.size).toBe(0);
  });
});
