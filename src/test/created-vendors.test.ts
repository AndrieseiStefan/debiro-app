import {describe, expect, it} from 'vitest';
import {toVendorDetailsView, toVendorListItem, type CreatedVendor} from '@/features/vendors/created-vendors';
import {vendorsListFixture} from '@/features/vendors/fixtures';

const requiredOnly: CreatedVendor = {
  id: 'local-test', name: 'Atlas SRL', cui: 'RO12345678', category: 'software', email: 'hello@atlas.example'
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
});
