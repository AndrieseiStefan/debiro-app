import {describe, expect, it} from 'vitest';
import {activeDocuments, approvedCompliance, createLocalDocument, readDocumentRecords} from '@/features/documents/created-documents';
import {availableDocumentTypes} from '@/features/requirements/document-types';
import {createLocalVendor} from '@/features/vendors/created-vendors';
import {associateRequirementUpload, getVendorRequirements, readVendorRequirements, removeVendorRequirement, resolveDocumentReview, supplierVendorDocuments, vendorCompliance} from '@/features/vendors/vendor-requirements';
import {readLocalAuditEvents} from '@/features/notifications/local-audit';
import {vendorActivity} from '@/features/vendors/vendor-activity';
import {supplierRequirementProgress} from '@/features/supplier-requirements/types';
import {supplierPreviewDocuments} from '@/features/requirements/supplier-preview';
import {createCompany} from '@/features/companies/company-state';

function context() {
  const created = createCompany({name: `Review ${crypto.randomUUID()}`, taxId: `RO${crypto.randomUUID()}`, country: 'RO', industry: 'construction'});
  if (!created.ok) throw new Error('Company fixture setup failed');
  const companyId = created.id;
  const vendor = createLocalVendor({name: 'Review Vendor', cui: 'RO123', category: 'construction', email: 'test@example.com'}, companyId);
  const type = availableDocumentTypes(companyId, []).find((item) => item.catalogDocumentTypeId === 'tax')!;
  const upload = () => createLocalDocument({companyId, vendorId: vendor.id, vendorName: vendor.name, vendorRegistrationNumber: vendor.cui, vendorRegistrationCode: '',
    typeSnapshot: type, documentName: type.name, documentType: 'tax', filename: 'tax.pdf', fileType: 'application/pdf', fileSize: 12,
    uploadedAt: '2025-01-15', createdAt: '2025-01-15T12:00:00Z', uploadedBy: 'Reviewer', expiresAt: null, extractionRequested: false, reviewRequired: false});
  const workspace = () => getVendorRequirements(readVendorRequirements(), companyId, vendor.id);
  return {companyId, vendor, upload, workspace};
}
const values = {documentType: 'tax-certificate', companyName: 'Review Vendor', documentNumber: ' 42 ', issuedAt: '01.01.2025', expiresAt: '01.01.2099', issuer: ' Office '};

describe('shared document review lifecycle', () => {
  it('approves metadata, ownership, progress, compliance and one activity/audit event atomically', () => {
    const c = context(); const upload = c.upload();
    expect(associateRequirementUpload(c.companyId, c.vendor.id, upload)).toBe(true);
    expect(c.workspace().requirements[0]).toMatchObject({status: 'in_review', uploadedDocumentId: upload.id});
    expect(readDocumentRecords().find((item) => item.id === upload.id)).toMatchObject({reviewOutcome: 'pending', complianceStatus: 'needs_review'});
    expect(supplierRequirementProgress(supplierVendorDocuments(c.workspace(), readDocumentRecords())).completed).toBe(0);
    expect(resolveDocumentReview(c.companyId, upload.id, 'approved', values)).toBe('saved');
    const approved = readDocumentRecords().find((item) => item.id === upload.id)!;
    expect(approved).toMatchObject({reviewOutcome: 'approved', complianceStatus: 'valid', documentNumber: '42', issuer: 'Office', confirmedMetadata: {...values, documentNumber: '42', issuer: 'Office'}, vendorRequirementId: c.workspace().requirements[0].id});
    expect(approved.reviewedAt).toBeTruthy(); expect(approved.reviewedBy).toBeTruthy();
    expect(approved.extractedMetadata).toBeUndefined();
    expect(c.workspace().requirements[0]).toMatchObject({status: 'uploaded', uploadedDocumentId: upload.id});
    expect(supplierRequirementProgress(supplierVendorDocuments(c.workspace(), readDocumentRecords()))).toEqual({completed: 1, total: 1, percentage: 100});
    expect(vendorCompliance(c.workspace(), readDocumentRecords())).toMatchObject({validCount: 1});
    expect(activeDocuments(readDocumentRecords(), c.companyId).filter((item) => item.complianceStatus === 'needs_review')).toHaveLength(0);
    expect(resolveDocumentReview(c.companyId, upload.id, 'approved', values)).toBe('resolved');
    expect(resolveDocumentReview(c.companyId, upload.id, 'rejected')).toBe('resolved');
    const events = vendorActivity(c.companyId, c.vendor.id, readLocalAuditEvents()).filter((event) => event.eventType === 'document_confirmed');
    expect(events).toHaveLength(1); expect(events[0].documentId).toBe(upload.id);
  });

  it('retains rejected history, clears the current file, and accepts a new identity without overwriting it', () => {
    const c = context(); const old = c.upload(); associateRequirementUpload(c.companyId, c.vendor.id, old);
    const requirementId = c.workspace().requirements[0].id;
    expect(resolveDocumentReview(c.companyId, old.id, 'rejected')).toBe('saved');
    const rejected = readDocumentRecords().find((item) => item.id === old.id)!;
    expect(rejected).toMatchObject({reviewOutcome: 'rejected', vendorRequirementId: requirementId, filename: 'tax.pdf'});
    expect(c.workspace().requirements[0]).toMatchObject({status: 'missing', uploadedDocumentId: undefined});
    expect(activeDocuments(readDocumentRecords(), c.companyId)).toHaveLength(0);
    expect(supplierVendorDocuments(c.workspace(), readDocumentRecords())[0]).toMatchObject({status: 'missing', uploadedFile: undefined});
    const replacement = c.upload();
    expect(replacement.id).not.toBe(old.id);
    expect(associateRequirementUpload(c.companyId, c.vendor.id, replacement, requirementId)).toBe(true);
    expect(associateRequirementUpload(c.companyId, c.vendor.id, c.upload(), requirementId)).toBe(false);
    expect(c.workspace().requirements[0]).toMatchObject({status: 'in_review', uploadedDocumentId: replacement.id});
    expect(resolveDocumentReview(c.companyId, replacement.id, 'approved', values)).toBe('saved');
    expect(readDocumentRecords().find((item) => item.id === old.id)).toEqual(rejected);
    expect(c.workspace().requirements[0].uploadedDocumentId).toBe(replacement.id);
    expect(vendorActivity(c.companyId, c.vendor.id, readLocalAuditEvents()).filter((event) => event.eventType === 'document_rejected')).toHaveLength(1);
  });

  it('uses expiry boundaries and configured warning days rather than forcing valid', () => {
    expect(approvedCompliance('2025-01-14', 30, '2025-01-15T23:00:00Z')).toBe('expired');
    expect(approvedCompliance('2025-01-15', 30, '2025-01-15T00:00:00Z')).toBe('expiring_soon');
    expect(approvedCompliance('2025-02-14', 30, '2025-01-15T12:00:00Z')).toBe('expiring_soon');
    expect(approvedCompliance('2025-02-15', 30, '2025-01-15T12:00:00Z')).toBe('valid');
    expect(approvedCompliance('2025-02-15', 60, '2025-01-15T12:00:00Z')).toBe('expiring_soon');
    expect(approvedCompliance(null, 30, '2025-01-15T12:00:00Z')).toBe('valid');
    const c = context(); const upload = c.upload(); associateRequirementUpload(c.companyId, c.vendor.id, upload);
    expect(resolveDocumentReview(c.companyId, upload.id, 'approved', {...values, expiresAt: '01.01.2025'})).toBe('saved');
    expect(readDocumentRecords().find((item) => item.id === upload.id)?.complianceStatus).toBe('expired');
    expect(c.workspace().requirements[0].status).toBe('uploaded');
  });

  it('rejects invalid, foreign and missing actions; removing configuration preserves reviewable evidence', () => {
    const c = context(); const upload = c.upload(); associateRequirementUpload(c.companyId, c.vendor.id, upload);
    const before = readLocalAuditEvents().length;
    expect(resolveDocumentReview('foreign-company', upload.id, 'approved', values)).toBe('unavailable');
    expect(resolveDocumentReview(c.companyId, upload.id, 'approved', {...values, expiresAt: '31.02.2025'})).toBe('invalid');
    expect(resolveDocumentReview(c.companyId, upload.id, 'approved', {...values, companyName: ' '})).toBe('invalid');
    expect(readLocalAuditEvents()).toHaveLength(before);
    expect(getVendorRequirements(readVendorRequirements(), 'foreign-company', c.vendor.id).requirements).toHaveLength(0);
    removeVendorRequirement(c.companyId, c.vendor.id, c.workspace().requirements[0].id);
    expect(readDocumentRecords().find((item) => item.id === upload.id)?.vendorRequirementId).toBeUndefined();
    expect(resolveDocumentReview(c.companyId, upload.id, 'rejected')).toBe('saved');
    expect(resolveDocumentReview(c.companyId, 'missing-id', 'approved', values)).toBe('unavailable');
  });

  it('required rejection downgrades compliance while optional rejection does not, and preview is independent', () => {
    const c = context(); const upload = c.upload(); associateRequirementUpload(c.companyId, c.vendor.id, upload);
    const pending = c.workspace();
    const required = {...pending, requirements: pending.requirements.map((item) => ({...item, required: true}))};
    expect(vendorCompliance(required, readDocumentRecords())?.status).toBe('attention');
    resolveDocumentReview(c.companyId, upload.id, 'rejected');
    const missing = c.workspace().requirements[0];
    const validOther = { ...missing, id: 'other-required', status: 'uploaded' as const, uploadedDocumentId: 'other-file', required: true };
    const approved = {...upload, id: 'other-file', reviewOutcome: 'approved' as const, complianceStatus: 'valid' as const};
    expect(vendorCompliance({...pending, requirements: [{...missing, required: true}]}, readDocumentRecords())?.status).toBe('noncompliant');
    expect(vendorCompliance({...pending, requirements: [validOther, missing]}, [approved])?.status).toBe('compliant');
    const preview = supplierPreviewDocuments([{id: 'preview', templateId: 'template', catalogDocumentTypeId: 'registration', required: true, expiryWarningDays: 30, validityMonths: 12}]);
    expect(preview[0].status).toBe('uploaded');
    expect(new Set(supplierVendorDocuments(c.workspace(), readDocumentRecords()).map((item) => item.status))).toEqual(new Set(['missing']));
  });
});
