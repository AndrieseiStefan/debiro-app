import {describe, expect, it, vi} from 'vitest';

describe('document session ownership', () => {
  it('reuses version records, files and requirement references after the client modules initialize again', async () => {
    const documents = await import('@/features/documents/created-documents');
    const requirements = await import('@/features/vendors/vendor-requirements');
    const original = documents.readDocumentRecords().find((item) => item.id === 'construct-pro-fire-2024')!;
    const originalFile = documents.documentFile('demo-company', original.id);
    const uploaded = new File(['session-owned version bytes'], 'session-v3.pdf', {type: 'application/pdf'});
    const result = requirements.replaceInternalDocument('demo-company', original.id, {file: uploaded, documentNumber: '', issuedAt: '', expiresAt: '', issuer: '', notes: ''});
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    const snapshot = documents.readDocumentRecords();
    const workspace = requirements.readVendorRequirements();

    vi.resetModules();
    const remountedDocuments = await import('@/features/documents/created-documents');
    const remountedRequirements = await import('@/features/vendors/vendor-requirements');
    expect(remountedDocuments.readDocumentRecords()).toBe(snapshot);
    expect(remountedRequirements.readVendorRequirements()).toBe(workspace);
    expect(remountedDocuments.documentFile('demo-company', original.id)).toBe(originalFile);
    expect(remountedDocuments.documentFile('demo-company', result.document.id)).toBe(uploaded);
    expect(remountedDocuments.activeDocuments(snapshot, 'demo-company').filter((item) => item.versionGroupId === original.versionGroupId)).toEqual([result.document]);
    expect(remountedRequirements.getVendorRequirements(workspace, 'demo-company', 'construct-pro').requirements.find((item) => item.catalogDocumentTypeId === 'fire')?.uploadedDocumentId).toBe(result.document.id);
    const nextFile = new File(['next exact bytes'], 'session-v4.pdf', {type: 'application/pdf'});
    const next = remountedRequirements.replaceInternalDocument('demo-company', result.document.id, {file: nextFile, documentNumber: '', issuedAt: '', expiresAt: '', issuer: '', notes: ''});
    expect(next.ok).toBe(true);
    if (!next.ok) throw new Error(next.reason);
    expect(documents.readDocumentRecords()).toBe(remountedDocuments.readDocumentRecords());
    expect(requirements.readVendorRequirements()).toBe(remountedRequirements.readVendorRequirements());
    expect(documents.documentFile('demo-company', next.document.id)).toBe(nextFile);
    expect(documents.documentFile('demo-company', result.document.id)).toBe(uploaded);
  });
});
