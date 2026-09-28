import {describe, expect, it} from 'vitest';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {createLocalInvitation} from '@/features/company-settings/local-invitations';

describe('company membership invitations', () => {
  it('scopes role and duplicate email checks to the active company', () => {
    const members = companySettingsFixture.members;
    expect(createLocalInvitation({companyId: 'demo-company', fullName: 'Another Andrei', email: ' ANDREI.POPESCU@demo.ro ', role: 'viewer'}, members)).toBeNull();
    const otherCompany = createLocalInvitation({companyId: 'second-company', fullName: 'Andrei Popescu', email: 'andrei.popescu@demo.ro', role: 'reviewer'}, members);
    expect(otherCompany).toMatchObject({companyId: 'second-company', role: 'reviewer', status: 'invited'});
    expect(otherCompany).not.toHaveProperty('userId');
    expect(createLocalInvitation({companyId: 'second-company', fullName: 'Duplicate', email: 'ANDREI.POPESCU@DEMO.RO', role: 'administrator'}, members)).toBeNull();
  });
});
