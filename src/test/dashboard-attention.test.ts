import {describe, expect, it} from 'vitest';
import {activeDocuments, readDocumentRecords} from '@/features/documents/created-documents';
import {attentionComplianceStatuses, attentionDocumentStatuses} from '@/features/documents/attention';
import {documentManagementHref} from '@/features/documents/document-management';
import {projectDashboard} from '@/features/dashboard/projections';
import {dashboardFixture} from '@/features/dashboard/fixtures';
import {vendorsListFixture} from '@/features/vendors/fixtures';
import {readVendorRequirements} from '@/features/vendors/vendor-requirements';
import {notificationDocuments} from '@/features/notifications/document-projections';

const companyId = 'demo-company', records = readDocumentRecords(), workspaces = readVendorRequirements(), vendors = vendorsListFixture.vendors;
const project = (documents = records, owner = companyId) => projectDashboard(dashboardFixture, owner, vendors, workspaces, documents, []).documentsRequiringAttention;

describe('Dashboard uploaded-document attention', () => {
  it('uses the same three statuses and current company records as the Documents filters', () => {
    expect(attentionComplianceStatuses).toEqual(['needs_review', 'expiring_soon', 'expired']);
    expect(attentionDocumentStatuses).toEqual(['review', 'expiring', 'expired']);
    const expected = activeDocuments(records, companyId).filter((document) => attentionDocumentStatuses.includes(document.status));
    const attention = project();
    expect(attention.map((document) => document.id)).toEqual(expected.map((document) => document.id));
    expect(attention).toHaveLength(10);
    for (const [status, count] of [['review', 4], ['expiring', 4], ['expired', 2]]) expect(attention.filter((document) => document.status === status)).toHaveLength(count as number);
    expect(new Set(attention.map((document) => document.id)).size).toBe(attention.length);
  });
  it('keeps missing requirements only in their existing projections, including when all current files are valid', () => {
    const valid = records.map((document) => ({...document, status: 'valid' as const, complianceStatus: 'valid' as const, reviewOutcome: 'approved' as const}));
    expect(project(valid)).toEqual([]);
    const missing = notificationDocuments(companyId, vendors, workspaces, valid).missingDocuments;
    expect(missing.map((document) => document.id)).toContain('vendor-requirement:construct-pro:iso');
    expect(project().some((document) => document.id.startsWith('vendor-requirement:'))).toBe(false);
  });
  it('excludes superseded, rejected and foreign records without fabricating dates for pending files', () => {
    const pending = records.find((document) => document.complianceStatus === 'needs_review')!;
    const additions = [
      {...pending, id: 'foreign', companyId: 'other-company'},
      {...pending, id: 'superseded', supersededById: pending.id},
      {...pending, id: 'rejected', reviewOutcome: 'rejected' as const},
      {...pending, id: 'pending-no-expiry', expiresAt: null}
    ];
    const attention = project([...records, ...additions]);
    expect(attention).toHaveLength(11);
    for (const id of ['foreign', 'superseded', 'rejected']) expect(attention.some((document) => document.id === id)).toBe(false);
    expect(attention.find((document) => document.id === 'pending-no-expiry')).toMatchObject({status: 'review', expiry: {ro: '—', en: '—'}});
    expect(project(records, 'empty-company')).toEqual([]);
    expect(project([...records, ...additions], 'other-company').map((document) => document.id)).toEqual(['foreign']);
  });
  it('updates attention after rejection or status resolution using the current records only', () => {
    const pending = records.find((document) => document.complianceStatus === 'needs_review')!;
    for (const reviewOutcome of ['rejected', 'approved'] as const) {
      const changed = records.map((document) => document.id === pending.id ? {...document, reviewOutcome, status: 'valid' as const, complianceStatus: 'valid' as const} : document);
      expect(project(changed)).toHaveLength(9);
      expect(project(changed).some((document) => document.id === pending.id)).toBe(false);
    }
  });
  it('preserves the route-entry intent in existing document drawer links without changing normal links', () => {
    const document = records[0];
    expect(documentManagementHref(document, '/documents', 'history')).toBe(`/documents?document=${document.id}&documentAction=history`);
    expect(documentManagementHref(document, '/documents?attention=1', 'history')).toBe(`/documents?attention=1&document=${document.id}&documentAction=history`);
  });
});
