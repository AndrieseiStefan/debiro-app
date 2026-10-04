import {describe, expect, it} from 'vitest';
import {readDocumentRecords, type CreatedDocument} from '@/features/documents/created-documents';
import {getVendorRequirements, readVendorRequirements, vendorCompliance, type VendorRequirement} from '@/features/vendors/vendor-requirements';

const seed = getVendorRequirements(readVendorRequirements(), 'demo-company', 'construct-pro').requirements[0];
const file = readDocumentRecords().find((document) => document.id === seed.uploadedDocumentId)!;
function requirement(overrides: Partial<Pick<VendorRequirement, 'id' | 'status' | 'required' | 'uploadedDocumentId'>> = {}): VendorRequirement {
  return {...seed, status: 'uploaded', uploadedDocumentId: 'current', ...overrides};
}
function document(overrides: Partial<CreatedDocument> = {}): CreatedDocument {
  return {...file, id: 'current', reviewOutcome: 'approved', complianceStatus: 'valid', ...overrides};
}
const derive = (requirements: VendorRequirement[], records: CreatedDocument[]) => vendorCompliance({requirements, appliedTemplates: []}, records);

describe('requirement-driven vendor compliance', () => {
  it.each([
    ['valid', 'compliant'], ['expiring_soon', 'attention'], ['needs_review', 'attention'], ['expired', 'noncompliant']
  ] as const)('derives required current %s as %s independently of the ratio', (complianceStatus, expected) => {
    expect(derive([requirement()], [document({complianceStatus})]).status).toBe(expected);
  });

  it('treats zero configured requirements as compliant, regardless of unrelated files', () => {
    expect(derive([], [])).toEqual({status: 'compliant', validCount: 0, total: 0});
    expect(derive([], [document({complianceStatus: 'expired'}), document({id: 'pending', complianceStatus: 'needs_review'})]).status).toBe('compliant');
  });

  it('requires an active satisfying file for every required requirement', () => {
    expect(derive([requirement({status: 'missing', uploadedDocumentId: undefined})], []).status).toBe('noncompliant');
    expect(derive([requirement()], []).status).toBe('noncompliant');
    expect(derive([requirement()], [document({reviewOutcome: 'rejected'})]).status).toBe('noncompliant');
    expect(derive([requirement({status: 'missing'})], [document()]).status).toBe('noncompliant');
  });

  it.each(['missing', 'expired'] as const)('does not downgrade compliance for an optional %s requirement', (state) => {
    expect(derive([requirement({required: false, status: state === 'missing' ? 'missing' : 'uploaded'})], state === 'missing' ? [] : [document({complianceStatus: 'expired'})]).status).toBe('compliant');
  });

  it.each(['needs_review', 'expiring_soon'] as const)('keeps a linked optional %s warning relevant', (complianceStatus) => {
    expect(derive([requirement({required: false})], [document({complianceStatus})]).status).toBe('attention');
  });

  it('uses both supplier requirement state and internal document state', () => {
    expect(derive([requirement({status: 'in_review'})], [document()]).status).toBe('attention');
    expect(derive([requirement({status: 'in_review', required: false})], [document()]).status).toBe('attention');
    expect(derive([requirement({status: 'uploaded'})], [document({complianceStatus: 'needs_review', reviewOutcome: 'pending'})]).status).toBe('attention');
  });

  it('uses noncompliant > attention > compliant precedence across requirements', () => {
    const valid = requirement({id: 'valid', uploadedDocumentId: 'valid'});
    const warning = requirement({id: 'warning', uploadedDocumentId: 'warning'});
    const missing = requirement({id: 'missing', uploadedDocumentId: undefined, status: 'missing'});
    const files = [document({id: 'valid'}), document({id: 'warning', complianceStatus: 'expiring_soon'})];
    expect(derive([valid, warning], files).status).toBe('attention');
    expect(derive([valid, warning, missing], files).status).toBe('noncompliant');
    expect(derive([valid, warning], [files[0], {...files[1], complianceStatus: 'expired'}]).status).toBe('noncompliant');
  });

  it('allows 3/5 compliance when only optional requirements are missing', () => {
    const requirements = Array.from({length: 5}, (_, index) => requirement({id: `rule-${index}`, uploadedDocumentId: `file-${index}`, required: index < 3, status: index < 3 ? 'uploaded' : 'missing'}));
    const files = requirements.slice(0, 3).map((rule) => document({id: rule.uploadedDocumentId!}));
    expect(derive(requirements, files)).toEqual({status: 'compliant', validCount: 3, total: 5});
    expect(derive(requirements, files.map((item, index) => index ? item : {...item, complianceStatus: 'expiring_soon'}))).toEqual({status: 'attention', validCount: 3, total: 5});
  });

  it('ignores rejected, expired and pending history once a valid replacement is current', () => {
    const history = [document({id: 'rejected', reviewOutcome: 'rejected'}), document({id: 'expired', complianceStatus: 'expired'}), document({id: 'pending', complianceStatus: 'needs_review'})];
    expect(derive([requirement()], [...history, document()])).toEqual({status: 'compliant', validCount: 1, total: 1});
    expect(derive([requirement()], history).status).toBe('noncompliant');
  });

  it.each([{companyId: 'other-company'}, {vendorId: 'other-vendor'}])('does not satisfy a requirement with a foreign-owned reference %j', (ownership) => {
    expect(derive([requirement()], [document(ownership)]).status).toBe('noncompliant');
  });

  it('does not require expiry on a valid no-expiry document', () => {
    expect(derive([requirement()], [document({expiresAt: null})]).status).toBe('compliant');
  });
});
