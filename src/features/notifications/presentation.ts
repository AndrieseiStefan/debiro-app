import type {AppIconName} from '@/components/layout/AppIcon';
import type {NotificationActivityType} from './types';

export const activityIcons: Record<NotificationActivityType, AppIconName> = {
  reminder: 'bell', document_upload: 'upload', document_confirmed: 'check', document_expiring: 'clock',
  document_missing: 'fileX', status_changed: 'clock', vendor_added: 'users', other: 'info'
};

export const activityTones: Record<NotificationActivityType, string> = {
  reminder: 'blue', document_upload: 'blue', document_confirmed: 'green', document_expiring: 'amber',
  document_missing: 'red', status_changed: 'blue', vendor_added: 'blue', other: 'blue'
};
