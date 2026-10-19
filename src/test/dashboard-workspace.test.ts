import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {workspaceOverview} from '@/features/dashboard/workspace-overview';
import {dashboardFixture} from '@/features/dashboard/fixtures';
import {getVendorState, vendorListItems, vendorSummary} from '@/features/vendors/created-vendors';
import {getVendorRequirements, readVendorRequirements} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import {readDocumentRecords} from '@/features/documents/created-documents';
import {companyDocumentList, readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {companyDocumentMetrics} from '@/features/company-documents/projections';
import {addCompanyDocument} from '@/features/company-documents/management';
import {employeeDocumentEngine} from '@/features/employees/employee-documents';
import {employeeDocumentWorkspace, employeeWorkspace, readEmployeeState} from '@/features/employees/employees-state';
import {employeeDocumentMetrics, employeeListDocumentMetrics, projectEmployeeDocuments} from '@/features/employees/employee-document-projections';
import {readCompanyState} from '@/features/companies/company-state';
import {readLocalAuditEvents} from '@/features/notifications/local-audit';

const companyId = 'demo-company', employeeId = 'employee:andrei-popescu';
const originals = {employees: structuredClone(readEmployeeState()), company: structuredClone(readCompanyDocumentsState()), membership: structuredClone(readCompanyState())};
const session = (key: string) => Reflect.get(window, Symbol.for(key));
const input = () => ({base: dashboardFixture, vendorState: getVendorState(), requirements: readVendorRequirements(), documents: readDocumentRecords(), companyDocuments: readCompanyDocumentsState(), employees: readEmployeeState(), events: readLocalAuditEvents()});
const project = (locale: 'ro' | 'en' = 'en') => workspaceOverview(companyId, locale, input());
beforeEach(() => {session('debiro.employees-session').state = structuredClone(originals.employees); session('debiro.employees-session').files = new Map(); session('debiro.company-documents-session').state = structuredClone(originals.company); session('debiro.company-documents-session').files = new Map(); session('debiro.company-session').state = structuredClone(originals.membership);});
afterEach(() => {session('debiro.employees-session').state = originals.employees; session('debiro.company-documents-session').state = originals.company; session('debiro.company-session').state = originals.membership;});
const upload = {name: 'Synthetic administrative proof', documentType: 'custom' as const, issuer: '', expiresAt: '04.10.2026', file: new File(['actual test bytes'], 'proof.pdf', {type: 'application/pdf'})};
type StaffCase = {name: string; status: 'expired' | 'missing' | 'expiring_soon' | 'valid' | 'not_configured'; date?: string; inactive?: boolean; optional?: boolean};
function configureStaff(cases: StaffCase[]) {
  session('debiro.employees-session').state = structuredClone(originals.employees);
  expect(employeeDocumentEngine(companyId, employeeId).addCompanyDocument(companyId, {...upload, required: true}).ok).toBe(true);
  const workspace = employeeDocumentWorkspace(companyId, employeeId)!, requirement = workspace.requirements[0], record = workspace.documents[0];
  const state = structuredClone(readEmployeeState()), owned = state.byCompany[companyId], employee = owned.employees[0];
  owned.employees = cases.map((item, index) => ({...employee, id: `employee:case-${index}`, firstName: item.name, lastName: 'Person', email: `case-${index}@example.test`, employmentStatus: item.inactive ? 'inactive' : 'active'}));
  owned.activity = [];
  owned.documentWorkspaces = Object.fromEntries(cases.map((item, index) => {
    const id = owned.employees[index].id, requirementId = `requirement-${index}`, documentId = `document-${index}`;
    return [id, {requirements: item.status === 'not_configured' ? [] : [{...requirement, id: requirementId, employeeId: id, required: !item.optional, currentDocumentId: item.status === 'missing' ? null : documentId}],
      documents: item.status === 'missing' || item.status === 'not_configured' ? [] : [{...record, id: documentId, employeeId: id, requirementId, expiresAt: item.date ?? (item.status === 'expired' ? '2026-10-01' : item.status === 'expiring_soon' ? '2026-10-18' : '2099-01-01')}]}];
  }));
  session('debiro.employees-session').state = state;
}

describe('read-only company-wide Dashboard composition', () => {
  it.each((['ro', 'en'] as const).flatMap((locale) => [0, 3, 5, 6, 12].map((count) => [locale, count] as const)))('limits %s Company preview of %i records without changing real totals', (locale, count) => {
    const source = input(), base = source.companyDocuments.byCompany[companyId];
    const documents = Array.from({length: count}, (_, index) => ({...base.documents[0], id: `preview-document-${index}`, requirementId: `preview-requirement-${index}`, reviewOutcome: 'pending' as const}));
    const requirements = documents.map((document, index) => ({...base.requirements[0], id: document.requirementId, currentDocumentId: document.id, name: {ro: `Document ${index}`, en: `Document ${index}`}}));
    const snapshot = {...source, companyDocuments: {byCompany: {[companyId]: {documents, requirements}}}};
    const view = workspaceOverview(companyId, locale, snapshot);
    expect(view.company.preview).toHaveLength(Math.min(count, 5)); expect(view.company.metrics.total).toBe(count); expect(view.company.metrics.attention).toBe(count);
    expect(view.company.preview.map((row) => row.id)).toEqual(workspaceOverview(companyId, locale, {...snapshot, companyDocuments: {byCompany: {[companyId]: {documents: [...documents].reverse(), requirements: [...requirements].reverse()}}}}).company.preview.map((row) => row.id));
  });
  it.each(['ro', 'en'] as const)('matches directory metrics and preserves employee Not Configured in %s', (locale) => {
    const before = structuredClone(input()), view = project(locale);
    const vendors = vendorListItems(getVendorState(), companyId).map((vendor) => projectVendorDocuments(vendor, getVendorRequirements(readVendorRequirements(), companyId, vendor.id), readDocumentRecords(), companyId));
    const count = vendorSummary(vendors); expect(view.vendorView.suppliers).toMatchObject({total: count.all, compliant: count.compliant, attention: count.attention, noncompliant: count.noncompliant});
    expect(view.company.metrics).toEqual(companyDocumentMetrics(companyDocumentList(readCompanyDocumentsState(), companyId, locale).rows));
    expect(view.employees.total).toBe(employeeWorkspace(companyId).employees.length); expect(view.employees.preview).toEqual([]);
    expect(view.employees.tracking).toEqual({total: 7, complete: 0, attention: 0, not_configured: 7});
    expect(view.employees).toMatchObject({total: 8, active: 7, inactive: 1});
    expect(view.company.preview.every((row) => row.status !== 'valid' && (row.status !== 'missing' || row.required))).toBe(true);
    expect(input()).toEqual(before);
  });
  it.each(['ro', 'en'] as const)('counts active tracking and limits only urgent active people in %s without changing directory rules', (locale) => {
    configureStaff([
      {name: 'A Expired later', status: 'expired'}, {name: 'Z Expired earlier', status: 'expired', date: '2026-09-01'},
      {name: 'A Missing', status: 'missing'}, {name: 'A Missing', status: 'missing'},
      {name: 'Z Soon later', status: 'expiring_soon'}, {name: 'A Soon earlier', status: 'expiring_soon', date: '2026-10-04'},
      {name: 'Complete', status: 'valid'}, {name: 'Not configured', status: 'not_configured'},
      {name: 'Inactive expired', status: 'expired', inactive: true}, {name: 'Optional expired', status: 'expired', optional: true}
    ]);
    // Multiple required issues still represent one person in the preview.
    const owned = readEmployeeState().byCompany[companyId].documentWorkspaces!['employee:case-1'];
    owned.requirements.push({...owned.requirements[0], id: 'additional-missing', currentDocumentId: null});
    const before = structuredClone(input()), view = project(locale);
    expect(view.employees.total).toBe(10);
    expect(view.employees.tracking).toEqual({total: 9, complete: 2, attention: 6, not_configured: 1});
    const {total, ...categories} = view.employees.tracking!; expect(Object.values(categories).reduce((sum, count) => sum + count, 0)).toBe(total);
    expect(view.employees.active + view.employees.inactive).toBe(view.employees.total);
    expect(view.employees.active).toBe(total);
    expect(view.employees.preview.map((entry) => entry.employee.id)).toEqual(['employee:case-1', 'employee:case-0', 'employee:case-2', 'employee:case-3', 'employee:case-5']);
    expect(view.employees.preview.every((entry) => entry.employee.employmentStatus === 'active' && entry.metrics?.tracking === 'attention')).toBe(true);
    expect(view.employees.preview[0].attention).toEqual({status: 'expired', count: 1, deadline: '2026-09-01'});
    const reversed = structuredClone(before); reversed.employees.byCompany[companyId].employees.reverse();
    expect(workspaceOverview(companyId, locale, reversed).employees.preview.map((entry) => entry.employee.id)).toEqual(view.employees.preview.map((entry) => entry.employee.id));
    expect(input()).toEqual(before);
  });
  it.each([0, 3, 5, 6])('shows min(total, 5) of %i attention employees without filling with non-attention people', (count) => {
    configureStaff([...Array.from({length: count}, (_, index) => ({name: `Attention ${index}`, status: 'missing' as const})), {name: 'Complete', status: 'valid'}, {name: 'Unset', status: 'not_configured'}]);
    const view = project(); expect(view.employees.preview).toHaveLength(Math.min(count, 5)); expect(view.employees.tracking?.attention).toBe(count);
  });
  it('uses a truthful empty active chart while the total KPI still includes inactive people', () => {
    configureStaff([{name: 'Inactive', status: 'expired', inactive: true}]);
    expect(project().employees).toMatchObject({total: 1, active: 0, inactive: 1, tracking: {total: 0, complete: 0, attention: 0, not_configured: 0}, preview: []});
    configureStaff([]);
    expect(project().employees).toMatchObject({total: 0, active: 0, inactive: 0, tracking: {total: 0, complete: 0, attention: 0, not_configured: 0}, preview: []});
  });
  it('reuses immediate employee tracking and actual activity, not new approval records', () => {
    const saved = employeeDocumentEngine(companyId, employeeId).addCompanyDocument(companyId, {...upload, required: true}); expect(saved.ok).toBe(true);
    const view = project(), staff = employeeWorkspace(companyId).employees;
    const metrics = new Map(staff.map((employee) => [employee.id, employeeDocumentMetrics(projectEmployeeDocuments(employeeDocumentWorkspace(companyId, employee.id)!, companyId, employee.id, 'en').rows)]));
    expect(view.employees.metrics).toEqual(employeeListDocumentMetrics(staff, metrics)); expect(view.employees.preview[0].employee.id).toBe(employeeId); expect(view.employees.preview[0].metrics?.tracking).toBe('attention');
    const event = view.activity.find((item) => item.domain === 'employee'); expect(event).toMatchObject({domain: 'employee', event: {type: 'document_upload'}, href: `/company/employees/${encodeURIComponent(employeeId)}`});
    expect(view.activity.some((item) => item.domain === 'employee' && item.event.type === 'document_confirmed')).toBe(false);
  });
  it('merges actual current upcoming expirations, including pending Company review, with stable five-item ordering', () => {
    expect(addCompanyDocument(companyId, {...upload, expiresAt: '03.10.2026'}).ok).toBe(true);
    expect(employeeDocumentEngine(companyId, employeeId).addCompanyDocument(companyId, upload).ok).toBe(true);
    const view = project(); expect(view.expirations).toHaveLength(5);
    expect(view.expirations.slice(0, 2).map((item) => item.domain)).toEqual(['company_document', 'employee']);
    expect(view.expirations.every((item) => item.daysRemaining >= 0)).toBe(true);
    expect(view.expirations.map((item) => item.expiresAt)).toEqual(view.expirations.map((item) => item.expiresAt).sort());
    expect(new Set(view.expirations.map((item) => item.id)).size).toBe(5);
    expect(view.activity.some((item) => item.id.startsWith('company:'))).toBe(false);
  });
  it.each(['reviewer', 'viewer'] as const)('filters private employee inputs before aggregates, activity and expiry for %s', (role) => {
    employeeDocumentEngine(companyId, employeeId).addCompanyDocument(companyId, {...upload, name: 'Private personnel metadata'});
    session('debiro.company-session').state.companies[0].members.find((member: {isCurrentUser: boolean}) => member.isCurrentUser).role = role;
    const view = project(); expect(view.employees.restricted).toBe(true); expect(view.employees.total).toBe(8);
    expect(view.employees.preview).toEqual([]); expect(view.employees.tracking).toBeNull();
    expect(view.activity.some((item) => item.domain === 'employee')).toBe(false); expect(view.expirations.some((item) => item.domain === 'employee')).toBe(false); expect(JSON.stringify(view)).not.toContain('Private personnel metadata');
  });
  it('scopes every read to active membership and leaves new company domains empty', () => {
    const foreign = workspaceOverview('global-clean-services', 'en', input()); expect(foreign.available).toBe(false); expect(foreign.activity).toEqual([]); expect(foreign.expirations).toEqual([]);
    session('debiro.company-session').state.activeCompanyId = 'global-clean-services';
    const view = workspaceOverview('global-clean-services', 'en', input()); expect(view.available).toBe(true); expect(view.vendorView.suppliers.total).toBe(0); expect(view.company.metrics.total).toBe(0); expect(view.employees.total).toBe(0); expect(view.activity).toEqual([]); expect(view.expirations).toEqual([]);
  });
  it('isolates malformed Company and Employee document sources instead of crashing the other domains', () => {
    session('debiro.company-documents-session').state.byCompany[companyId].documents[0].expiresAt = 'not-a-date';
    session('debiro.employees-session').state.byCompany[companyId].documentWorkspaces = {[employeeId]: null};
    const view = project(); expect(view.company.error).toBe(true); expect(view.employees.error).toBe(true); expect(view.employees.tracking).toBeNull(); expect(view.vendorView.suppliers.total).toBe(24);
  });
  it('uses configured warning intervals and excludes expired, superseded and manually expired employee versions', () => {
    const result = employeeDocumentEngine(companyId, employeeId).addCompanyDocument(companyId, upload); if (!result.ok) throw new Error(result.reason);
    expect(project().expirations.some((row) => row.documentId === result.document.id)).toBe(true);
    expect(employeeDocumentEngine(companyId, employeeId).markCompanyDocumentExpired(companyId, result.requirementId, result.document.id).ok).toBe(true);
    expect(project().expirations.some((row) => row.documentId === result.document.id)).toBe(false);
    const replaced = employeeDocumentEngine(companyId, employeeId).replaceCompanyDocument(companyId, result.requirementId, result.document.id, {...upload, expiresAt: '01.12.2026'}); expect(replaced.ok).toBe(true);
    expect(project().expirations.some((row) => row.domain === 'employee')).toBe(false);
    const saved = addCompanyDocument(companyId, {...upload, expiresAt: '15.11.2026'}); if (!saved.ok) throw new Error(saved.reason);
    const source = input(), owned = source.companyDocuments.byCompany[companyId];
    const requirement = {...owned.requirements.find((item) => item.id === saved.requirementId)!, expiryWarningDays: 60 as const};
    const view = workspaceOverview(companyId, 'en', {...source, documents: [], companyDocuments: {byCompany: {[companyId]: {requirements: [requirement], documents: [saved.document]}}}});
    expect(view.expirations).toHaveLength(1); expect(view.expirations[0]).toMatchObject({domain: 'company_document', daysRemaining: 44});
  });
  it('deduplicates real audit IDs, orders newest first, ignores invalid/delivery claims, and keeps unavailable entities non-interactive', () => {
    const source = input();
    const event = {id: 'recorded', companyId, eventType: 'vendor_edited' as const, actorType: 'user' as const, action: {ro: 'Furnizor actualizat', en: 'Vendor updated'}, description: {ro: 'Context istoric', en: 'Historical context'}, occurredAt: '2026-10-19T10:00:00Z', vendorId: 'no-longer-available'};
    const events = Array.from({length: 8}, (_, index) => ({...event, id: `event-${index}`, occurredAt: `2026-10-19T10:0${index}:00Z`}));
    const view = workspaceOverview(companyId, 'en', {...source, events: [...events, events[7], {...event, id: 'invalid', occurredAt: 'invalid'}, {...event, id: 'delivery', eventType: 'reminder'}]});
    expect(view.activity.map((item) => item.id)).toEqual(['vendor:event-7', 'vendor:event-6', 'vendor:event-5', 'vendor:event-4', 'vendor:event-3']); expect(view.activity.every((item) => item.href === undefined)).toBe(true);
  });
});
