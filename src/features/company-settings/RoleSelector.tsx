import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {companyRoles, type CompanyRole} from './types';
import {RoleIcon} from './RoleVisual';
import styles from './RoleSelector.module.css';

/** Canonical Invite Member radio selector, reused for membership/invitation edits. */
export function RoleSelector({id, label, value, onChange, error}: {id: string; label: string; value: CompanyRole | ''; onChange: (role: CompanyRole) => void; error?: string}) {
  const t = useTranslations('CompanyMembers');
  return <fieldset className={styles.roles} aria-describedby={error ? `${id}-role-error` : undefined}>
    <legend>{label} <span aria-hidden="true">*</span></legend>
    <div className={styles.roleOptions}>{companyRoles.map((option) => <label key={option} className={styles.roleOption} data-selected={value === option}>
      <input id={`${id}-${option}`} type="radio" name={`${id}-role`} value={option} checked={value === option} onChange={() => onChange(option)} required/>
      <RoleIcon role={option} size={20} diameter={36}/>
      <span className={styles.roleCopy}><strong>{t(`roles.${option}`)}</strong><small>{t(`roleDescriptions.${option}`)}</small></span>
      {value === option && <AppIcon name="check" size={19}/>}
    </label>)}</div>
    {error && <p id={`${id}-role-error`} className={styles.error} role="alert">{error}</p>}
  </fieldset>;
}
