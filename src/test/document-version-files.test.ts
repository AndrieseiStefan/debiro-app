import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createCompany, readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {createLocalVendor} from '@/features/vendors/created-vendors';
import {associateRequirementUpload, getVendorRequirements, readVendorRequirements, replaceInternalDocument, resolveDocumentReview, vendorCompliance} from '@/features/vendors/vendor-requirements';
import {activeDocuments, createLocalDocument, documentFile, readDocumentRecords, updateDocumentRecord} from '@/features/documents/created-documents';
import {documentHistory, downloadDocument} from '@/features/documents/document-management';
import {availableDocumentTypes} from '@/features/requirements/document-types';

const createUrl = vi.fn(() => 'blob:private-version-file');
const revokeUrl = vi.fn();
beforeEach(() => {
  createUrl.mockReset().mockReturnValue('blob:private-version-file'); revokeUrl.mockReset();
  vi.stubGlobal('URL', {createObjectURL: createUrl, revokeObjectURL: revokeUrl});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  if (vi.isFakeTimers()) {vi.runOnlyPendingTimers(); vi.useRealTimers();}
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function bytes(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(file);
  });
}
function setup() {
  const company = createCompany({name: 'File retention', taxId: crypto.randomUUID(), country: 'RO', industry: 'construction'});
  if (!company.ok) throw new Error('Company setup failed');
  const companyId = company.id;
  const vendor = createLocalVendor({name: 'Version files', cui: 'RO42', category: 'construction', email: ''}, companyId);
  const typeSnapshot = availableDocumentTypes(companyId, []).find((item) => item.catalogDocumentTypeId === 'tax')!;
  const upload = (file?: File) => {
    const document = createLocalDocument({companyId, vendorId: vendor.id, vendorName: vendor.name, vendorRegistrationNumber: vendor.cui, vendorRegistrationCode: '',
      typeSnapshot, documentName: typeSnapshot.name, documentType: 'tax', filename: 'metadata-only.pdf', fileType: 'application/pdf', fileSize: 0, file,
      uploadedAt: '2026-09-01', createdAt: '2026-09-01T12:00:00Z', uploadedBy: 'Supplier', expiresAt: null, extractionRequested: false, reviewRequired: true});
    expect(associateRequirementUpload(companyId, vendor.id, document)).toBe(true);
    return readDocumentRecords().find((item) => item.id === document.id)!;
  };
  const renew = (id: string, file: File) => {
    const result = replaceInternalDocument(companyId, id, {file, documentNumber: '', issuedAt: '', expiresAt: '', issuer: '', notes: ''});
    if (!result.ok) throw new Error(`Renewal failed: ${result.reason}`);
    return result.document;
  };
  return {companyId, vendor, upload, renew};
}

describe('version-owned files and guarded downloads', () => {
  it('supplies two distinct, structurally valid demo PDFs using each seeded version’s own filename and size', async () => {
    switchActiveCompany('demo-company');
    const seeded = readDocumentRecords().filter((item) => item.origin === 'fixture');
    expect(new Set(seeded.map((item) => documentFile('demo-company', item.id))).size).toBe(seeded.length);
    for (const record of seeded) expect(documentFile('demo-company', record.id)).toMatchObject({name: record.filename, type: record.fileType, size: record.fileSize});
    const history = documentHistory(readDocumentRecords(), 'demo-company', 'construct-pro-fire-2024');
    const contents = [];
    for (const record of history) {
      const file = documentFile('demo-company', record.id)!;
      const content = await bytes(file); contents.push(content);
      expect(file).toMatchObject({name: record.filename, type: record.fileType, size: record.fileSize});
      expect(content.startsWith('%PDF-1.4')).toBe(true);
      expect(content).toContain(`Document version ${record.version}`);
      expect(content).toContain(record.id);
      expect(content).toContain('DEBIRO demo fixture - no legal validity');
      const xref = Number(/startxref\n(\d+)/.exec(content)![1]);
      expect(content.slice(xref, xref + 4)).toBe('xref');
      const offsets = content.slice(xref).match(/\d{10} 00000 n/g)!;
      offsets.forEach((offset, index) => expect(content.slice(Number(offset.slice(0, 10)))).toMatch(new RegExp(`^${index + 1} 0 obj`)));
    }
    expect(contents[0]).not.toBe(contents[1]);
    expect(history.map((item) => item.filename)).toEqual(['Autorizatie_ISU.pdf', 'Autorizatie_ISU_v1.pdf']);
  });

  it('retains exact objects, bytes and metadata through two renewals, including identical filenames', async () => {
    const c = setup();
    const files = [new File(['original image bytes'], 'original.png', {type: 'image/png'}),
      new File(['first PDF bytes'], 'same.pdf', {type: 'application/pdf'}), new File(['different PDF bytes'], 'same.pdf', {type: 'application/pdf'})];
    const first = c.upload(files[0]);
    const second = c.renew(first.id, files[1]);
    const third = c.renew(second.id, files[2]);
    const history = documentHistory(readDocumentRecords(), c.companyId, third.id);
    expect(history.map((item) => item.version ?? 1)).toEqual([3, 2, 1]);
    for (const [index, record] of [first, second, third].entries()) {
      const retained = readDocumentRecords().find((item) => item.id === record.id)!;
      expect(documentFile(c.companyId, record.id)).toBe(files[index]);
      expect(await bytes(documentFile(c.companyId, record.id)!)).toBe(await bytes(files[index]));
      expect(retained).toEqual({...record, ...(index < 2 ? {supersededById: [second, third][index].id} : {})});
      expect(retained).toMatchObject({filename: files[index].name, fileType: files[index].type, fileSize: files[index].size});
    }
    expect(activeDocuments(readDocumentRecords(), c.companyId)).toEqual([third]);
    expect(vendorCompliance(getVendorRequirements(readVendorRequirements(), c.companyId, c.vendor.id), readDocumentRecords()).status).toBe('compliant');
  });

  it('retains rejected submitted bytes after a supplier re-upload without satisfying the current requirement', () => {
    const c = setup(); const rejectedFile = new File(['exact rejected submission'], 'rejected.pdf', {type: 'application/pdf'});
    const rejected = c.upload(rejectedFile);
    expect(resolveDocumentReview(c.companyId, rejected.id, 'rejected')).toBe('saved');
    const pendingFile = new File(['new pending submission'], 'pending.pdf', {type: 'application/pdf'});
    const pending = c.upload(pendingFile);
    expect(documentFile(c.companyId, rejected.id)).toBe(rejectedFile);
    expect(documentFile(c.companyId, pending.id)).toBe(pendingFile);
    expect(documentHistory(readDocumentRecords(), c.companyId, pending.id).map((item) => item.reviewOutcome)).toEqual(['pending', 'rejected']);
    expect(activeDocuments(readDocumentRecords(), c.companyId)).toEqual([readDocumentRecords().find((item) => item.id === pending.id)]);
    expect(vendorCompliance(getVendorRequirements(readVendorRequirements(), c.companyId, c.vendor.id), readDocumentRecords()).status).toBe('attention');
  });

  it('downloads the selected historical object and filename, not the current version, and revokes temporary URLs', () => {
    vi.useFakeTimers();
    const c = setup(); const oldFile = new File(['old bytes'], 'old.pdf', {type: 'application/pdf'});
    const old = c.upload(oldFile); const currentFile = new File(['new bytes'], 'new.pdf', {type: 'application/pdf'});
    const current = c.renew(old.id, currentFile);
    for (const [record, file] of [[old, oldFile], [current, currentFile]] as const) {
      expect(downloadDocument(c.companyId, record.id, c.vendor.id)).toBe(true);
      expect(createUrl).toHaveBeenLastCalledWith(file);
      const anchor = vi.mocked(HTMLAnchorElement.prototype.click).mock.instances.at(-1)! as HTMLAnchorElement;
      expect(anchor.download).toBe(record.filename);
    }
    expect(revokeUrl).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000); expect(revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('denies missing versions/files, foreign companies/vendors and stale active-company access without starting a download', () => {
    const c = setup(); const absent = c.upload();
    expect(resolveDocumentReview(c.companyId, absent.id, 'rejected')).toBe('saved');
    const available = c.upload(new File(['owned bytes'], 'owned.pdf', {type: 'application/pdf'}));
    expect(downloadDocument(c.companyId, absent.id)).toBe(false);
    expect(downloadDocument(c.companyId, 'unknown-version')).toBe(false);
    expect(downloadDocument('demo-company', available.id)).toBe(false);
    expect(downloadDocument(c.companyId, available.id, 'other-vendor')).toBe(false);
    expect(documentFile(c.companyId, available.id, 'other-vendor')).toBeUndefined();
    updateDocumentRecord(available.id, {vendorId: 'construct-pro'});
    expect(documentFile(c.companyId, available.id)).toBeUndefined();
    expect(downloadDocument(c.companyId, available.id)).toBe(false);
    updateDocumentRecord(available.id, {vendorId: c.vendor.id});
    switchActiveCompany('demo-company');
    expect(downloadDocument(c.companyId, available.id)).toBe(false);
    expect(createUrl).not.toHaveBeenCalled(); expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it('allows existing active Viewer/Reviewer/Admin downloads but denies inactive memberships', () => {
    vi.useFakeTimers();
    const c = setup(); const old = c.upload(new File(['old'], 'old.pdf', {type: 'application/pdf'})); c.renew(old.id, new File(['new'], 'new.pdf', {type: 'application/pdf'}));
    const member = readCompanyState().companies.find((item) => item.company.id === c.companyId)!.members.find((item) => item.isCurrentUser)!;
    for (const role of ['viewer', 'reviewer', 'administrator'] as const) {member.role = role; expect(downloadDocument(c.companyId, old.id)).toBe(true);}
    member.status = 'invited'; createUrl.mockClear();
    expect(downloadDocument(c.companyId, old.id)).toBe(false); expect(createUrl).not.toHaveBeenCalled();
  });

  it('fails safely for stale binary references or a browser download error, without false success or leaked object URLs', () => {
    vi.useFakeTimers();
    const c = setup(); const record = c.upload(new File(['bytes'], 'file.pdf', {type: 'application/pdf'}));
    createUrl.mockImplementationOnce(() => {throw new Error('stale binary reference');});
    expect(downloadDocument(c.companyId, record.id)).toBe(false); expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    vi.mocked(HTMLAnchorElement.prototype.click).mockImplementationOnce(() => {throw new Error('browser unavailable');});
    expect(downloadDocument(c.companyId, record.id)).toBe(false);
    vi.advanceTimersByTime(1000); expect(revokeUrl).toHaveBeenCalledWith('blob:private-version-file');
  });
});
