import {describe, expect, it} from 'vitest';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {createCompany, switchActiveCompany} from '@/features/companies/company-state';
import {createLocalInvitation} from '@/features/company-settings/local-invitations';

describe('company membership invitations', () => {
  it('scopes role and duplicate email checks to the active company', () => {
    const members = companySettingsFixture.members;
    expect(createLocalInvitation({companyId: 'demo-company', fullName: 'Another Andrei', email: ' ANDREI.POPESCU@demo.ro ', role: 'viewer'}, members)).toBeNull();
    expect(createLocalInvitation({companyId: 'second-company', fullName: 'Andrei Popescu', email: 'andrei.popescu@demo.ro', role: 'reviewer'}, members)).toBeNull();
    const created = createCompany({name: 'Second', taxId: 'RO-SECOND', country: 'RO', industry: 'professional'});
    expect(created.ok).toBe(true); if (!created.ok) return;
    const otherCompany = createLocalInvitation({companyId: created.id, fullName: 'Radu', email: 'radu@example.test', role: 'reviewer'}, members);
    expect(otherCompany).toMatchObject({companyId: created.id, role: 'reviewer', status: 'invited'});
    expect(otherCompany).not.toHaveProperty('userId');
    expect(createLocalInvitation({companyId: created.id, fullName: 'Duplicate', email: 'RADU@EXAMPLE.TEST', role: 'administrator'}, members)).toBeNull();
    switchActiveCompany('demo-company');
    expect(createLocalInvitation({companyId: 'demo-company', fullName: 'Radu', email: 'radu@example.test', role: 'viewer'}, members)).toMatchObject({companyId: 'demo-company', role: 'viewer'});
  });
});
