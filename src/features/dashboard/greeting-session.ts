'use client';

import {useEffect, useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import {browserSession} from '@/lib/browser-session';
import {useUserProfile} from '@/features/profile/user-profile-state';
import {greetingFirstName, isDashboardGreetingId, nextDashboardGreeting, type DashboardGreetingId} from './greetings';

// Presentation-only state: never an authentication/session token or a business-data store.
export type DashboardGreetingSelection = {version: 1; userId: string; selectionId: string; variantId: DashboardGreetingId};
const storageKey = 'debiro.dashboard-greeting.v1';
const previousKey = (userId: string) => `debiro.dashboard-greeting.previous:${encodeURIComponent(userId)}`;
const owner = browserSession(Symbol.for('debiro.dashboard-greeting'), () => ({current: null as DashboardGreetingSelection | null, previous: new Map<string, DashboardGreetingId>(), sequence: 0, listeners: new Set<() => void>()}));
function read(key: string, persistent = false) {
  try {return (persistent ? window.localStorage : window.sessionStorage).getItem(key);} catch {return null;}
}
function write(key: string, value: string | null, persistent = false) {
  try {const storage = persistent ? window.localStorage : window.sessionStorage; if (value === null) storage.removeItem(key); else storage.setItem(key, value);} catch { /* Blocked/quota-limited storage retains this realm's in-memory selection. */ }
}
function storedSelection(): DashboardGreetingSelection | null {
  try {
    const value = JSON.parse(read(storageKey) ?? 'null');
    return value?.version === 1 && typeof value.userId === 'string' && value.userId.trim() && typeof value.selectionId === 'string' && value.selectionId && isDashboardGreetingId(value.variantId) ? {version: 1, userId: value.userId, selectionId: value.selectionId, variantId: value.variantId} : null;
  } catch {return null;}
}
function inheritedFromOpener(selection: DashboardGreetingSelection) {
  // Same-origin window.open copies sessionStorage once. Do not inherit the opener's greeting.
  try {return window.opener && JSON.parse(window.opener.sessionStorage.getItem(storageKey) ?? 'null')?.selectionId === selection.selectionId;} catch {return false;}
}
function publish(selection: DashboardGreetingSelection | null) {owner.current = selection; owner.listeners.forEach((notify) => notify());}
function remember(selection: DashboardGreetingSelection) {
  owner.previous.set(selection.userId, selection.variantId);
  write(previousKey(selection.userId), selection.variantId, true);
}

/** E1: called after valid demo Login submission. E2: call on real sign-in/account entry. No auth mutations. */
export function beginDashboardGreetingSession(userId: string) {
  if (typeof window === 'undefined' || !userId?.trim()) return null;
  const current = owner.current?.userId === userId ? owner.current : storedSelection();
  const ownCurrent = current?.userId === userId ? current : null;
  const previous = read(previousKey(userId), true);
  const variantId = nextDashboardGreeting(isDashboardGreetingId(previous) ? previous : owner.previous.get(userId) ?? ownCurrent?.variantId, new Date().getHours(), ownCurrent?.variantId);
  const selection: DashboardGreetingSelection = {version: 1, userId, variantId, selectionId: window.crypto?.randomUUID?.() ?? `greeting-${new Date().getTime()}-${++owner.sequence}`};
  write(storageKey, JSON.stringify(selection)); remember(selection); publish(selection);
  return selection;
}

/** Reuse first; local time is read only when a new greeting really needs selection. */
export function resolveDashboardGreetingSession(userId: string) {
  if (typeof window === 'undefined' || !userId?.trim()) return null;
  if (owner.current?.userId === userId) return owner.current;
  const stored = storedSelection();
  if (stored?.userId === userId && !inheritedFromOpener(stored)) {owner.previous.set(userId, stored.variantId); publish(stored); return stored;}
  return beginDashboardGreetingSession(userId);
}

/** E2 logout hook. Not wired to the intentionally unavailable E1 Logout control. */
export function endDashboardGreetingSession(userId: string) {
  if (typeof window === 'undefined') return;
  const current = owner.current ?? storedSelection();
  if (current?.userId !== userId) return;
  // Ending an older tab must not overwrite a more recent tab's rotation history.
  write(storageKey, null); publish(null);
}
function subscribe(notify: () => void) {owner.listeners.add(notify); return () => {owner.listeners.delete(notify);};}
const serverSnapshot = () => null;

export function useDashboardGreeting() {
  const profile = useUserProfile(), userId = profile?.userId ?? '', t = useTranslations('Dashboard');
  const selection = useSyncExternalStore(subscribe, () => owner.current?.userId === userId ? owner.current : null, serverSnapshot);
  useEffect(() => {if (userId) resolveDashboardGreetingSession(userId);}, [userId]);
  const fallback = {title: t('overview.title'), subtitle: t('overview.description')};
  if (!selection || !t.has(`greetings.${selection.variantId}.title`) || !t.has(`greetings.${selection.variantId}.subtitle`)) return fallback;
  const firstName = greetingFirstName(profile);
  return {title: t(`greetings.${selection.variantId}.title`, {name: firstName ? 'named' : 'generic', firstName}), subtitle: t(`greetings.${selection.variantId}.subtitle`)};
}
