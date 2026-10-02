import {notificationsFixture} from '@/features/notifications/fixtures';
import {documentsFixture} from '@/features/documents/fixtures';
import type {AuditEvent, AuditEventType} from '@/features/notifications/types';
import type {LocalAuditEvent} from '@/features/notifications/local-audit';
import {vendorFixtureCompanyId, vendorOwnedByCompany} from './created-vendors';

/** One audit projection: merge existing audit/notices, without repeating the same event. */
export function vendorActivity(companyId: string, vendorId: string, local: LocalAuditEvent[]): AuditEvent[] {
  if (!vendorOwnedByCompany(companyId, vendorId)) return [];
  const fixtures: AuditEvent[] = companyId === vendorFixtureCompanyId ? [
    ...notificationsFixture.auditEvents,
    ...notificationsFixture.notifications.map((item) => ({id: item.id, eventType: item.type, actorType: item.actor, actorName: item.actorName,
      action: item.title, description: item.documentName ?? item.description, vendorId: item.vendorId, documentId: item.documentId, occurredAt: item.occurredAt})),
    ...documentsFixture.documents.map((document): AuditEvent => ({id: `upload:${document.id}`, vendorId: document.vendorId, documentId: document.id,
      eventType: 'document_upload', actorType: 'user', action: {ro: 'Document încărcat', en: 'Document uploaded'}, description: document.documentName, occurredAt: `${document.uploadedAt}T00:00:00.000Z`, dateOnly: true}))
  ] : [];
  const seen = new Set<string>();
  const uniqueFixtures = fixtures.filter((event) => {
    if (event.vendorId !== vendorId) return false;
    const key = `${event.eventType}:${event.vendorId}:${event.documentId ?? ''}:${event.occurredAt}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  // Local audit records have distinct identities. Separate successful actions
  // (including applying several templates) can share a timestamp.
  return [...uniqueFixtures, ...local.filter((event) => event.companyId === companyId && event.vendorId === vendorId)]
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
