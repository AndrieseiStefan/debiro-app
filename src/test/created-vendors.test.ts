import {describe, expect, it} from 'vitest';
import {createLocalVendor, getVendorState, setVendorLifecycle, toVendorDetailsView, toVendorListItem, vendorListItems, vendorSummary, type CreatedVendor} from '@/features/vendors/created-vendors';
import {vendorsListFixture} from '@/features/vendors/fixtures';

const requiredOnly: CreatedVendor = {
  id: 'local-test', name: 'Atlas SRL', cui: 'RO12345678', category: 'software', email: 'hello@atlas.example', lifecycleStatus: 'active'
};

describe('new vendor view mapping', () => {
  it('starts with zero documents and no fabricated optional or invitation data', () => {
    const listItem = toVendorListItem(requiredOnly);
    expect(listItem).toMatchObject({status: 'attention', documentCount: 0, documentTarget: 0, registrationNumber: 'RO12345678', category: 'software'});
    expect(listItem.nextExpiry.ro).toBe('—');
    const details = toVendorDetailsView(requiredOnly, vendorsListFixture);
    expect(details.documents).toEqual([]);
    expect(details.validDocumentCount).toBe(0);
    expect(details.invitationPreview).toBeUndefined();
    expect(details.registrationCode).toBeUndefined();
    expect(details.contact).toEqual({name: undefined, email: 'hello@atlas.example', phone: undefined, address: undefined, website: undefined});
    expect(details.notes).toBeUndefined();
  });

  it('keeps category distinct from optional industry and preserves supplied metadata', () => {
    const details = toVendorDetailsView({...requiredOnly, registrationCode: 'J40/12/2026', industry: 'Consulting', notes: 'Call first'}, vendorsListFixture);
    expect(details.vendor.category).toBe('software');
    expect(details.industry).toBe('Consulting');
    expect(details.registrationCode).toBe('J40/12/2026');
    expect(details.notes).toBe('Call first');
  });

  it('separates fixture lifecycle from compliance and preserves every other field through reactivation', () => {
    const original = getVendorState().fixtureVendors.find((vendor) => vendor.id === 'construct-pro')!;
    setVendorLifecycle(original.id, 'inactive');
    const inactive = getVendorState().fixtureVendors.find((vendor) => vendor.id === original.id)!;
    expect(inactive).toEqual({...original, lifecycleStatus: 'inactive'});
    const list = vendorListItems(getVendorState(), vendorsListFixture.vendors);
    expect(vendorSummary(list)).toEqual({all: 24, compliant: 15, attention: 5, noncompliant: 3});
    expect(list.find((vendor) => vendor.id === original.id)?.status).toBe('compliant');
    setVendorLifecycle(original.id, 'active');
    expect(getVendorState().fixtureVendors.find((vendor) => vendor.id === original.id)).toEqual(original);
    expect(vendorSummary(vendorListItems(getVendorState(), vendorsListFixture.vendors))).toEqual({all: 24, compliant: 16, attention: 5, noncompliant: 3});
  });

  it('uses the same lifecycle for created vendors without losing supplied optional data', () => {
    const input = {name: requiredOnly.name, cui: requiredOnly.cui, category: requiredOnly.category, email: requiredOnly.email};
    const vendor = createLocalVendor({...input, notes: 'Keep this note', phone: '+40 700 000 000'});
    expect(vendor.lifecycleStatus).toBe('active');
    setVendorLifecycle(vendor.id, 'inactive');
    const inactive = getVendorState().createdVendors.find((item) => item.id === vendor.id)!;
    expect(inactive).toEqual({...vendor, lifecycleStatus: 'inactive'});
    expect(toVendorDetailsView(inactive, vendorsListFixture).vendor.lifecycleStatus).toBe('inactive');
    expect(vendorSummary(vendorListItems(getVendorState(), vendorsListFixture.vendors))).toEqual({all: 25, compliant: 16, attention: 5, noncompliant: 3});
    setVendorLifecycle(vendor.id, 'active');
    expect(getVendorState().createdVendors.find((item) => item.id === vendor.id)).toEqual(vendor);
    expect(vendorSummary(vendorListItems(getVendorState(), vendorsListFixture.vendors)).attention).toBe(6);
    const before = getVendorState();
    setVendorLifecycle('unknown', 'inactive');
    setVendorLifecycle(vendor.id, 'active');
    expect(getVendorState()).toBe(before);
  });
});
