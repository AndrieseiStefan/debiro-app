import {notificationsFixture} from './fixtures';
import type {AuditEvent, NotificationActivityItem} from './types';
import type {VendorListItem} from '@/features/vendors/types';

export function companyAuditEvents(companyId: string, local: AuditEvent[], fixtures = notificationsFixture.auditEvents) {
  // E1 has no delivery processor. Seeded sent-reminder notices remain notifications,
  // never evidence of an actual send in a domain timeline or exported audit.
  return [...(Array.isArray(fixtures) ? fixtures : []).filter((event) => event && event.eventType !== 'reminder'), ...(Array.isArray(local) ? local : [])].filter((event) => event && event.companyId === companyId);
}

/** Successful local actions are activity, not fabricated delivered/unread notifications. */
export function companyNotifications(companyId: string, local: AuditEvent[], vendors: VendorListItem[], fixtures = notificationsFixture.notifications): NotificationActivityItem[] {
  return [...(Array.isArray(fixtures) ? fixtures : []).filter((item) => item && item.companyId === companyId), ...(Array.isArray(local) ? local : []).filter((event) => event && event.companyId === companyId && event.eventType !== 'reminder' && event.domain !== 'employee' && event.eventType !== 'employee_created' && event.eventType !== 'employee_edited').map((event): NotificationActivityItem => ({
    id: event.id, companyId,
    type: event.eventType === 'document_marked_expired' ? 'status_changed' : ['template_applied', 'vendor_invited', 'vendor_edited', 'vendor_active', 'vendor_inactive', 'requirement_removed'].includes(event.eventType) ? 'other' : event.eventType as NotificationActivityItem['type'],
    title: event.action, description: event.description, vendorId: event.vendorId, documentId: event.documentId,
    domain: event.domain, entityId: event.entityId, entityName: event.entityName, requirementId: event.requirementId,
    vendorName: vendors.find((vendor) => vendor.id === event.vendorId)?.name, documentName: event.description,
    occurredAt: event.occurredAt, isUnread: false, actor: event.actorType, actorName: event.actorName
  }))];
}
