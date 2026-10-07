'use client';

import {fixtureReferenceTime} from '@/lib/fixture-clock';
import {useSyncExternalStore} from 'react';
import {currentUser} from '@/features/companies/company-state';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import type {AuditEvent} from './types';
import {browserSession} from '@/lib/browser-session';

export type LocalAuditEvent = AuditEvent & {companyId: string; actorId?: string};
const initial: LocalAuditEvent[] = [];
const session = browserSession(Symbol.for('debiro.local-audit-session'), () => ({events: initial, initial, listeners: new Set<() => void>()}));
const subscribe = (listener: () => void) => {session.listeners.add(listener); return () => {session.listeners.delete(listener);};};
export function useLocalAuditEvents() {return useSyncExternalStore(subscribe, () => session.events, () => session.initial);}
export function readLocalAuditEvents() {return session.events;}

/** Record successful local actions only; these are not delivered notices or server audit records. */
export function recordLocalAuditEvent(companyId: string, event: Omit<AuditEvent, 'id' | 'occurredAt' | 'actorType'> & {actorId?: string; actorType?: AuditEvent['actorType']; occurredAt?: string}) {
  session.events = [{...event, companyId, id: `local-audit-${crypto.randomUUID()}`, occurredAt: event.occurredAt ?? fixtureReferenceTime,
    actorType: event.actorType ?? 'user', actorId: event.actorId ?? companySettingsFixture.members.find((member) => member.isCurrentUser)?.userId, actorName: event.actorName ?? currentUser.fullName}, ...session.events];
  session.listeners.forEach((listener) => listener());
}
