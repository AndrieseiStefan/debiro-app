import {notificationsFixture} from './fixtures';
import type {AuditEvent, NotificationActivityItem} from './types';
import type {VendorListItem} from '@/features/vendors/types';

export function companyAuditEvents(companyId: string, local: AuditEvent[], fixtures = notificationsFixture.auditEvents) {
  return [...fixtures, ...local].filter((event) => event.companyId === companyId);
}

/** Successful local actions are activity, not fabricated delivered/unread notifications. */
export function companyNotifications(companyId: string, local: AuditEvent[], vendors: VendorListItem[], fixtures = notificationsFixture.notifications): NotificationActivityItem[] {
  return [...fixtures.filter((item) => item.companyId === companyId), ...local.filter((event) => event.companyId === companyId).map((event): NotificationActivityItem => ({
    id: event.id, companyId,
    type: event.eventType === 'document_marked_expired' ? 'status_changed' : ['template_applied', 'vendor_invited', 'vendor_edited', 'vendor_active', 'vendor_inactive', 'requirement_removed'].includes(event.eventType) ? 'other' : event.eventType as NotificationActivityItem['type'],
    title: event.action, description: event.description, vendorId: event.vendorId, documentId: event.documentId,
    vendorName: vendors.find((vendor) => vendor.id === event.vendorId)?.name, documentName: event.description,
    occurredAt: event.occurredAt, isUnread: false, actor: event.actorType, actorName: event.actorName
  }))];
}
