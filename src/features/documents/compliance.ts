import {calendarDaysUntil} from '@/lib/fixture-clock';
import type {DocumentComplianceStatus, DocumentStatus} from './types';

/** Callers supply their clock; the existing rule is not tied to a production demo clock. */
export function approvedCompliance(expiresAt: string | null, warningDays: number, referenceTime: string): Exclude<DocumentComplianceStatus, 'needs_review'> {
  if (!expiresAt) return 'valid';
  const days = calendarDaysUntil(expiresAt, referenceTime);
  return days < 0 ? 'expired' : days <= warningDays ? 'expiring_soon' : 'valid';
}

export function documentStatus(compliance: DocumentComplianceStatus): DocumentStatus {
  return compliance === 'needs_review' ? 'review' : compliance === 'expiring_soon' ? 'expiring' : compliance;
}
