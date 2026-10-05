import {describe, expect, it} from 'vitest';
import {createCompany, readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {activeDocuments, createLocalDocument, documentFile, readDocumentRecords} from '@/features/documents/created-documents';
import {documentAccess} from '@/features/documents/document-access';
import {accessibleDocument, documentDetailsHref, documentHistory} from '@/features/documents/document-management';
import {availableDocumentTypes} from '@/features/requirements/document-types';
import {createLocalVendor, toVendorListItem} from '@/features/vendors/created-vendors';
import {associateRequirementUpload, getVendorRequirements, readVendorRequirements, replaceInternalDocument, resolveDocumentReview, supplierVendorDocuments, vendorCompliance} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import {notificationDocuments} from '@/features/notifications/document-projections';
import {projectDashboard} from '@/features/dashboard/projections';
import {dashboardFixture} from '@/features/dashboard/fixtures';
import {readLocalAuditEvents} from '@/features/notifications/local-audit';

const file = (name = 'renewed.pdf') => new File(['actual local bytes'], name, {type: 'application/pdf'});
const metadata = {documentNumber: '42', issuedAt: '02.10.2026', expiresAt: '01.01.2099', issuer: 'Office', notes: 'Internal renewal'};
function setup() {
  const company = createCompany({name: `Version ${crypto.randomUUID()}`, taxId: `RO${crypto.randomUUID()}`, country: 'RO', industry: 'construction'});
  if (!company.ok) throw new Error('Company setup failed');
  const companyId = company.id;
  const vendor = createLocalVendor({name: 'Version Vendor', cui: 'RO42', category: 'construction', email: ''}, companyId);
  const type = availableDocumentTypes(companyId, []).find((item) => item.catalogDocumentTypeId === 'tax')!;
  const upload = () => createLocalDocument({companyId, vendorId: vendor.id, vendorName: vendor.name, vendorRegistrationNumber: vendor.cui, vendorRegistrationCode: '',
    typeSnapshot: type, documentName: type.name, documentType: 'tax', filename: 'original.pdf', fileType: 'application/pdf', fileSize: 18, file: file('original.pdf'),
    uploadedAt: '2026-09-01', createdAt: '2026-09-01T12:00:00Z', uploadedBy: 'Supplier', expiresAt: null, extractionRequested: false, reviewRequired: false});
  const initial = upload(); associateRequirementUpload(companyId, vendor.id, initial);
  const workspace = () => getVendorRequirements(readVendorRequirements(), companyId, vendor.id);
  const approve = (id = initial.id) => resolveDocumentReview(companyId, id, 'approved', {documentType: 'tax', companyName: vendor.name, ...metadata});
  const renew = (id = initial.id, expiresAt = metadata.expiresAt) => replaceInternalDocument(companyId, id, {...metadata, expiresAt, file: file()});
  return {companyId, vendor, initial, workspace, upload, approve, renew};
}

describe('document management and internal version lifecycle', () => {
  it.each(['valid', 'expiring_soon', 'expired', 'no-expiry'])('derives %s directly, retains history and synchronizes all current projections', (status) => {
    const c = setup(); c.approve();
    const expiry = status === 'expired' ? '01.10.2026' : status === 'expiring_soon' ? '01.11.2026' : status === 'no-expiry' ? '' : metadata.expiresAt;
    const before = {...readDocumentRecords().find((item) => item.id === c.initial.id)!};
    const result = replaceInternalDocument(c.companyId, c.initial.id, {...metadata, issuedAt: status === 'expired' ? '01.09.2026' : metadata.issuedAt, expiresAt: expiry, file: file()});
    expect(result.ok).toBe(true); if (!result.ok) return;
    const current = result.document;
    expect(current.id).not.toBe(before.id);
    expect(current).toMatchObject({version: 2, previousDocumentId: before.id, reviewOutcome: 'approved', complianceStatus: status === 'no-expiry' ? 'valid' : status, updateSource: 'internal', uploadedBy: 'Andrei Popescu', reviewRoute: null});
    expect(current.reviewedBy).toBeUndefined();
    expect(readDocumentRecords().find((item) => item.id === before.id)).toEqual({...before, supersededById: current.id});
    expect(c.workspace().requirements[0]).toMatchObject({uploadedDocumentId: current.id, status: 'uploaded'});
    expect(activeDocuments(readDocumentRecords(), c.companyId)).toEqual([current]);
    expect(supplierVendorDocuments(c.workspace(), readDocumentRecords())[0]).toMatchObject({uploadedFile: current.filename, status: 'uploaded'});
    const vendor = toVendorListItem(c.vendor);
    const projection = projectVendorDocuments(vendor, c.workspace(), readDocumentRecords(), c.companyId);
    expect(projection.nextExpiry.date).toBe(current.expiresAt);
    const notifications = notificationDocuments(c.companyId, [vendor], readVendorRequirements(), readDocumentRecords());
    expect(notifications.expiringDocuments.map((item) => item.id)).toEqual(status === 'expiring_soon' ? [current.id] : []);
    const dashboard = projectDashboard(dashboardFixture, c.companyId, [vendor], readVendorRequirements(), readDocumentRecords(), readLocalAuditEvents());
    expect(dashboard.documentsRequiringAttention.map((item) => item.id)).toEqual(['expired', 'expiring_soon'].includes(status) ? [current.id] : []);
    expect(documentHistory(readDocumentRecords(), c.companyId, current.id).map((item) => item.id)).toEqual([current.id, before.id]);
    expect(documentFile(c.companyId, before.id)).toBeDefined(); expect(documentFile(c.companyId, current.id)).toBeDefined();
    const audit = readLocalAuditEvents().filter((event) => event.companyId === c.companyId && event.eventType === 'document_replaced');
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({actorId: 'andrei-popescu', vendorId: c.vendor.id, requirementId: c.workspace().requirements[0].id, documentId: current.id, previousDocumentId: before.id, documentVersion: 2, previousDocumentVersion: 1});
    expect(c.renew(before.id)).toMatchObject({ok: false, reason: 'unavailable'});
  });

  it('keeps a rejected supplier version and pending re-upload in the same history, then allows trusted internal renewal', () => {
    const c = setup(); const original = readDocumentRecords().find((item) => item.id === c.initial.id)!;
    expect(documentDetailsHref(original, '/documents')).toBe(`/documents/${original.id}/review`);
    expect(resolveDocumentReview(c.companyId, original.id, 'rejected')).toBe('saved');
    const next = c.upload(); expect(associateRequirementUpload(c.companyId, c.vendor.id, next, c.workspace().requirements[0].id)).toBe(true);
    const pending = readDocumentRecords().find((item) => item.id === next.id)!;
    expect(pending).toMatchObject({version: 2, reviewOutcome: 'pending', complianceStatus: 'needs_review'});
    expect(c.workspace().requirements[0].status).toBe('in_review');
    const result = c.renew(next.id); expect(result.ok).toBe(true); if (!result.ok) return;
    const history = documentHistory(readDocumentRecords(), c.companyId, result.document.id);
    expect(history.map((item) => [item.version ?? 1, item.reviewOutcome, Boolean(item.supersededById)])).toEqual([[3, 'approved', false], [2, 'pending', true], [1, 'rejected', false]]);
    expect(activeDocuments(readDocumentRecords(), c.companyId)).toEqual([result.document]);
    expect(vendorCompliance(c.workspace(), readDocumentRecords()).status).toBe('compliant');
    expect(resolveDocumentReview(c.companyId, pending.id, 'approved', {documentType: 'tax', companyName: c.vendor.name, ...metadata})).toBe('unavailable');
    expect(documentDetailsHref(result.document, '/documents')).toBe(`/documents?document=${result.document.id}`);
  });

  it('rejects invalid, stale and foreign updates without changing records or writing audit events', () => {
    const c = setup(); c.approve();
    const records = readDocumentRecords(); const events = readLocalAuditEvents();
    for (const input of [{...metadata, expiresAt: '31.02.2027', file: file()}, {...metadata, expiresAt: '01.10.2026', file: file()}, {...metadata, file: new File(['bad'], 'bad.exe', {type: 'application/octet-stream'})}]) {
      expect(replaceInternalDocument(c.companyId, c.initial.id, input)).toMatchObject({ok: false, reason: 'invalid'});
    }
    expect(replaceInternalDocument('other-company', c.initial.id, {...metadata, file: file()})).toMatchObject({ok: false, reason: 'access'});
    expect(accessibleDocument(records, c.companyId, c.initial.id, 'another-vendor')).toBeUndefined();
    expect(documentHistory(records, 'other-company', c.initial.id)).toEqual([]);
    expect(readDocumentRecords()).toBe(records); expect(readLocalAuditEvents()).toBe(events);
    switchActiveCompany('demo-company');
    expect(accessibleDocument(records, c.companyId, c.initial.id)).toBeUndefined();
    expect(documentFile(c.companyId, c.initial.id)).toBeUndefined();
    expect(c.renew()).toMatchObject({ok: false, reason: 'access'});
  });

  it('respects existing administrator/reviewer/viewer membership for details, replacement and review', () => {
    const c = setup(); const state = readCompanyState(); const company = state.companies.find((item) => item.company.id === c.companyId)!;
    const member = company.members.find((item) => item.isCurrentUser)!;
    for (const role of ['viewer', 'reviewer', 'administrator'] as const) {
      member.role = role;
      expect(documentAccess(c.companyId)).toMatchObject({visible: true, replace: role === 'administrator', review: role !== 'viewer'});
      expect(accessibleDocument(readDocumentRecords(), c.companyId, c.initial.id)).toBeDefined();
      if (role !== 'administrator') expect(c.renew()).toMatchObject({ok: false, reason: 'access'});
      if (role === 'viewer') expect(c.approve()).toBe('unavailable');
      if (role === 'reviewer') expect(c.approve()).toBe('saved');
    }
    expect(c.renew().ok).toBe(true);
    member.status = 'invited';
    expect(documentAccess(c.companyId).visible).toBe(false);
    expect(documentHistory(readDocumentRecords(), c.companyId, c.initial.id)).toEqual([]);
  });
});
