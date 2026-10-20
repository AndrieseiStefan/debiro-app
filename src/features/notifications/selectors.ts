import type {AuditEvent, NotificationActivityItem} from './types';
import {csvCell} from '@/lib/csv';

export type ActivityCategory = 'all' | 'unread' | 'reminders' | 'uploads' | 'status';
export type ActivityRange = 'last30' | 'last7' | 'all';

function withinRange(occurredAt: string, range: ActivityRange, referenceTime: string) {
  const eventTime = Date.parse(occurredAt);
  const reference = Date.parse(referenceTime);
  if (!Number.isFinite(eventTime) || !Number.isFinite(reference) || eventTime > reference) return false;
  if (range === 'all') return true;
  const days = range === 'last7' ? 7 : 30;
  return eventTime >= reference - days * 24 * 60 * 60 * 1000;
}

export function filterNotifications(items: NotificationActivityItem[], category: ActivityCategory, range: ActivityRange, referenceTime: string) {
  return items.filter((item) => withinRange(item.occurredAt, range, referenceTime) && (
    category === 'all' ||
    (category === 'unread' && item.isUnread) ||
    (category === 'reminders' && item.type === 'reminder') ||
    (category === 'uploads' && item.type === 'document_upload') ||
    (category === 'status' && item.type === 'status_changed')
  )).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id));
}

export function filterAuditEvents<T extends AuditEvent>(events: T[], range: ActivityRange, referenceTime: string) {
  return events.filter((event) => withinRange(event.occurredAt, range, referenceTime)).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id));
}

export function auditEventsToCsv(events: AuditEvent[], locale: 'ro' | 'en') {
  const header = ['id', 'eventType', 'actorType', 'actorName', 'action', 'description', 'vendorId', 'documentId', 'occurredAt', 'domain', 'entityId', 'entityName', 'requirementId'];
  return [header.join(','), ...events.map((event) => [
    event.id, event.eventType, event.actorType, event.actorName ?? '', event.action[locale], event.description[locale], event.vendorId ?? '', event.documentId ?? '', event.occurredAt, event.domain ?? 'vendor', event.entityId ?? event.vendorId ?? '', event.entityName ?? '', event.requirementId ?? ''
  ].map(csvCell).join(','))].join('\r\n') + '\r\n';
}
