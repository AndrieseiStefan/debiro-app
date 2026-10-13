import {fireEvent, render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {MyProfilePage} from '@/features/profile/MyProfilePage';
import {currentMemberIdentity, currentUser, readUserProfile, setUserPreference, updateUserProfile, userProfileDirty, userProfileValues, validateUserProfile, type UserProfileValues} from '@/features/profile/user-profile-state';
import {getActiveCompany, readCompanyState, switchActiveCompany, updateCompanyProfile} from '@/features/companies/company-state';
import {companyProfileValues} from '@/features/company-settings/company-profile';
import {recordLocalAuditEvent, readLocalAuditEvents} from '@/features/notifications/local-audit';

const router = vi.hoisted(() => ({replace: vi.fn()}));
vi.mock('@/i18n/navigation', () => ({useRouter: () => router, Link: ({href, children}: {href: string; children: React.ReactNode}) => <a href={href}>{children}</a>}));
vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn()})}));
vi.mock('@/components/layout/AuthenticatedAppShell', () => ({AuthenticatedAppShell: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
const original = readUserProfile();
afterEach(() => {updateUserProfile(original); setUserPreference('emailNotificationsEnabled', original.emailNotificationsEnabled); setUserPreference('periodicSummaryEnabled', original.periodicSummaryEnabled); switchActiveCompany('demo-company');});
function page(locale: 'ro' | 'en' = 'ro') {return render(<NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : ro}><MyProfilePage locale={locale}/></NextIntlClientProvider>);}

describe('global user profile', () => {
  it('trims required names, keeps permissive existing phone rules and ignores identity/auth/company input', () => {
    expect(validateUserProfile({firstName: ' ', lastName: '', phone: 'extension 4'})).toEqual({firstName: true, lastName: true, email: false});
    expect(validateUserProfile(original, 'not-an-email').email).toBe(true);
    expect(updateUserProfile({firstName: '', lastName: 'Valid', phone: ''})).toBe(false);
    const company = getActiveCompany(readCompanyState())!;
    const supplied = {firstName: ' Elena ', lastName: ' Ionescu ', phone: ' extension 4 ', email: 'other@example.test', companyName: 'Changed', password: 'secret'} as UserProfileValues;
    expect(updateUserProfile(supplied)).toBe(true);
    expect(readUserProfile()).toMatchObject({firstName: 'Elena', lastName: 'Ionescu', phone: 'extension 4', fullName: 'Elena Ionescu', initials: 'EI', email: original.email, userId: original.userId});
    expect(getActiveCompany(readCompanyState())).toBe(company);
    expect(readUserProfile()).not.toHaveProperty('password');
    expect(userProfileDirty({...userProfileValues(readUserProfile()), firstName: ' Elena '}, readUserProfile())).toBe(false);
  });
  it('projects live self identity while preserving historical actor and stored membership labels', () => {
    recordLocalAuditEvent('demo-company', {eventType: 'vendor_edited', action: {ro: 'Test', en: 'Test'}, description: {ro: 'Test', en: 'Test'}});
    const historical = readLocalAuditEvents()[0];
    const member = getActiveCompany(readCompanyState())!.members.find((item) => item.isCurrentUser)!;
    updateUserProfile({firstName: 'Elena', lastName: 'Ionescu', phone: ''});
    expect(currentUser.fullName).toBe('Elena Ionescu');
    expect(currentMemberIdentity(member).fullName).toBe('Elena Ionescu');
    expect(member.fullName).toBe('Andrei Popescu');
    expect(historical.actorName).toBe('Andrei Popescu');
    recordLocalAuditEvent('demo-company', {eventType: 'vendor_edited', action: {ro: 'Test nou', en: 'New test'}, description: {ro: 'Test', en: 'Test'}});
    expect(readLocalAuditEvents()[0].actorName).toBe('Elena Ionescu');
  });
  it('keeps user state independent from company switching and company profile updates', () => {
    setUserPreference('periodicSummaryEnabled', true);
    const user = readUserProfile();
    const company = getActiveCompany(readCompanyState())!.company;
    expect(updateCompanyProfile(company.id, companyProfileValues(company)).ok).toBe(true);
    switchActiveCompany('global-clean-services');
    expect(readUserProfile()).toBe(user);
  });
  it('derives initials from the first and last name fields, including multi-word names', () => {
    updateUserProfile({firstName: 'Elena Maria', lastName: 'Ionescu', phone: ''});
    expect(readUserProfile()).toMatchObject({fullName: 'Elena Maria Ionescu', initials: 'EI'});
  });
  it.each(['ro', 'en'] as const)('uses shared fields, read-only email, disabled unchanged/invalid Save and reset in %s', (locale) => {
    page(locale);
    const save = screen.getByRole('button', {name: locale === 'en' ? 'Save changes' : 'Salvează modificările'});
    expect(save).toBeDisabled();
    expect(document.querySelector('#user-email')).toHaveAttribute('readonly');
    const firstName = document.querySelector('#user-firstName')!;
    fireEvent.change(firstName, {target: {value: ' '}}); expect(save).toBeDisabled();
    fireEvent.change(firstName, {target: {value: 'Elena'}}); expect(save).toBeEnabled();
    fireEvent.click(screen.getByRole('button', {name: locale === 'en' ? 'Cancel' : 'Anulează'}));
    expect(firstName).toHaveValue('Andrei'); expect(save).toBeDisabled();
    fireEvent.change(firstName, {target: {value: 'Elena'}}); fireEvent.click(save);
    expect(readUserProfile().firstName).toBe('Elena'); expect(save).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(locale === 'en' ? 'Changes saved.' : 'Modificările au fost salvate.');
    expect(screen.queryByRole('button', {name: /parola|password|camera/i})).toBeNull();
  });
  it('uses locale navigation without storing a competing preferredLocale', () => {
    page(); fireEvent.change(screen.getByRole('combobox'), {target: {value: 'en'}});
    expect(router.replace).toHaveBeenCalledWith('/profile', {locale: 'en'});
    expect(readUserProfile()).not.toHaveProperty('preferredLocale');
    fireEvent.click(screen.getByRole('switch', {name: /^Notificări pe email/})); expect(readUserProfile().emailNotificationsEnabled).toBe(false);
  });
});
