import {describe, expect, it} from 'vitest';
import {companyDocumentsFixture} from '@/features/company-documents/fixtures';
import {companyDocumentMetrics, eligibleCompanyDocumentIds, filterCompanyDocuments, projectCompanyDocuments, sortCompanyDocuments} from '@/features/company-documents/projections';
import type {CompanyDocumentListRow, CompanyDocumentsState} from '@/features/company-documents/types';
import {companyDocumentList, readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {readDocumentRecords} from '@/features/documents/created-documents';
import {readRequirementsState} from '@/features/requirements/requirements-state';
import {fixtureReferenceTime} from '@/lib/fixture-clock';

const companyId = 'demo-company';
const project = (snapshot = companyDocumentsFixture) => projectCompanyDocuments(snapshot, companyId, 'ro');

describe('company document listing foundation', () => {
  it('derives truthful current/missing/review/expiry rows, excludes history, and leaves vendor/session sources unchanged', () => {
    const state = structuredClone(readCompanyDocumentsState()), vendors = structuredClone(readDocumentRecords()), templates = structuredClone(readRequirementsState());
    const {rows, error} = project();
    expect(error).toBe(false); expect(rows).toHaveLength(6);
    expect(companyDocumentMetrics(rows)).toEqual({total: 5, attention: 4, activeShares: 0});
    expect(rows.map((row) => row.status)).toEqual(['valid', 'expiring_soon', 'valid', 'needs_review', 'missing', 'expired']);
    expect(rows.find((row) => row.status === 'missing')).toMatchObject({currentDocumentId: null, expiresAt: null, updatedAt: null, updatedByDisplayName: null, hasDownloadableFile: false});
    expect(eligibleCompanyDocumentIds(rows)).toEqual([]);
    expect(rows.every((row) => !row.currentDocumentId?.endsWith('-v1'))).toBe(true);
    expect(readCompanyDocumentsState()).toEqual(state); expect(readDocumentRecords()).toEqual(vendors); expect(readRequirementsState()).toEqual(templates);
  });

  it('counts each obligation/document once, ignores optional missing, and preserves pending/rejected/manual-expiry semantics', () => {
    const state = structuredClone(companyDocumentsFixture), workspace = state.byCompany[companyId];
    workspace.requirements[4].required = false;
    workspace.documents[0].manuallyExpiredAt = fixtureReferenceTime;
    workspace.documents.find((doc) => doc.id === 'company-document:insurance')!.reviewOutcome = 'rejected';
    const rows = project(state).rows;
    expect(rows.find((row) => row.currentDocumentId === 'company-document:registration')?.status).toBe('expired');
    expect(rows.find((row) => row.id === 'company-requirement:insurance')?.status).toBe('missing');
    expect(companyDocumentMetrics([...rows, rows[0]])).toEqual({total: 4, attention: 5, activeShares: 0});
    const review = workspace.documents.find((doc) => doc.reviewOutcome === 'pending')!;
    review.expiresAt = '2026-01-01';
    expect(project(state).rows.find((row) => row.currentDocumentId === review.id)?.status).toBe('needs_review');
  });

  it('uses the existing inclusive expiry warning boundary and nullable metadata without inventing values', () => {
    const state = structuredClone(companyDocumentsFixture), record = state.byCompany[companyId].documents[0];
    record.expiresAt = '2026-11-01'; // 30 calendar days from the E1 reference date.
    record.updatedAt = null; record.updatedByDisplayName = null; record.issuer = null;
    expect(project(state).rows[0]).toMatchObject({status: 'expiring_soon', issuer: null, updatedAt: null, updatedByDisplayName: null});
    record.expiresAt = null;
    expect(project(state).rows[0]).toMatchObject({status: 'valid', expiresAt: null});
    record.expiresAt = '2026-10-02'; expect(project(state).rows[0].status).toBe('expiring_soon');
    record.expiresAt = '2026-10-01'; expect(project(state).rows[0].status).toBe('expired');
  });

  it('filters by normalized localized name/type/issuer and combines status/type without altering metrics', () => {
    const rows = project().rows;
    const label = (type: string) => type === 'insurance' ? 'Asigurare' : 'Document fiscal';
    expect(filterCompanyDocuments(rows, '  POLITA  ', 'all', 'all', label)).toHaveLength(1);
    expect(filterCompanyDocuments(rows, ' anaf ', 'tax', 'expiring_soon', label).map((row) => row.currentDocumentId)).toEqual(['company-document:tax']);
    expect(filterCompanyDocuments(rows, 'asigurare', 'all', 'valid', label)).toHaveLength(1);
    expect(filterCompanyDocuments(rows, 'not present', 'all', 'all', label)).toEqual([]);
    expect(companyDocumentMetrics(rows).total).toBe(5);
    expect(projectCompanyDocuments(companyDocumentsFixture, companyId, 'en').rows[0].name).toBe('Company registration certificate');
  });

  it('sorts deterministically without mutation, with null dates last in either direction', () => {
    const rows = project().rows, before = structuredClone(rows);
    for (const column of ['name', 'status', 'expiresAt', 'updatedAt'] as const) for (const direction of ['ascending', 'descending'] as const) {
      const sorted = sortCompanyDocuments(rows, {column, direction}, 'ro');
      expect(sorted).toHaveLength(rows.length);
      if (column === 'expiresAt' || column === 'updatedAt') expect(sorted.at(-1)?.[column]).toBeNull();
    }
    expect(sortCompanyDocuments(rows, {column: 'expiresAt', direction: 'ascending'}, 'ro')[0].status).toBe('expired');
    const ties = ['b', 'a'].map((id) => ({...rows[0], id, name: 'Same'}));
    expect(sortCompanyDocuments(ties, {column: 'expiresAt', direction: 'ascending'}, 'en').map((row) => row.id)).toEqual(['a', 'b']);
    expect(rows).toEqual(before);
  });

  it('makes only actual nonempty current files eligible, never missing/history/foreign records', () => {
    const files = new Map([['company-document:tax', new Blob(['real test file'])], ['company-document:registration-v1', new Blob(['history'])], ['company-document:iso', new Blob([])]]);
    const rows = projectCompanyDocuments(companyDocumentsFixture, companyId, 'ro', files).rows;
    expect(eligibleCompanyDocumentIds(rows)).toEqual(['company-requirement:tax']);
    expect(projectCompanyDocuments(companyDocumentsFixture, 'global-clean-services', 'ro', files).rows).toEqual([]);
    expect(companyDocumentList(companyDocumentsFixture, 'global-clean-services', 'en').rows).toEqual([]);
  });

  it('handles empty/malformed/foreign state safely without loading vendor data or rewriting records', () => {
    expect(project({byCompany: {}})).toEqual({rows: [], error: false});
    for (const malformed of [null, {}, {byCompany: {[companyId]: {requirements: [], documents: 'broken'}}}]) {
      expect(project(malformed as unknown as CompanyDocumentsState)).toEqual({rows: [], error: true});
    }
    const state = structuredClone(companyDocumentsFixture);
    state.byCompany[companyId].documents[0].companyId = 'foreign';
    const before = structuredClone(state);
    expect(project(state)).toEqual({rows: [], error: true}); expect(state).toEqual(before);
    state.byCompany[companyId].documents[0].companyId = companyId;
    state.byCompany[companyId].documents[0].expiresAt = '2026-02-31';
    expect(project(state).error).toBe(true);
    expect(companyDocumentMetrics([] as CompanyDocumentListRow[])).toEqual({total: 0, attention: 0, activeShares: 0});
  });
});
