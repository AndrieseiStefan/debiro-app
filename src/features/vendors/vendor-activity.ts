import {companyAuditEvents} from '@/features/notifications/company-projections';
import type {AuditEvent, AuditEventType} from '@/features/notifications/types';
import type {LocalAuditEvent} from '@/features/notifications/local-audit';
import {vendorOwnedByCompany} from './created-vendors';

/** One audit projection: merge existing audit/notices, without repeating the same event. */
export function vendorActivity(companyId: string, vendorId: string, local: LocalAuditEvent[]): AuditEvent[] {
  if (!vendorOwnedByCompany(companyId, vendorId)) return [];
  // Local audit records have distinct identities. Separate successful actions
  // (including applying several templates) can share a timestamp.
  return [...new Map(companyAuditEvents(companyId, local).filter((event) => event.vendorId === vendorId && Number.isFinite(Date.parse(event.occurredAt))).map((event) => [event.id, event])).values()]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));
}
export type VendorActivityFilters = {type: AuditEventType | 'all'; range: 'all' | 'last7' | 'last30'; actor: string};
export function filterVendorActivity(events: AuditEvent[], query: string, filters: VendorActivityFilters, language: 'ro' | 'en', referenceTime: string) {
  const search = query.trim().toLocaleLowerCase(language);
  const cutoff = Date.parse(referenceTime) - (filters.range === 'last7' ? 7 : 30) * 86_400_000;
  return events.filter((event) => (filters.type === 'all' || event.eventType === filters.type) && (filters.actor === 'all' || (event.actorName ?? (event.actorType === 'system' ? 'system' : '')) === filters.actor)
    && (filters.range === 'all' || Date.parse(event.occurredAt) >= cutoff)
    && `${event.action[language]} ${event.description[language]} ${event.actorName ?? ''}`.toLocaleLowerCase(language).includes(search));
}
