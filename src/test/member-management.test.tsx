import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import ro from '../../messages/ro.json';
import {browserSession} from '@/lib/browser-session';
import {getActiveCompany, getCurrentMembership, manageCompanyMember, readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {createCompanyInvitation, invitationCounts, invitationsForUser, manageCompanyInvitation, pendingCompanyInvitations, readInvitations, resolveInvitation, type CompanyInvitation} from '@/features/profile/invitations-state';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import type {CompanyRole} from '@/features/company-settings/types';
import {MembersAccessPage} from '@/features/company-settings/MembersAccessPage';
import {readLocalAuditEvents} from '@/features/notifications/local-audit';
import {invoiceSample} from '@/features/company-settings/invoice-sample';
import {vendorComplianceFilter} from '@/features/vendors/compliance-filter';
import {csvCell} from '@/lib/csv';
import type {UserProfile} from '@/features/profile/user-profile-state';

const actor = vi.hoisted(() => ({profile: null as UserProfile | null}));
vi.mock('@/features/profile/user-profile-state', async (original) => {const profileModule = await original<typeof import('@/features/profile/user-profile-state')>(); return {...profileModule, readUserProfile: () => actor.profile ?? profileModule.readUserProfile()};});
vi.mock('@/components/layout/AuthenticatedAppShell', () => ({AuthenticatedAppShell: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
vi.mock('@/i18n/navigation', () => ({Link: ({href, children}: {href: string; children: React.ReactNode}) => <a href={href}>{children}</a>}));
const baseline = readCompanyState(), initialInvitations = readInvitations();
const companySession = browserSession(Symbol.for('debiro.company-session'), () => ({state: baseline}));
const invitationSession = browserSession(Symbol.for('debiro.received-invitations-session'), () => ({invitations: initialInvitations}));
beforeEach(() => {actor.profile = null; companySession.state = baseline; invitationSession.invitations = initialInvitations;});

describe('company-owned member management', () => {
  it('changes another member role and removes only that company membership, with one audit event per success', () => {
    const other = baseline.companies[1]; const auditCount = readLocalAuditEvents().length;
    expect(manageCompanyMember('demo-company', 'membership-ioana', 'role', 'administrator')).toEqual({ok: true});
    expect(getActiveCompany(readCompanyState())!.members.find((member) => member.id === 'membership-ioana')?.role).toBe('administrator');
    expect(readCompanyState().companies[1]).toBe(other);
    expect(manageCompanyMember('demo-company', 'membership-ioana', 'remove')).toEqual({ok: true});
    expect(getActiveCompany(readCompanyState())!.members).toHaveLength(1);
    expect(readCompanyState().companies[1]).toBe(other); expect(readLocalAuditEvents()).toHaveLength(auditCount + 2);
  });
  it.each(['role', 'remove'] as const)('enforces the last Administrator invariant for %s', (action) => {
    const events = readLocalAuditEvents().length;
    expect(manageCompanyMember('demo-company', 'membership-andrei', action, 'viewer')).toEqual({ok: false, reason: 'lastAdministrator'});
    expect(readCompanyState()).toBe(baseline); expect(readLocalAuditEvents()).toHaveLength(events);
  });
  it('does not count a pending Administrator invitation as an active Administrator', () => {
    expect(manageCompanyInvitation('demo-company', 'invitation-mihai', 'role', 'administrator')).toEqual({ok: true});
    expect(manageCompanyMember('demo-company', 'membership-andrei', 'role', 'viewer')).toEqual({ok: false, reason: 'lastAdministrator'});
    expect(manageCompanyMember('demo-company', 'membership-andrei', 'remove')).toEqual({ok: false, reason: 'lastAdministrator'});
    expect(readCompanyState()).toBe(baseline);
  });
  it('removes only the target company access when the same user belongs to another company', () => {
    const member = baseline.companies[0].members.find((item) => item.id === 'membership-ioana')!;
    const other = {...baseline.companies[1], members: [...baseline.companies[1].members, {...member, id: 'ioana-global-clean', companyId: 'global-clean-services', isCurrentUser: true}]};
    companySession.state = {...baseline, companies: [baseline.companies[0], other]};
    expect(manageCompanyMember('demo-company', member.id, 'remove')).toEqual({ok: true});
    expect(readCompanyState().companies[1]).toBe(other);
    actor.profile = {...companySettingsFixture.currentUser, userId: member.userId!, firstName: 'Ioana', lastName: 'Radu', email: member.email, phone: '', fullName: member.fullName, initials: 'IR', emailNotificationsEnabled: true, periodicSummaryEnabled: false};
    expect(getCurrentMembership(readCompanyState().companies[0])).toBeNull();
    expect(switchActiveCompany('demo-company')).toBe(false);
    expect(switchActiveCompany('global-clean-services')).toBe(true);
    expect(getCurrentMembership(other)?.role).toBe('reviewer');
  });
  it('blocks unsupported self-management even when another Administrator exists', () => {
    manageCompanyMember('demo-company', 'membership-ioana', 'role', 'administrator'); const before = readCompanyState();
    expect(manageCompanyMember('demo-company', 'membership-andrei', 'role', 'reviewer')).toEqual({ok: false, reason: 'self'});
    expect(manageCompanyMember('demo-company', 'membership-andrei', 'remove')).toEqual({ok: false, reason: 'self'});
    expect(readCompanyState()).toBe(before);
  });
  it('rejects nonexistent/foreign targets and invalid roles without mutation', () => {
    expect(manageCompanyMember('demo-company', 'missing', 'remove')).toEqual({ok: false, reason: 'notFound'});
    expect(manageCompanyMember('demo-company', 'membership-andrei-global-clean', 'remove')).toEqual({ok: false, reason: 'notFound'});
    expect(manageCompanyMember('global-clean-services', 'membership-andrei-global-clean', 'role', 'viewer')).toEqual({ok: false, reason: 'accessDenied'});
    expect(manageCompanyMember('demo-company', 'membership-ioana', 'role', 'owner' as CompanyRole)).toEqual({ok: false, reason: 'invalidRole'});
    expect(readCompanyState()).toBe(baseline);
  });
  it.each(['reviewer', 'viewer'] as const)('denies %s mutations and hides management controls', (role) => {
    companySession.state = {...baseline, companies: baseline.companies.map((company) => company.company.id === 'demo-company' ? {...company, members: company.members.map((member) => member.isCurrentUser ? {...member, role} : member)} : company)};
    const before = readCompanyState();
    expect(manageCompanyMember('demo-company', 'membership-ioana', 'remove')).toEqual({ok: false, reason: 'accessDenied'});
    expect(manageCompanyInvitation('demo-company', 'invitation-mihai', 'cancel')).toEqual({ok: false, reason: 'accessDenied'});
    expect(createCompanyInvitation({companyId: 'demo-company', fullName: 'Test', email: 'test@example.test', role: 'viewer'})).toBeNull();
    expect(readCompanyState()).toBe(before);
    render(<NextIntlClientProvider locale="ro" messages={ro}><MembersAccessPage locale="ro" view={companySettingsFixture}/></NextIntlClientProvider>);
    expect(screen.queryByRole('button', {name: /Acțiuni pentru/})).toBeNull(); expect(screen.queryByRole('button', {name: 'Invită membru'})).toBeNull();
  });
  it('updates a pending proposed role without granting access; acceptance later uses that latest role', () => {
    const item = createCompanyInvitation({companyId: 'demo-company', fullName: 'Recipient', email: 'recipient@example.test', role: 'viewer'})!;
    const before = readCompanyState();
    expect(manageCompanyInvitation('demo-company', item.id, 'role', 'reviewer')).toEqual({ok: true});
    expect(readCompanyState()).toBe(before); expect(pendingCompanyInvitations(readInvitations(), 'demo-company').find((row) => row.id === item.id)?.role).toBe('reviewer');
    actor.profile = {...companySettingsFixture.currentUser, firstName: 'Recipient', lastName: 'User', phone: '', userId: 'recipient', email: 'recipient@example.test', fullName: 'Recipient User', initials: 'RU', emailNotificationsEnabled: true, periodicSummaryEnabled: false};
    expect(resolveInvitation(item.id, 'accepted')).toEqual({ok: true});
    const company = getActiveCompany(readCompanyState())!;
    expect(getCurrentMembership(company)?.role).toBe('reviewer');
    expect(invitationCounts(invitationsForUser(readInvitations(), actor.profile))).toMatchObject({pending: 0, accepted: 1});
    expect(company.members.filter((member) => member.userId === 'recipient')).toHaveLength(1);
  });
  it('cancels pending invitations historically, updates pending counts and blocks acceptance', () => {
    expect(manageCompanyInvitation('demo-company', 'invitation-mihai', 'cancel')).toEqual({ok: true});
    expect(readInvitations().find((item) => item.id === 'invitation-mihai')).toMatchObject({status: 'cancelled', resolvedAt: expect.any(String)});
    expect(pendingCompanyInvitations(readInvitations(), 'demo-company')).toHaveLength(0);
    expect(resolveInvitation('invitation-mihai', 'accepted')).toEqual({ok: false, reason: 'invalid'});
    expect(manageCompanyInvitation('demo-company', 'invitation-mihai', 'role', 'administrator')).toEqual({ok: false, reason: 'notPending'});
    expect(createCompanyInvitation({companyId: 'demo-company', fullName: 'Mihai', email: 'mihai.ene@demo.ro', role: 'reviewer'})).not.toBeNull();
  });
  it.each(['expired', 'accepted', 'rejected', 'cancelled'] as const)('does not mutate %s invitations', (status) => {
    invitationSession.invitations = initialInvitations.map((item): CompanyInvitation => item.id === 'invitation-mihai' ? {...item, status} : item);
    const before = readInvitations(); expect(manageCompanyInvitation('demo-company', 'invitation-mihai', 'cancel')).toEqual({ok: false, reason: 'notPending'}); expect(readInvitations()).toBe(before);
  });
  it('rejects foreign, expired-by-clock, nonexistent and invalid-role invitation actions', () => {
    expect(manageCompanyInvitation('demo-company', 'invitation-global-clean', 'cancel')).toEqual({ok: false, reason: 'notFound'});
    expect(manageCompanyInvitation('demo-company', 'missing', 'cancel')).toEqual({ok: false, reason: 'notFound'});
    expect(manageCompanyInvitation('demo-company', 'invitation-mihai', 'role', 'owner' as CompanyRole)).toEqual({ok: false, reason: 'invalidRole'});
    invitationSession.invitations = initialInvitations.map((item) => item.id === 'invitation-mihai' ? {...item, expiresAt: '2026-01-01'} : item);
    expect(manageCompanyInvitation('demo-company', 'invitation-mihai', 'role', 'viewer')).toEqual({ok: false, reason: 'notPending'});
  });
});

describe('existing filter entry and local sample downloads', () => {
  it('accepts only canonical compliance statuses', () => {for (const status of ['compliant', 'attention', 'noncompliant']) expect(vendorComplianceFilter(status)).toBe(status); for (const value of [undefined, 'unknown', ['compliant'], 'all']) expect(vendorComplianceFilter(value)).toBe('all');});
  it.each(['ro', 'en'])('builds a clearly marked %s sample from the owned invoice only', (locale) => {
    const sample = invoiceSample('demo-company', 'invoice-september-2026', locale)!;
    expect(sample.filename).toBe('INV-2026-009-sample.csv'); expect(sample.csv).toContain('Demo Company SRL'); expect(sample.csv).toContain('29.00');
    expect(sample.csv).toContain(locale === 'en' ? 'NOT AN OFFICIAL INVOICE' : 'NU ESTE O FACTURĂ OFICIALĂ');
    expect(invoiceSample('global-clean-services', 'invoice-september-2026', locale)).toBeNull(); expect(invoiceSample('demo-company', 'missing', locale)).toBeNull();
    switchActiveCompany('global-clean-services'); expect(invoiceSample('demo-company', 'invoice-september-2026', locale)).toBeNull();
  });
  it('quotes CSV text and prevents formula interpretation after whitespace', () => {expect(csvCell(' =1+1')).toBe('"\' =1+1"'); expect(csvCell('a,"b"')).toBe('"a,""b"""');});
});
