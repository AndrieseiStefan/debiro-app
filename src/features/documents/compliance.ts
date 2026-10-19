import {calendarDaysUntil} from '@/lib/fixture-clock';
import type {DocumentComplianceStatus, DocumentReviewApplicability, DocumentStatus} from './types';

/** Callers supply their clock; the existing rule is not tied to a production demo clock. */
export function approvedCompliance(expiresAt: string | null, warningDays: number, referenceTime: string, manuallyExpiredAt?: string): Exclude<DocumentComplianceStatus, 'needs_review'> {
  if (manuallyExpiredAt) return 'expired';
  if (!expiresAt) return 'valid';
  const days = calendarDaysUntil(expiresAt, referenceTime);
  return days < 0 ? 'expired' : days <= warningDays ? 'expiring_soon' : 'valid';
}

export function canManuallyExpire(document: {complianceStatus: DocumentComplianceStatus; reviewOutcome: string; supersededById?: string}, reviewApplicability: DocumentReviewApplicability = 'required') {
  return !document.supersededById && (document.reviewOutcome === 'approved' || reviewApplicability === 'not_required' && document.reviewOutcome !== 'rejected') && ['valid', 'expiring_soon'].includes(document.complianceStatus);
}

export function documentStatus(compliance: DocumentComplianceStatus): DocumentStatus {
  return compliance === 'needs_review' ? 'review' : compliance === 'expiring_soon' ? 'expiring' : compliance;
}
