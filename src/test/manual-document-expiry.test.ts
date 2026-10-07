import {describe, expect, it, vi} from 'vitest';
import {createCompany, readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {activeDocuments, createLocalDocument, documentFile, readDocumentRecords} from '@/features/documents/created-documents';
import {approvedCompliance, canManuallyExpire} from '@/features/documents/compliance';
import {documentHistory} from '@/features/documents/document-management';
import {readLocalAuditEvents} from '@/features/notifications/local-audit';
import {notificationDocuments} from '@/features/notifications/document-projections';
import {projectDashboard} from '@/features/dashboard/projections';
import {dashboardFixture} from '@/features/dashboard/fixtures';
import {addRequirementDocument, getRequirementsWorkspace, readRequirementsState, saveRequirementDraft, startRequirementDraft, updateRequirementDraft} from '@/features/requirements/requirements-state';
import {createLocalVendor, toVendorListItem} from '@/features/vendors/created-vendors';
import {applyVendorTemplates, associateRequirementUpload, getVendorRequirements, markDocumentExpired, readVendorRequirements, removeVendorRequirement, replaceInternalDocument, resolveDocumentReview, supplierVendorDocuments, vendorCompliance} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import {vendorActivity} from '@/features/vendors/vendor-activity';
import {fixtureReferenceTime} from '@/lib/fixture-clock';

const values = {documentType: 'tax', companyName: 'Expiry Vendor', documentNumber: '42', issuedAt: '01.09.2026', expiresAt: '01.01.2099', issuer: 'Office'};
const file = (name = 'expiry.pdf') => new File(['exact version bytes'], name, {type: 'application/pdf'});
function setup(required = true, expiresAt = values.expiresAt) {
  const company = createCompany({name: `Expiry ${crypto.randomUUID()}`, taxId: `RO${crypto.randomUUID()}`, country: 'RO', industry: 'construction'});
  if (!company.ok) throw new Error('Company setup failed');
  const companyId = company.id;
  const vendor = createLocalVendor({name: values.companyName, cui: 'RO42', category: 'construction', email: ''}, companyId);
  startRequirementDraft(companyId); updateRequirementDraft(companyId, {name: 'Expiry requirements', categoryId: 'construction'});
  expect(addRequirementDocument(companyId, {catalogDocumentTypeId: 'tax', required, expiryWarningDays: 30, validityMonths: 12})).toBe('added');
  expect(saveRequirementDraft(companyId)).toBe('saved');
  expect(applyVendorTemplates(companyId, vendor.id, [getRequirementsWorkspace(readRequirementsState(), companyId).templates[0].id])).not.toBeNull();
  const workspace = () => getVendorRequirements(readVendorRequirements(), companyId, vendor.id);
  const upload = () => {
    const requirement = workspace().requirements[0];
    return createLocalDocument({companyId, vendorId: vendor.id, vendorName: vendor.name, vendorRegistrationNumber: vendor.cui, vendorRegistrationCode: '',
      typeSnapshot: requirement, documentName: requirement.name, documentType: 'tax', filename: 'expiry.pdf', fileType: 'application/pdf', fileSize: 19, file: file(),
      uploadedAt: '2026-09-01', createdAt: '2026-09-01T12:00:00Z', uploadedBy: 'Supplier', expiresAt: null, extractionRequested: false, reviewRequired: false});
  };
  const initial = upload(); expect(associateRequirementUpload(companyId, vendor.id, initial, workspace().requirements[0].id)).toBe(true);
  expect(resolveDocumentReview(companyId, initial.id, 'approved', {...values, expiresAt})).toBe('saved');
  const renew = (id: string) => replaceInternalDocument(companyId, id, {...values, notes: '', file: file('renewed.pdf')});
  return {companyId, vendor, initial, workspace, upload, renew};
}

describe('manual expiry of owned current documents', () => {
  it.each(['valid', 'expiring_soon'] as const)('invalidates %s without changing identity, version, original metadata or exact files', (status) => {
    const c = setup(true, status === 'valid' ? values.expiresAt : '01.11.2026');
    const before = readDocumentRecords().find((item) => item.id === c.initial.id)!;
    expect(before.complianceStatus).toBe(status);
    const originalFile = documentFile(c.companyId, before.id);
    const requirement = c.workspace().requirements[0];
    expect(markDocumentExpired(c.companyId, before.id)).toBe(true);
    const expired = readDocumentRecords().find((item) => item.id === before.id)!;
    expect(expired).toEqual({...before, status: 'expired', complianceStatus: 'expired', manuallyExpiredAt: fixtureReferenceTime, manuallyExpiredBy: 'andrei-popescu'});
    expect(activeDocuments(readDocumentRecords(), c.companyId)).toEqual([expired]);
    expect(documentHistory(readDocumentRecords(), c.companyId, expired.id)).toHaveLength(1);
    expect(documentFile(c.companyId, expired.id)).toBe(originalFile);
    expect(c.workspace().requirements[0]).toBe(requirement);
    expect(vendorCompliance(c.workspace(), readDocumentRecords())).toMatchObject({status: 'noncompliant', validCount: 0});
    expect(supplierVendorDocuments(c.workspace(), readDocumentRecords())[0]).toMatchObject({status: 'missing', uploadedFile: undefined});
    const vendor = toVendorListItem(c.vendor);
    expect(projectVendorDocuments(vendor, c.workspace(), readDocumentRecords(), c.companyId)).toMatchObject({status: 'noncompliant', documentCount: 0});
    expect(projectDashboard(dashboardFixture, c.companyId, [vendor], readVendorRequirements(), readDocumentRecords(), readLocalAuditEvents()).documentsRequiringAttention.map((item) => item.id)).toContain(expired.id);
    expect(notificationDocuments(c.companyId, [vendor], readVendorRequirements(), readDocumentRecords()).expiringDocuments).toHaveLength(0);
    const events = readLocalAuditEvents().filter((event) => event.companyId === c.companyId && event.eventType === 'document_marked_expired');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({companyId: c.companyId, vendorId: c.vendor.id, requirementId: requirement.id, documentId: before.id, documentVersion: 1, actorId: 'andrei-popescu', actorName: 'Andrei Popescu', occurredAt: fixtureReferenceTime});
    expect(vendorActivity(c.companyId, c.vendor.id, readLocalAuditEvents()).filter((event) => event.eventType === 'document_marked_expired')).toEqual(events);
    expect(markDocumentExpired(c.companyId, before.id)).toBe(false);
    expect(readLocalAuditEvents().filter((event) => event.eventType === 'document_marked_expired' && event.documentId === before.id)).toHaveLength(1);
    expect(approvedCompliance(values.expiresAt, 30, fixtureReferenceTime, expired.manuallyExpiredAt)).toBe('expired');
    expect(canManuallyExpire(expired)).toBe(false);
  });

  it('preserves optionality, creates no version on expiry, and clears the override only on a new internal version', () => {
    const c = setup(false);
    const second = c.renew(c.initial.id); expect(second.ok).toBe(true); if (!second.ok) throw new Error(second.reason);
    const firstFile = documentFile(c.companyId, c.initial.id), secondFile = documentFile(c.companyId, second.document.id);
    expect(markDocumentExpired(c.companyId, second.document.id)).toBe(true);
    expect(documentHistory(readDocumentRecords(), c.companyId, second.document.id)).toHaveLength(2);
    expect(vendorCompliance(c.workspace(), readDocumentRecords()).status).toBe('compliant');
    const next = c.renew(second.document.id); expect(next.ok).toBe(true); if (!next.ok) throw new Error(next.reason);
    expect(next.document).toMatchObject({version: 3, complianceStatus: 'valid', reviewOutcome: 'approved', updateSource: 'internal', manuallyExpiredAt: undefined, manuallyExpiredBy: undefined});
    const history = documentHistory(readDocumentRecords(), c.companyId, next.document.id);
    expect(history.map((item) => item.version ?? 1)).toEqual([3, 2, 1]);
    expect(history[1]).toMatchObject({complianceStatus: 'expired', manuallyExpiredAt: fixtureReferenceTime, supersededById: next.document.id});
    expect(documentFile(c.companyId, c.initial.id)).toBe(firstFile); expect(documentFile(c.companyId, second.document.id)).toBe(secondFile);
    expect(activeDocuments(readDocumentRecords(), c.companyId)).toEqual([next.document]);
    expect(supplierVendorDocuments(c.workspace(), readDocumentRecords())[0].status).toBe('uploaded');
    expect(markDocumentExpired(c.companyId, second.document.id)).toBe(false);
  });

  it('a supplier can re-upload an invalidated requirement, retaining expired evidence and the existing pending-review lifecycle', () => {
    const c = setup(); markDocumentExpired(c.companyId, c.initial.id);
    const retained = documentFile(c.companyId, c.initial.id);
    const upload = c.upload(); expect(associateRequirementUpload(c.companyId, c.vendor.id, upload, c.workspace().requirements[0].id)).toBe(true);
    const pending = readDocumentRecords().find((item) => item.id === upload.id)!;
    expect(pending).toMatchObject({version: 2, reviewOutcome: 'pending', complianceStatus: 'needs_review'});
    expect(activeDocuments(readDocumentRecords(), c.companyId)).toEqual([pending]);
    expect(supplierVendorDocuments(c.workspace(), readDocumentRecords())[0].status).toBe('in_review');
    expect(documentFile(c.companyId, c.initial.id)).toBe(retained);
    expect(markDocumentExpired(c.companyId, pending.id)).toBe(false);
    expect(resolveDocumentReview(c.companyId, pending.id, 'approved', values)).toBe('saved');
    expect(vendorCompliance(c.workspace(), readDocumentRecords()).status).toBe('compliant');
  });

  it('denies viewer, reviewer, inactive membership, foreign, missing, pending and already-expired mutations', () => {
    const c = setup(); const member = readCompanyState().companies.find((item) => item.company.id === c.companyId)!.members.find((item) => item.isCurrentUser)!;
    const records = readDocumentRecords(), events = readLocalAuditEvents();
    for (const role of ['viewer', 'reviewer'] as const) {member.role = role; expect(markDocumentExpired(c.companyId, c.initial.id)).toBe(false);}
    member.role = 'administrator'; member.status = 'invited'; expect(markDocumentExpired(c.companyId, c.initial.id)).toBe(false); member.status = 'active';
    expect(markDocumentExpired('foreign', c.initial.id)).toBe(false); expect(markDocumentExpired(c.companyId, 'missing-id')).toBe(false);
    const pending = c.upload(); expect(markDocumentExpired(c.companyId, pending.id)).toBe(false);
    expect(readDocumentRecords().find((item) => item.id === c.initial.id)).toBe(records.find((item) => item.id === c.initial.id));
    expect(readLocalAuditEvents().filter((event) => event.eventType === 'document_marked_expired')).toEqual(events.filter((event) => event.eventType === 'document_marked_expired'));
    switchActiveCompany('demo-company'); expect(markDocumentExpired(c.companyId, c.initial.id)).toBe(false);
    switchActiveCompany(c.companyId); expect(markDocumentExpired(c.companyId, c.initial.id)).toBe(true);
    const naturallyExpired = setup(true, '01.10.2026');
    expect(readDocumentRecords().find((item) => item.id === naturallyExpired.initial.id)?.complianceStatus).toBe('expired');
    const existingEvents = readLocalAuditEvents();
    expect(markDocumentExpired(naturallyExpired.companyId, naturallyExpired.initial.id)).toBe(false);
    expect(readLocalAuditEvents()).toBe(existingEvents);
  });

  it('configuration removal never deletes the current record, historical record or version-owned files', () => {
    const c = setup(); const next = c.renew(c.initial.id); if (!next.ok) throw new Error(next.reason);
    const first = documentFile(c.companyId, c.initial.id), current = documentFile(c.companyId, next.document.id);
    expect(removeVendorRequirement(c.companyId, c.vendor.id, c.workspace().requirements[0].id)).toBe(true);
    expect(c.workspace().requirements).toHaveLength(0);
    expect(documentHistory(readDocumentRecords(), c.companyId, next.document.id)).toHaveLength(2);
    expect(documentFile(c.companyId, c.initial.id)).toBe(first); expect(documentFile(c.companyId, next.document.id)).toBe(current);
    expect(markDocumentExpired(c.companyId, next.document.id)).toBe(true);
    expect(c.renew(next.document.id).ok).toBe(true);
  });

  it('retains expiry and its single audit event when client modules reinitialize', async () => {
    switchActiveCompany('demo-company');
    const id = 'construct-pro-fire-2024';
    expect(markDocumentExpired('demo-company', id)).toBe(true);
    const document = readDocumentRecords().find((item) => item.id === id), retainedFile = documentFile('demo-company', id);
    const event = readLocalAuditEvents().find((item) => item.eventType === 'document_marked_expired' && item.documentId === id);
    vi.resetModules();
    const remounted = await import('@/features/documents/created-documents');
    const audit = await import('@/features/notifications/local-audit');
    expect(remounted.readDocumentRecords().find((item) => item.id === id)).toBe(document);
    expect(remounted.documentFile('demo-company', id)).toBe(retainedFile);
    expect(audit.readLocalAuditEvents().find((item) => item.documentId === id && item.eventType === 'document_marked_expired')).toBe(event);
  });
});
