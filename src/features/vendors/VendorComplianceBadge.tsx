import {useTranslations} from 'next-intl';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import type {VendorStatus} from './types';
import styles from './VendorsListPage.module.css';

const tones: Record<VendorStatus, StatusTone> = {compliant: 'success', attention: 'warning', noncompliant: 'danger'};
const icons: Record<VendorStatus, AppIconName> = {compliant: 'check', attention: 'clock', noncompliant: 'close'};
export function VendorComplianceBadge({status}: {status: VendorStatus}) {
  const t = useTranslations('Vendors');
  return <StatusBadge tone={tones[status]} className={styles.statusBadge}><span className={styles.statusIcon}><AppIcon name={icons[status]} size={14}/></span>{t(`status.${status}`)}</StatusBadge>;
}
