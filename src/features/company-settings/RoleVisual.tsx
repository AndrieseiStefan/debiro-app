import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import type {CompanyRole} from './types';
import styles from './RoleVisual.module.css';

export const rolePresentation: Record<CompanyRole, {icon: AppIconName}> = {
  administrator: {icon: 'crown'},
  reviewer: {icon: 'shield'},
  viewer: {icon: 'eye'}
};

export function RoleBadge({role, label, className, iconSize = 17}: {role: CompanyRole; label: string; className?: string; iconSize?: number}) {
  return <span className={`${styles.tone} ${styles.badge} ${className ?? ''}`} data-role={role}>
    <AppIcon name={rolePresentation[role].icon} size={iconSize}/>{label}
  </span>;
}

export function RoleIcon({role, size = 23, diameter = 40}: {role: CompanyRole; size?: number; diameter?: number}) {
  return <span className={`${styles.tone} ${styles.icon}`} data-role={role} style={{width: diameter, height: diameter}}>
    <AppIcon name={rolePresentation[role].icon} size={size}/>
  </span>;
}
