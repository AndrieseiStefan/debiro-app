import {describe, expect, it} from 'vitest';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {getCompanyMembershipSummary} from '@/features/company-settings/membership-summary';
import type {CompanyMembership} from '@/features/company-settings/types';

describe('company billing membership summary', () => {
  it('derives active seats from the same company memberships as Members & Access', () => {
    const fixture = companySettingsFixture;
    const initial = getCompanyMembershipSummary(fixture, []);
    expect(initial).toMatchObject({activeCount: 2, pendingCount: 1, availableSeats: 3});

    const invitations: CompanyMembership[] = [
      {id: 'local-invite', companyId: fixture.company.id, fullName: 'Radu Ionescu', email: 'radu@demo.ro', role: 'viewer', status: 'invited'},
      {id: 'other-company-member', companyId: 'other-company', fullName: 'Other Member', email: 'other@demo.ro', role: 'administrator', status: 'active'}
    ];
    const afterInvite = getCompanyMembershipSummary(fixture, invitations);
    expect(afterInvite).toMatchObject({activeCount: 2, pendingCount: 2, availableSeats: 3});
    expect(afterInvite.members).toHaveLength(4);
    expect(afterInvite.members.every((member) => member.companyId === fixture.company.id)).toBe(true);
    expect(afterInvite.members.find((member) => member.id === 'local-invite')).not.toHaveProperty('userId');
  });

  it('keeps plan, billing profile, payment method, and invoices on the company subscription', () => {
    const {company} = companySettingsFixture;
    expect(company.subscription.seatLimit).toBe(5);
    expect(company.subscription.billingProfile.legalName).toBe(company.name);
    expect(company.subscription.paymentMethod.lastFour).toBe('4242');
    expect(company.subscription.invoices).toHaveLength(2);
    expect(companySettingsFixture.currentUser).not.toHaveProperty('subscription');
  });
});
