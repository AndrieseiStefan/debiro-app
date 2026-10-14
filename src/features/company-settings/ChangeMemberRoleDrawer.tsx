'use client';

import {useCallback, useState, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {Drawer, type DrawerPhase} from '@/components/ui/Drawer';
import {Button} from '@/components/ui/Button';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import type {MemberManagementResult} from '@/features/companies/company-state';
import {RoleSelector} from './RoleSelector';
import type {CompanyMembership, CompanyRole} from './types';
import styles from './InviteMemberDrawer.module.css';

export function ChangeMemberRoleDrawer({member, phase, onClose, onExited, triggerRef, onSave}: {member: CompanyMembership; phase: DrawerPhase; onClose: () => void; onExited: () => void; triggerRef: RefObject<HTMLButtonElement | null>; onSave: (role: CompanyRole) => MemberManagementResult}) {
  const t = useTranslations('CompanyMembers');
  const [role, setRole] = useState(member.role);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelConfirmation = useCallback(() => setConfirm(false), []);
  function save() {const result = onSave(role); setConfirm(false); if (result.ok) onClose(); else setError(t(`management.errors.${result.reason}`));}
  return <Drawer phase={phase} onClose={onClose} onExited={onExited} triggerRef={triggerRef} titleId="change-member-role-title" descriptionId="change-member-role-description" closeLabel={t('management.close')} panelClassName={styles.panel} contentClassName={styles.content}>
    <h2 id="change-member-role-title">{t('management.changeRoleTitle')}</h2>
    <p id="change-member-role-description" className={styles.intro}>{t('management.identity', {name: member.fullName, email: member.email})}</p>
    <p className={styles.intro}>{t('management.currentRole', {role: t(`roles.${member.role}`)})}</p>
    <form className={styles.form} onSubmit={(event) => {event.preventDefault(); setConfirm(true);}}>
      <RoleSelector id="member-role" label={t('drawer.role')} value={role} onChange={(value) => {setRole(value); setError(null);}}/>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}><Button variant="secondary" onClick={onClose}>{t('drawer.cancel')}</Button><Button type="submit" disabled={role === member.role}>{t('management.changeRole')}</Button></div>
    </form>
    {confirm && <ConfirmationDialog confirmVariant="primary" title={t('management.confirmRoleTitle')} description={t('management.confirmRoleDescription', {name: member.fullName, email: member.email, oldRole: t(`roles.${member.role}`), newRole: t(`roles.${role}`)})} cancelLabel={t('drawer.cancel')} confirmLabel={t('management.changeRole')} onCancel={cancelConfirmation} onConfirm={save} backgroundSelector="[role='dialog'][aria-labelledby='change-member-role-title']"/>}
  </Drawer>;
}
