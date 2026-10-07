export type LocalizedText = {ro: string; en: string};

/** Operational, potentially actionable activity. Reusable by the later bell center. */
export type NotificationActivityType = 'reminder' | 'document_upload' | 'document_replaced' | 'document_confirmed' | 'document_rejected' | 'document_expiring' | 'document_missing' | 'status_changed' | 'vendor_added' | 'other';
export type NotificationActivityItem = {
  id: string;
  type: NotificationActivityType;
  title: LocalizedText;
  description: LocalizedText;
  vendorId?: string;
  vendorName?: string;
  documentId?: string;
  documentName?: LocalizedText;
  occurredAt: string;
  isUnread: boolean;
  actor: 'user' | 'system';
  actorName?: string;
};

/** Read-only history: a distinct contract from notifications. */
export type AuditEvent = {
  id: string;
  eventType: AuditEventType;
  actorType: 'user' | 'system';
  actorName?: string;
  action: LocalizedText;
  description: LocalizedText;
  vendorId?: string;
  documentId?: string;
  templateId?: string;
  requirementId?: string;
  previousDocumentId?: string;
  documentVersion?: number;
  previousDocumentVersion?: number;
  occurredAt: string;
  dateOnly?: boolean;
};
export type AuditEventType = NotificationActivityType | 'document_marked_expired' | 'template_applied' | 'vendor_invited' | 'vendor_edited' | 'vendor_active' | 'vendor_inactive' | 'requirement_removed';

export type ExpiringDocumentSummary = {
  id: string;
  vendorId: string;
  vendorName: string;
  documentName: LocalizedText;
  expiresAt: string;
  daysRemaining: number;
  status: 'expiring';
};

export type MissingDocumentSummary = {
  id: string;
  vendorId: string;
  vendorName: string;
  documentName: LocalizedText;
  requirement: LocalizedText;
  dueAt: string | null;
  status: 'missing';
};

export type NotificationsViewModel = {
  referenceTime: string;
  user: {fullName: string; initials: string};
  organization: {name: string};
  notifications: NotificationActivityItem[];
  auditEvents: AuditEvent[];
  expiringDocuments: ExpiringDocumentSummary[];
  missingDocuments: MissingDocumentSummary[];
};
