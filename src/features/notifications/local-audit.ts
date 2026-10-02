'use client';

import {useSyncExternalStore} from 'react';
import {currentUser} from '@/features/companies/company-state';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import type {AuditEvent} from './types';

export type LocalAuditEvent = AuditEvent & {companyId: string; actorId?: string};
const initial: LocalAuditEvent[] = [];
let events = initial;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {listeners.add(listener); return () => {listeners.delete(listener);};};
export function useLocalAuditEvents() {return useSyncExternalStore(subscribe, () => events, () => initial);}
export function readLocalAuditEvents() {return events;}

/** Record successful local actions only; these are not delivered notices or server audit records. */
export function recordLocalAuditEvent(companyId: string, event: Omit<AuditEvent, 'id' | 'occurredAt' | 'actorType'> & {actorType?: AuditEvent['actorType']; occurredAt?: string}) {
  events = [{...event, companyId, id: `local-audit-${crypto.randomUUID()}`, occurredAt: event.occurredAt ?? new Date().toISOString(),
    actorType: event.actorType ?? 'user', actorId: companySettingsFixture.members.find((member) => member.isCurrentUser)?.userId, actorName: event.actorName ?? currentUser.fullName}, ...events];
  listeners.forEach((listener) => listener());
}
