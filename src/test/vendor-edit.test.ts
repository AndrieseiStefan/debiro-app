import {describe, expect, it} from 'vitest';
import {createLocalVendor, getVendorMetadata, getVendorState, hasDuplicateVendorCui, projectVendorDetails, setVendorLifecycle, updateVendorMetadata, vendorFixtureCompanyId, vendorListItems} from '@/features/vendors/created-vendors';
import {normalizeCui, normalizeVendorValues, validateVendorValues, vendorDraftDirty, vendorFormValues} from '@/features/vendors/vendor-form';
import {getVendorDetailsFixture} from '@/features/vendors/detail-fixtures';
import {vendorsListFixture} from '@/features/vendors/fixtures';

describe('shared vendor metadata editing', () => {
  it('normalizes text, detects meaningful changes and validates the shared create/edit fields', () => {
    const initial = vendorFormValues({name: 'Vendor', cui: 'RO123', email: 'mail@example.test', category: 'software'});
    expect(vendorDraftDirty({...initial, name: ' Vendor ', notes: '   '}, initial)).toBe(false);
    expect(vendorDraftDirty({...initial, category: 'construction'}, initial)).toBe(true);
    expect(normalizeVendorValues({...initial, phone: '  +40 123  ', notes: '  note  '})).toMatchObject({phone: '+40 123', notes: 'note'});
    expect(validateVendorValues({...initial, name: ' ', cui: ' ', email: 'bad', category: '', website: 'bad url'})).toEqual({name: 'nameRequired', cui: 'cuiRequired', email: 'emailInvalid', category: 'categoryRequired', website: 'websiteInvalid'});
    expect(validateVendorValues(initial, true)).toEqual({cui: 'cuiDuplicate'});
    expect(normalizeCui('  ro １２３ ')).toBe('RO123');
  });

  it('prefills only known fixture metadata and never resolves a missing identity', () => {
    const data = getVendorMetadata(getVendorState(), 'construct-pro')!;
    expect(data).toMatchObject({name: 'Construct Pro SRL', cui: 'RO12345678', email: 'ion.popescu@scconstruct.ro', registrationCode: 'J40/1234/2018'});
    expect(vendorFormValues(getVendorMetadata(getVendorState(), 'alpha-construction'))).toMatchObject({email: '', registrationCode: '', phone: '', address: '', website: '', notes: ''});
    expect(getVendorMetadata(getVendorState(), 'missing')).toBeUndefined();
    expect(getVendorMetadata(getVendorState(), '__proto__')).toBeUndefined();
  });

  it('excludes own CUI and rejects duplicates within, but not across, companies atomically', () => {
    const original = getVendorMetadata(getVendorState(), 'construct-pro')!;
    expect(hasDuplicateVendorCui(getVendorState(), vendorFixtureCompanyId, ' ro 12345678 ', 'construct-pro')).toBe(false);
    const other = getVendorState().fixtureVendors.find((vendor) => vendor.id !== 'construct-pro')!;
    const before = getVendorState();
    expect(updateVendorMetadata(vendorFixtureCompanyId, 'construct-pro', {...original, cui: other.registrationNumber.toLowerCase()})).toBe('duplicate');
    expect(updateVendorMetadata(vendorFixtureCompanyId, 'construct-pro', {...original, email: 'bad'})).toBe('invalid');
    expect(updateVendorMetadata('another-company', 'construct-pro', original)).toBe('missing');
    expect(updateVendorMetadata(vendorFixtureCompanyId, 'missing', original)).toBe('missing');
    expect(getVendorState()).toBe(before);
    const local = createLocalVendor({...original, cui: 'RO-EDIT-COMPANY'}, 'another-company');
    expect(hasDuplicateVendorCui(getVendorState(), vendorFixtureCompanyId, local.cui)).toBe(false);
    expect(hasDuplicateVendorCui(getVendorState(), 'another-company', 'ro-edit-company')).toBe(true);
    expect(updateVendorMetadata(vendorFixtureCompanyId, local.id, original)).toBe('missing');
  });

  it('updates fixture projections by stable ID while preserving inactive lifecycle and operational history', () => {
    const view = getVendorDetailsFixture('construct-pro')!;
    const original = getVendorMetadata(getVendorState(), view.vendor.id)!;
    setVendorLifecycle(view.vendor.id, 'inactive');
    const draft = {...original, name: '  Renamed Vendor  ', cui: 'RO-EDIT-FIXTURE', registrationCode: 'J40/1/2026', category: 'software' as const, email: 'updated@example.test', contactName: 'New contact', address: 'New address', website: 'https://example.test', phone: '+40 1', industry: 'Descriptive industry', notes: 'Saved notes'};
    const before = getVendorState();
    expect(getVendorMetadata(before, view.vendor.id)).toEqual(original);
    expect(updateVendorMetadata(vendorFixtureCompanyId, view.vendor.id, draft)).toBe('saved');
    const projected = projectVendorDetails(view, getVendorState());
    expect(projected.vendor).toEqual({...view.vendor, name: 'Renamed Vendor', registrationNumber: draft.cui, category: 'software', contactName: 'New contact', lifecycleStatus: 'inactive'});
    expect(projected.documents).toBe(view.documents);
    expect(projected.invitationPreview).toBe(view.invitationPreview);
    expect(projected.validDocumentCount).toBe(view.validDocumentCount);
    expect(projected.contact).toMatchObject({name: 'New contact', email: draft.email, address: {ro: 'New address', en: 'New address'}, phone: '+40 1', website: draft.website});
    expect(projected.contact.role).toBe(view.contact.role);
    expect(projected.notes).toBe('Saved notes');
    expect(projected.categoryDetail).toBeUndefined();
    expect(vendorListItems(getVendorState(), vendorsListFixture.vendors).find((vendor) => vendor.id === view.vendor.id)).toEqual(projected.vendor);
    expect(updateVendorMetadata(vendorFixtureCompanyId, view.vendor.id, {...draft, notes: undefined, phone: undefined})).toBe('saved');
    expect(projectVendorDetails(view, getVendorState()).notes).toBeUndefined();
    expect(projectVendorDetails(view, getVendorState()).contact.phone).toBeUndefined();
    expect(updateVendorMetadata(vendorFixtureCompanyId, view.vendor.id, original)).toBe('saved');
    setVendorLifecycle(view.vendor.id, 'active');
    expect(projectVendorDetails(view, getVendorState()).contact.address).toBe(view.contact.address);
  });

  it('edits local vendors without replacing identity or fabricating operational data', () => {
    const vendor = createLocalVendor({name: 'Local', cui: 'RO-EDIT-LOCAL', category: 'construction', email: 'local@example.test', notes: 'Original'});
    setVendorLifecycle(vendor.id, 'inactive');
    expect(updateVendorMetadata(vendorFixtureCompanyId, vendor.id, {...vendor, name: 'Local updated', category: 'software', notes: 'Updated'})).toBe('saved');
    const saved = getVendorState().createdVendors.find((item) => item.id === vendor.id)!;
    expect(saved).toMatchObject({id: vendor.id, lifecycleStatus: 'inactive', name: 'Local updated', notes: 'Updated', category: 'software'});
    const view = projectVendorDetails({ ...getVendorDetailsFixture('construct-pro')!, vendor: {...vendorsListFixture.vendors[0], id: vendor.id}}, getVendorState());
    expect(view.documents).toEqual([]);
    expect(view.invitationPreview).toBeUndefined();
    expect(view.vendor).toMatchObject({documentCount: 0, documentTarget: 0, lifecycleStatus: 'inactive'});
  });
});
