import {describe, expect, it} from 'vitest';
import {fixtureReferenceDate, fixtureReferenceTime, calendarDaysUntil, expiryCountdown, localizedDate} from '@/lib/fixture-clock';
import {approvedCompliance} from '@/features/documents/compliance';
import {activeDocuments, readDocumentRecords, toVendorDocumentRow} from '@/features/documents/created-documents';
import {documentsFixture} from '@/features/documents/fixtures';
import {vendorsListFixture} from '@/features/vendors/fixtures';
import {getVendorRequirements, readVendorRequirements} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import {vendorSummary} from '@/features/vendors/created-vendors';
import {notificationDocuments} from '@/features/notifications/document-projections';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {vendorActivity} from '@/features/vendors/vendor-activity';
import {projectDashboard} from '@/features/dashboard/projections';
import {dashboardFixture} from '@/features/dashboard/fixtures';

const companyId = 'demo-company';
const records = readDocumentRecords();
const workspaces = readVendorRequirements();
const vendors = vendorsListFixture.vendors;
const project = (vendor = vendors[0], docs = records) => projectVendorDocuments(vendor, getVendorRequirements(workspaces, companyId, vendor.id), docs, companyId);

describe('coherent E1 fixture timeline and current projections', () => {
  it('uses one UTC 2026 reference and preserves the existing warning boundary', () => {
    expect(fixtureReferenceDate).toBe('2026-10-02');
    expect(notificationsFixture.referenceTime).toBe(fixtureReferenceTime);
    expect(calendarDaysUntil('2026-10-07')).toBe(5);
    expect(calendarDaysUntil('2026-10-27')).toBe(25);
    expect(expiryCountdown('2026-01-10')).toEqual({ro: 'Acum 265 zile', en: '265 days ago'});
    expect(approvedCompliance('2026-10-01', 30, fixtureReferenceTime)).toBe('expired');
    expect(approvedCompliance('2026-11-01', 30, fixtureReferenceTime)).toBe('expiring_soon');
    expect(approvedCompliance('2026-11-02', 30, fixtureReferenceTime)).toBe('valid');
    expect(approvedCompliance('2026-11-02', 60, fixtureReferenceTime)).toBe('expiring_soon');
    expect(approvedCompliance(null, 30, fixtureReferenceTime)).toBe('valid');
  });

  it('reconciles all 24 current global documents, including expired and no-expiry records', () => {
    const current = activeDocuments(records, companyId, true);
    const count = (status: string) => current.filter((document) => document.complianceStatus === status).length;
    expect(current).toHaveLength(documentsFixture.documents.length);
    expect([count('needs_review'), count('valid'), count('expiring_soon'), count('expired')]).toEqual([4, 14, 4, 2]);
    for (const document of current) {
      expect(document.uploadedAt.startsWith('2026')).toBe(true);
      expect(document.uploadedAt <= fixtureReferenceDate).toBe(true);
      if (document.issuedAt) expect(document.issuedAt <= document.uploadedAt).toBe(true);
      if (document.issuedAt && document.expiresAt) expect(document.issuedAt <= document.expiresAt).toBe(true);
      expect(document.complianceStatus).toBe(document.reviewOutcome === 'pending' ? 'needs_review' : approvedCompliance(document.expiresAt, 30, fixtureReferenceTime));
      const row = toVendorDocumentRow(document, 'ro');
      if (document.expiresAt) {
        expect(row.expires).toEqual(localizedDate(document.expiresAt));
        expect(row.countdown).toEqual(expiryCountdown(document.expiresAt));
      } else {expect(row.expires).toBeNull(); expect(row.countdown).toBeUndefined();}
    }
  });

  it('derives ratios and expiry from owned current files without fabricating requirements', () => {
    const construct = project();
    expect(construct).toMatchObject({status: 'attention', documentCount: 3, documentTarget: 5, nextExpiry: {date: '2027-02-10'}});
    const tech = project(vendors.find((vendor) => vendor.id === 'tech-solutions')!);
    expect(tech).toMatchObject({status: 'attention', documentCount: 1, documentTarget: 1, nextExpiry: {date: null}});
    const zero = project(vendors.find((vendor) => vendor.id === 'steel-supply')!);
    expect(zero).toMatchObject({status: 'attention', documentCount: 0, documentTarget: 0, nextExpiry: {date: null}});
    // Pending expiry metadata and rejected historical uploads cannot become next expiry.
    const excluded = records.map((document) => document.vendorId === 'construct-pro' && document.reviewOutcome === 'approved' ? {...document, reviewOutcome: 'rejected' as const} : document);
    expect(project(vendors[0], excluded).nextExpiry.date).toBeNull();
    const projected = vendors.map((vendor) => project(vendor));
    expect(vendorSummary(projected)).toEqual({all: 24, compliant: 0, attention: 24, noncompliant: 0});
    expect(vendorSummary(projected.map((vendor, index) => index === 0 ? {...vendor, lifecycleStatus: 'inactive'} : vendor))).toEqual({all: 24, compliant: 0, attention: 23, noncompliant: 0});
  });

  it('shares current expiry/missing sections and audit events across projections and locales', () => {
    const projection = notificationDocuments(companyId, vendors, workspaces, records);
    expect(projection.expiringDocuments).toHaveLength(4);
    for (const expiry of projection.expiringDocuments) {
      const source = records.find((document) => document.id === expiry.id)!;
      expect(expiry.expiresAt).toBe(source.expiresAt);
      expect(expiry.daysRemaining).toBe(calendarDaysUntil(source.expiresAt!));
    }
    expect(projection.missingDocuments.map((document) => document.id)).toEqual(['vendor-requirement:construct-pro:iso']);
    expect(projection.missingDocuments[0].dueAt).toBeNull();
    expect(notificationDocuments(companyId, [], {}, []).expiringDocuments).toEqual([]);
    expect(notificationDocuments('other-company', vendors, workspaces, records)).toEqual({expiringDocuments: [], missingDocuments: []});
    for (const notice of notificationsFixture.notifications) {
      const event = notificationsFixture.auditEvents.find((event) => event.id === notice.id.replace('notice-', 'audit-'))!;
      expect(event).toMatchObject({occurredAt: notice.occurredAt, actorName: notice.actorName, vendorId: notice.vendorId, documentId: notice.documentId, description: notice.description});
      expect(event.occurredAt <= fixtureReferenceTime).toBe(true);
      if (event.vendorId) expect(vendorActivity(companyId, event.vendorId, [])).toContainEqual(event);
    }
    for (const event of notificationsFixture.auditEvents.filter((event) => event.eventType === 'document_upload' && event.documentId)) {
      const document = records.find((document) => document.id === event.documentId)!;
      expect(event.occurredAt).toBe(document.createdAt);
      expect(event.actorName).toBe(document.uploadedBy);
    }
    const dashboard = projectDashboard(dashboardFixture, companyId, vendors, workspaces, records, notificationsFixture.auditEvents);
    const summary = vendorSummary(vendors.map((vendor) => project(vendor)));
    expect(dashboard.suppliers).toMatchObject({total: summary.all, compliant: summary.compliant, attention: summary.attention, noncompliant: summary.noncompliant});
    expect(dashboard.documentsRequiringAttention.filter((document) => document.status === 'expiring')).toHaveLength(projection.expiringDocuments.length);
    const dateOnlyUpload = notificationsFixture.auditEvents.find((event) => event.id === 'upload:construct-pro-tax-2024')!;
    expect(dashboard.recentActivity.find((event) => event.id === dateOnlyUpload.id)?.time).toEqual(localizedDate(dateOnlyUpload.occurredAt));
  });

  it('keeps reject/replacement/approval aggregates coherent without counting historical uploads', () => {
    const tax = records.find((document) => document.id === 'construct-pro-tax-2024')!;
    const rejected = records.map((document) => document.id === tax.id ? {...document, reviewOutcome: 'rejected' as const} : document);
    expect(activeDocuments(rejected, companyId, true)).toHaveLength(23);
    expect(activeDocuments(rejected, companyId, true).filter((document) => document.status === 'review')).toHaveLength(3);
    expect(notificationDocuments(companyId, vendors, workspaces, rejected).missingDocuments.map((document) => document.id)).toEqual(['vendor-requirement:construct-pro:tax', 'vendor-requirement:construct-pro:iso']);
    expect(project(vendors[0], rejected)).toMatchObject({status: 'noncompliant', documentCount: 3, documentTarget: 5});
    const replacement = {...tax, id: 'replacement-tax'};
    const workspace = getVendorRequirements(workspaces, companyId, tax.vendorId);
    const replacementWorkspace = {...workspace, requirements: workspace.requirements.map((requirement) => requirement.id === tax.vendorRequirementId ? {...requirement, uploadedDocumentId: replacement.id, status: 'in_review' as const} : requirement)};
    const replacementWorkspaces = {...workspaces, [`${companyId}:${tax.vendorId}`]: replacementWorkspace};
    const reuploaded = [...rejected, replacement];
    expect(activeDocuments(reuploaded, companyId, true)).toHaveLength(24);
    expect(activeDocuments(reuploaded, companyId, true).filter((document) => document.status === 'review')).toHaveLength(4);
    expect(notificationDocuments(companyId, vendors, replacementWorkspaces, reuploaded).missingDocuments).toHaveLength(1);
    const confirmed = reuploaded.map((document) => document.id === replacement.id ? {...document, reviewOutcome: 'approved' as const, status: 'expiring' as const, complianceStatus: approvedCompliance(document.expiresAt, 30, fixtureReferenceTime)} : document);
    const confirmedWorkspace = {...replacementWorkspace, requirements: replacementWorkspace.requirements.map((requirement) => requirement.id === tax.vendorRequirementId ? {...requirement, status: 'uploaded' as const} : requirement)};
    const current = activeDocuments(confirmed, companyId, true);
    expect(current.filter((document) => document.status === 'review')).toHaveLength(3);
    expect(current.filter((document) => document.status === 'expiring')).toHaveLength(5);
    expect(notificationDocuments(companyId, vendors, {...replacementWorkspaces, [`${companyId}:${tax.vendorId}`]: confirmedWorkspace}, confirmed).expiringDocuments).toHaveLength(5);
    expect(projectVendorDocuments(vendors[0], confirmedWorkspace, confirmed, companyId)).toMatchObject({documentCount: 4, documentTarget: 5, nextExpiry: {date: '2026-10-07'}});
  });
});
