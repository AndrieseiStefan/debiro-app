'use client';

import {useSyncExternalStore} from 'react';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import type {CompanyMembership} from '@/features/company-settings/types';
import {browserSession} from '@/lib/browser-session';
import {validEmail} from '@/lib/field-validation';

export type UserProfileValues = {firstName: string; lastName: string; phone: string};
export type UserProfile = UserProfileValues & {userId: string; email: string; emailNotificationsEnabled: boolean; periodicSummaryEnabled: boolean; fullName: string; initials: string};
function display(values: UserProfileValues) {
  const fullName = `${values.firstName} ${values.lastName}`.trim();
  return {fullName, initials: [values.firstName, values.lastName].map((name) => name[0] ?? '').join('').toLocaleUpperCase()};
}
const [firstName, ...surname] = companySettingsFixture.currentUser.fullName.split(' ');
const initial: UserProfile = {
  userId: companySettingsFixture.members.find((member) => member.isCurrentUser)!.userId!,
  firstName, lastName: surname.join(' '), phone: '', email: companySettingsFixture.currentUser.email,
  emailNotificationsEnabled: true, periodicSummaryEnabled: false,
  ...display({firstName, lastName: surname.join(' '), phone: ''})
};
const session = browserSession(Symbol.for('debiro.user-profile-session'), () => ({profile: initial, listeners: new Set<() => void>()}));
function subscribe(listener: () => void) {session.listeners.add(listener); return () => {session.listeners.delete(listener);};}
function publish(profile: UserProfile) {session.profile = profile; session.listeners.forEach((listener) => listener());}
export function readUserProfile() {return session.profile;}
export function useUserProfile() {return useSyncExternalStore(subscribe, readUserProfile, () => initial);}
/** Compatibility projection for existing synchronous actor/company creation actions. */
export const currentUser = {
  get fullName() {return readUserProfile().fullName;},
  get initials() {return readUserProfile().initials;},
  get email() {return readUserProfile().email;}
};
export function userProfileValues(profile: UserProfile): UserProfileValues {return {firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone};}
export function normalizeUserProfile(values: UserProfileValues): UserProfileValues {return {firstName: values.firstName.trim(), lastName: values.lastName.trim(), phone: values.phone.trim()};}
export function validateUserProfile(values: UserProfileValues, email = readUserProfile().email) {
  return {firstName: !values.firstName.trim(), lastName: !values.lastName.trim(), email: !validEmail(email)};
}
export function userProfileDirty(values: UserProfileValues, profile: UserProfile) {return JSON.stringify(normalizeUserProfile(values)) !== JSON.stringify(userProfileValues(profile));}
export function updateUserProfile(values: UserProfileValues) {
  if (Object.values(validateUserProfile(values)).some(Boolean)) return false;
  const normalized = normalizeUserProfile(values);
  publish({...session.profile, ...normalized, ...display(normalized)});
  return true;
}
export function setUserPreference(key: 'emailNotificationsEnabled' | 'periodicSummaryEnabled', enabled: boolean) {publish({...session.profile, [key]: enabled});}
/** Live identity projection; stored membership and historical actor snapshots stay intact. */
export function currentMemberIdentity(member: CompanyMembership, user = readUserProfile()): CompanyMembership {
  return member.isCurrentUser && member.userId === user.userId && (member.fullName !== user.fullName || member.email !== user.email) ? {...member, fullName: user.fullName, email: user.email} : member;
}
