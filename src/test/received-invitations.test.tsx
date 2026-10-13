import {render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import {invitationCounts, invitationsForUser, invitationStatus, readInvitations, resolveInvitation, type CompanyInvitation} from '@/features/profile/invitations-state';
import {getCurrentMembership, readCompanyState} from '@/features/companies/company-state';
import {readUserProfile} from '@/features/profile/user-profile-state';
import {MyInvitationsPage} from '@/features/profile/MyInvitationsPage';
import {browserSession} from '@/lib/browser-session';
import {fixtureReferenceTime} from '@/lib/fixture-clock';

vi.mock('@/i18n/navigation', () => ({Link: ({href, children}: {href: string; children: React.ReactNode}) => <a href={href}>{children}</a>}));
vi.mock('@/components/layout/AuthenticatedAppShell', () => ({AuthenticatedAppShell: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
const session = browserSession(Symbol.for('debiro.received-invitations-session'), () => ({invitations: [] as CompanyInvitation[], listeners: new Set<() => void>()}));
const companies = browserSession(Symbol.for('debiro.company-session'), readCompanyState);
const baseline = readInvitations();
const companySession = companies as unknown as {state: ReturnType<typeof readCompanyState>};
const companyBaseline = readCompanyState();
afterEach(() => {session.invitations = baseline; companySession.state = companyBaseline;});
function pending(overrides: Partial<CompanyInvitation> = {}) {return {...baseline[0], ...overrides};}

describe('received company invitations', () => {
  it('uses identity-scoped projections and one active pending badge/KPI count', () => {
    expect(invitationCounts(invitationsForUser(baseline))).toEqual({total: 3, pending: 1, expired: 1, accepted: 1});
    expect(invitationsForUser(baseline, {email: 'someone@example.test'})).toEqual([]);
    expect(invitationsForUser(baseline, {email: ` ${readUserProfile().email.toUpperCase()} `})).toHaveLength(3);
    expect(invitationCounts([]).pending).toBe(0);
  });
  it('derives expiry from the existing deterministic clock, preserving resolved history', () => {
    const invitation = pending({expiresAt: fixtureReferenceTime});
    expect(invitationStatus(invitation)).toBe('pending');
    expect(invitationStatus(invitation, '2026-10-02T12:00:00.001Z')).toBe('expired');
    expect(invitationStatus({...invitation, status: 'accepted'}, '2027-01-01')).toBe('accepted');
    expect(invitationStatus({...invitation, status: 'rejected'}, '2027-01-01')).toBe('rejected');
  });
  it('accepts once, adds existing-model access with proposed role and never changes active company', () => {
    const activeId = readCompanyState().activeCompanyId;
    expect(resolveInvitation(baseline[0].id, 'accepted')).toEqual({ok: true});
    const invited = readCompanyState().companies.find((record) => record.company.id === baseline[0].companyId)!;
    expect(getCurrentMembership(invited)).toMatchObject({userId: readUserProfile().userId, role: 'administrator', status: 'active'});
    expect(invited.members).toHaveLength(1); expect(invited.company.subscription.invoices).toEqual([]);
    expect(readCompanyState().activeCompanyId).toBe(activeId);
    expect(invitationCounts(readInvitations())).toMatchObject({pending: 0, accepted: 2});
    expect(resolveInvitation(baseline[0].id, 'accepted')).toEqual({ok: false, reason: 'invalid'});
    expect(readCompanyState().companies.filter((record) => record.company.id === invited.company.id)).toHaveLength(1);
  });
  it('deterministically reuses an existing active membership without changing its role', () => {
    session.invitations = [pending({companyId: 'global-clean-services', role: 'administrator'})];
    const before = readCompanyState();
    expect(resolveInvitation(baseline[0].id, 'accepted')).toEqual({ok: true});
    expect(readCompanyState()).toBe(before);
    expect(getCurrentMembership(before.companies.find((record) => record.company.id === 'global-clean-services')!)?.role).toBe('reviewer');
  });
  it('retains rejected history without creating membership', () => {
    const before = readCompanyState(); expect(resolveInvitation(baseline[0].id, 'rejected')).toEqual({ok: true});
    expect(readCompanyState()).toBe(before); expect(readInvitations()[0]).toMatchObject({status: 'rejected', resolvedAt: fixtureReferenceTime});
    expect(readInvitations()).toHaveLength(3); expect(invitationCounts(readInvitations()).pending).toBe(0);
  });
  it.each([
    [{expiresAt: '2026-09-30'}, 'expired'],
    [{invitedEmail: 'other@example.test'}, 'identity'],
    [{companyId: 'missing-company'}, 'inaccessible'],
    [{status: 'accepted'}, 'invalid'],
    [{status: 'rejected'}, 'invalid']
  ] as const)('rejects unsafe resolution %j atomically', (overrides, reason) => {
    session.invitations = [pending(overrides)]; const before = readCompanyState(); const invitations = readInvitations();
    expect(resolveInvitation(baseline[0].id, 'accepted')).toEqual({ok: false, reason});
    expect(readCompanyState()).toBe(before); expect(readInvitations()).toBe(invitations);
  });
  it('returns a deterministic missing invitation error', () => {expect(resolveInvitation('missing', 'accepted')).toEqual({ok: false, reason: 'invalid'});});
  it('renders the actual zero state without a fake CTA', () => {
    session.invitations = [];
    render(<NextIntlClientProvider locale="ro" messages={ro}><MyInvitationsPage locale="ro"/></NextIntlClientProvider>);
    expect(screen.getByText('Nu ai invitații')).toBeVisible(); expect(screen.getByText('Invitațiile de la companii vor apărea aici.')).toBeVisible(); expect(screen.queryByRole('button')).toBeNull();
  });
});
