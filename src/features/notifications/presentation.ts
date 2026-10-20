import type {AppIconName} from '@/components/layout/AppIcon';
import type {AuditEventType} from './types';
import ro from '../../../messages/ro.json';
import en from '../../../messages/en.json';
import type {EmployeeActivity} from '@/features/employees/employee-document-types';

export function employeeEventCopy(type: EmployeeActivity['type']) {
  return Object.hasOwn(ro.EmployeeDocuments.events, type) && Object.hasOwn(en.EmployeeDocuments.events, type) ? {ro: ro.EmployeeDocuments.events[type], en: en.EmployeeDocuments.events[type]} : null;
}

export function attentionCopy(status: 'missing' | 'expired' | 'needs_review' | 'expiring_soon') {
  return {ro: ro.CompanyDocuments.status[status], en: en.CompanyDocuments.status[status]};
}

export const activityIcons: Record<AuditEventType, AppIconName> = {
  reminder: 'bell', document_upload: 'upload', document_replaced: 'upload', document_marked_expired: 'clock', document_confirmed: 'check', document_rejected: 'close', document_expiring: 'clock',
  document_missing: 'fileX', status_changed: 'clock', vendor_added: 'users', other: 'info',
  template_applied: 'file', vendor_invited: 'send', vendor_edited: 'edit', vendor_active: 'check', vendor_inactive: 'close', requirement_removed: 'fileX', employee_created: 'users', employee_edited: 'edit', metadata_updated: 'edit'
};

export const activityTones: Record<AuditEventType, string> = {
  reminder: 'blue', document_upload: 'blue', document_replaced: 'blue', document_marked_expired: 'red', document_confirmed: 'green', document_rejected: 'red', document_expiring: 'amber',
  document_missing: 'red', status_changed: 'blue', vendor_added: 'blue', other: 'blue',
  template_applied: 'blue', vendor_invited: 'blue', vendor_edited: 'amber', vendor_active: 'green', vendor_inactive: 'red', requirement_removed: 'red', employee_created: 'blue', employee_edited: 'amber', metadata_updated: 'blue'
};
