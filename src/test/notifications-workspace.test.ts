import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {notificationWorkspace, workspaceAuditEvents} from '@/features/notifications/workspace-projections';
import {filterAuditEvents, auditEventsToCsv} from '@/features/notifications/selectors';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {readCompanyState} from '@/features/companies/company-state';
import {getVendorState} from '@/features/vendors/created-vendors';
import {readVendorRequirements} from '@/features/vendors/vendor-requirements';
import {readDocumentRecords} from '@/features/documents/created-documents';
import {readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {addCompanyDocument, reviewCompanyDocument} from '@/features/company-documents/management';
import {employeeDocumentEngine} from '@/features/employees/employee-documents';
import {readEmployeeState, getEmployeeActivity, updateEmployee} from '@/features/employees/employees-state';
import {employeeInput} from '@/features/employees/employee-form';
import {readLocalAuditEvents, recordLocalAuditEvent} from '@/features/notifications/local-audit';
import {vendorActivity} from '@/features/vendors/vendor-activity';
import {workspaceOverview} from '@/features/dashboard/workspace-overview';
import {dashboardFixture} from '@/features/dashboard/fixtures';
import {fixtureReferenceTime} from '@/lib/fixture-clock';

const companyId = 'demo-company', employeeId = 'employee:andrei-popescu';
const owner = (key: string) => Reflect.get(window, Symbol.for(key));
const originals = {company: structuredClone(readCompanyState()), employees: structuredClone(readEmployeeState()), documents: structuredClone(readCompanyDocumentsState()), requirements: structuredClone(readVendorRequirements()), vendors: structuredClone(getVendorState()), files: structuredClone(readDocumentRecords())};
beforeEach(() => {
  owner('debiro.company-session').state = structuredClone(originals.company);
  owner('debiro.employees-session').state = structuredClone(originals.employees); owner('debiro.employees-session').files = new Map();
  owner('debiro.company-documents-session').state = structuredClone(originals.documents); owner('debiro.company-documents-session').files = new Map();
  owner('debiro.vendor-requirements-session').state = structuredClone(originals.requirements); owner('debiro.vendor-session').state = structuredClone(originals.vendors);
  owner('debiro.document-session').documents = structuredClone(originals.files); owner('debiro.local-audit-session').events = [];
  vi.useFakeTimers({toFake: ['Date']}); vi.setSystemTime(new Date('2026-10-20T09:00:00.000Z'));
});
afterEach(() => {vi.useRealTimers();});
const input = () => ({vendorState: getVendorState(), requirements: readVendorRequirements(), documents: readDocumentRecords(), companyDocuments: readCompanyDocumentsState(), employees: readEmployeeState(), events: readLocalAuditEvents()});
const project = (locale: 'ro' | 'en' = 'en') => notificationWorkspace(companyId, locale, input());
const file = {name: 'Private personnel proof', documentType: 'custom' as const, issuer: '', expiresAt: '18.10.2026', required: true, file: new File(['exact file bytes'], 'proof.pdf', {type: 'application/pdf'})};
function employeeDocument(overrides: Partial<typeof file> = {}) {
  const result = employeeDocumentEngine(companyId, employeeId).addCompanyDocument(companyId, {...file, ...overrides});
  if (!result.ok) throw new Error(result.reason); return result;
}

describe('authorized company-wide notification read projections', () => {
  it.each(['ro', 'en'] as const)('reuses current Vendor/Company requirements in %s without optional-missing or Not Configured alerts', (locale) => {
    const before = structuredClone(input()), view = project(locale);
    expect(view.attention.filter((item) => item.status === 'expiring_soon')).toHaveLength(5);
    expect(view.attention.filter((item) => item.status === 'missing')).toMatchObject([{domain: 'company_document', requirementId: 'company-requirement:criminal-record'}]);
    expect(view.attention.some((item) => item.requirementId === 'vendor-requirement:construct-pro:iso')).toBe(false);
    expect(view.attention.some((item) => item.domain === 'employee')).toBe(false);
    expect(view.attention.filter((item) => item.status === 'needs_review').map((item) => item.domain)).toContain('company_document');
    expect(view.errors).toEqual({vendor: false, company: false, employee: false, activity: false}); expect(input()).toEqual(before);
  });
  it('keeps required missing distinct from optional missing and retains real requirement IDs', () => {
    const result = employeeDocument(), workspace = readEmployeeState().byCompany[companyId].documentWorkspaces![employeeId];
    workspace.documents = []; workspace.requirements[0].currentDocumentId = null;
    let missing = project().attention.find((item) => item.domain === 'employee');
    expect(missing).toMatchObject({status: 'missing', requirementId: result.requirementId, expiresAt: null, daysRemaining: null, href: `/company/employees/${encodeURIComponent(employeeId)}`});
    workspace.requirements[0].required = false; missing = project().attention.find((item) => item.domain === 'employee'); expect(missing).toBeUndefined();
  });
  it('uses the fixture expiry clock independently of newly recorded real-time activity', () => {
    const result = employeeDocument(), view = project();
    expect(view.referenceTime).toBe('2026-10-20T09:00:00.000Z');
    expect(view.attention.find((item) => item.documentId === result.document.id)).toMatchObject({status: 'expiring_soon', daysRemaining: 16});
    const activity = view.activity.find((item) => item.domain === 'employee')!;
    expect(activity.occurredAt).toBe(view.referenceTime); expect(activity.sourceId).toBe(getEmployeeActivity(companyId, employeeId)[0].id);
    expect(view.notifications.filter((item) => item.sourceKind === 'attention').every((item) => !item.isUnread && item.occurredAt === '')).toBe(true);
    expect(view.notifications.filter((item) => item.isUnread)).toHaveLength(3);
    expect(view.notifications.some((item) => item.id === activity.sourceId || item.id === activity.id)).toBe(false); // An Employee operation is not a new user notification.
  });
  it('never produces employee review alerts, including legacy pending records, and excludes inactive obligations', () => {
    const result = employeeDocument(), workspace = readEmployeeState().byCompany[companyId].documentWorkspaces![employeeId];
    workspace.documents[0] = {...workspace.documents[0], reviewApplicability: 'required', reviewOutcome: 'pending'};
    expect(project().attention.find((item) => item.documentId === result.document.id)?.status).toBe('expiring_soon');
    expect(project().attention.some((item) => item.domain === 'employee' && item.status === 'needs_review')).toBe(false);
    readEmployeeState().byCompany[companyId].employees.find((item) => item.id === employeeId)!.employmentStatus = 'inactive';
    expect(project().attention.some((item) => item.domain === 'employee')).toBe(false);
    expect(project().activity.some((item) => item.domain === 'employee')).toBe(true);
  });
  it('removes obsolete alerts after immediate replacement/manual expiry without rewriting event history', () => {
    const first = employeeDocument(); const engine = employeeDocumentEngine(companyId, employeeId);
    expect(engine.markCompanyDocumentExpired(companyId, first.requirementId, first.document.id).ok).toBe(true);
    expect(project().attention.find((item) => item.documentId === first.document.id)?.status).toBe('expired');
    const replacement = engine.replaceCompanyDocument(companyId, first.requirementId, first.document.id, {...file, expiresAt: '01.12.2026'}); expect(replacement.ok).toBe(true);
    const view = project(); expect(view.attention.some((item) => item.domain === 'employee')).toBe(false);
    expect(view.notifications.some((item) => item.sourceKind === 'attention' && item.domain === 'employee')).toBe(false);
    expect(view.activity.filter((item) => item.domain === 'employee').map((item) => item.eventType).sort()).toEqual(['document_marked_expired', 'document_replaced', 'document_upload']);
  });
  it('keeps Company review tasks out of expiry/missing until the existing review transaction resolves', () => {
    const result = addCompanyDocument(companyId, {...file, name: 'Company proof'}); if (!result.ok) throw new Error(result.reason);
    expect(project().attention.find((item) => item.documentId === result.document.id)?.status).toBe('needs_review');
    expect(reviewCompanyDocument(companyId, result.requirementId, result.document.id, 'approved').ok).toBe(true);
    expect(project().attention.find((item) => item.documentId === result.document.id)?.status).toBe('expiring_soon');
    expect(project().activity.some((item) => item.documentId === result.document.id)).toBe(false); // Existing recording gap, not fabricated from history.
  });
  it.each(['reviewer', 'viewer'] as const)('filters personnel before counts, dates, notifications, export and navigation for %s', (role) => {
    employeeDocument();
    owner('debiro.company-session').state.companies[0].members.find((item: {isCurrentUser: boolean}) => item.isCurrentUser).role = role;
    const view = project(); expect(view.referenceTime).toBe(fixtureReferenceTime);
    expect(JSON.stringify(view)).not.toContain('Private personnel proof'); expect(view.attention.some((item) => item.domain === 'employee')).toBe(false);
    expect(view.activity.some((item) => item.domain === 'employee')).toBe(false); expect(view.notifications.some((item) => item.domain === 'employee')).toBe(false);
    expect(auditEventsToCsv(workspaceAuditEvents(view.activity), 'en')).not.toContain('employee-event:');
  });
  it('shares actual identities/order with Dashboard while preserving recorded timestamps and date-only provenance', () => {
    employeeDocument(); const employee = readEmployeeState().byCompany[companyId].employees.find((item) => item.id === employeeId)!;
    vi.setSystemTime(new Date('2026-10-20T09:01:00.000Z')); expect(updateEmployee(companyId, employeeId, {...employeeInput(employee), jobTitle: 'Updated title'}).ok).toBe(true);
    const before = structuredClone(input()), view = project(), dashboard = workspaceOverview(companyId, 'en', {base: dashboardFixture, ...input()});
    expect(dashboard.activity.map((item) => item.id)).toEqual(view.activity.slice(0, 5).map((item) => item.id));
    expect(dashboard.expirations.map((item) => item.id)).toEqual(view.attention.filter((item) => item.status === 'expiring_soon').slice(0, 5).map((item) => item.id));
    expect(filterAuditEvents(view.activity, 'last7', view.referenceTime).every((item) => item.domain === 'employee')).toBe(true);
    expect(filterAuditEvents(view.activity, 'all', view.referenceTime)).toEqual(view.activity);
    expect(view.activity.filter((item) => item.domain === 'employee').map((item) => item.sourceId)).toEqual(getEmployeeActivity(companyId, employeeId).map((item) => item.id));
    expect(input()).toEqual(before);
  });
  it('preserves demo notices only in notification-specific sources, never actual audit or entity timelines', () => {
    const view = project(); expect(view.notifications.filter((item) => item.type === 'reminder')).toHaveLength(2);
    expect(view.activity.some((item) => item.eventType === 'reminder')).toBe(false);
    expect(vendorActivity(companyId, 'construct-pro', readLocalAuditEvents()).some((item) => item.eventType === 'reminder')).toBe(false);
    expect(auditEventsToCsv(workspaceAuditEvents(view.activity), 'ro')).not.toContain('audit-reminder');
  });
  it('preserves distinct real IDs at equal timestamps, deduplicates identical references and retains unavailable entities without links', () => {
    const original = notificationsFixture.auditEvents.find((item) => item.eventType === 'document_confirmed')!;
    const event = {...original, id: 'same-action-1', vendorId: 'removed-vendor', occurredAt: '2026-10-21T09:00:00Z'};
    const view = notificationWorkspace(companyId, 'en', {...input(), events: [event, event, {...event, id: 'same-action-2'}, {...event, id: 'broken', occurredAt: 'invalid'}]});
    expect(view.activity.slice(0, 2).map((item) => item.sourceId)).toEqual(['same-action-1', 'same-action-2']);
    expect(view.activity.slice(0, 2).every((item) => !item.href)).toBe(true); expect(view.referenceTime).toBe(event.occurredAt);
  });
  it('reads existing Company events without inventing missing operations or changing their actor/timestamp', () => {
    recordLocalAuditEvent(companyId, {domain: 'company_document', eventType: 'metadata_updated', action: {ro: 'Metadate actualizate', en: 'Metadata updated'}, description: {ro: 'Certificat fiscal', en: 'Tax certificate'}, occurredAt: '2026-10-20T10:00:00Z', actorName: 'Recorded actor', actorId: 'recorded-actor'});
    const event = readLocalAuditEvents()[0], view = project(); expect(view.activity[0]).toMatchObject({sourceId: event.id, actorName: event.actorName, actorId: event.actorId, occurredAt: event.occurredAt});
    expect(workspaceAuditEvents(view.activity)[0]).toMatchObject({id: event.id, domain: 'company_document', actorName: event.actorName});
  });
  it('preserves authorized removed-employee history without exposing a broken Details destination', () => {
    employeeDocument(); readEmployeeState().byCompany[companyId].employees = readEmployeeState().byCompany[companyId].employees.filter((item) => item.id !== employeeId);
    const event = project().activity.find((item) => item.domain === 'employee'); expect(event?.sourceId).toContain('employee-event:'); expect(event?.href).toBeUndefined();
  });
  it('isolates malformed sources and foreign companies without losing valid Vendor data or resetting stores', () => {
    const source = input(); source.companyDocuments.byCompany[companyId].documents[0].expiresAt = 'invalid';
    source.employees.byCompany[companyId].documentWorkspaces = {[employeeId]: null!};
    const view = project(); expect(view.errors).toMatchObject({company: true, employee: true}); expect(view.attention.some((item) => item.domain === 'vendor')).toBe(true);
    expect(notificationWorkspace('global-clean-services', 'en', input()).attention).toEqual([]);
    owner('debiro.company-session').state.activeCompanyId = 'global-clean-services';
    expect(notificationWorkspace('global-clean-services', 'en', input())).toMatchObject({attention: [], activity: [], notifications: [], referenceTime: fixtureReferenceTime});
  });
});
