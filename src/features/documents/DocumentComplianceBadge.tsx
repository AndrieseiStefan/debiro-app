import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {StatusBadge} from '@/components/ui/StatusBadge';
import type {DocumentStatus} from './types';

/** Existing Details compliance treatment, shared without another status model. */
export function DocumentComplianceBadge({status}: {status: DocumentStatus}) {
  const t = useTranslations('Documents');
  return <StatusBadge indicator="none" tone={status === 'valid' ? 'success' : status === 'expiring' ? 'warning' : 'danger'}><AppIcon name={status === 'valid' ? 'check' : status === 'expiring' ? 'clock' : 'info'} size={13}/>{t(`status.${status}`)}</StatusBadge>;
}
