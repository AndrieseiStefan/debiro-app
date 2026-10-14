'use client';

import {useState, type FormEvent, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {Drawer, type DrawerPhase} from '@/components/ui/Drawer';
import {Field} from '@/components/ui/Field';
import {type CompanyMembership, type CompanyRole} from './types';
import {RoleSelector} from './RoleSelector';
import styles from './InviteMemberDrawer.module.css';

type Errors = Partial<Record<'name' | 'email' | 'role', string>>;

export function InviteMemberDrawer({phase, onClose, onExited, triggerRef, company, members, onInvite}: {
  phase: DrawerPhase;
  onClose: () => void;
  onExited: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  company: {id: string; name: string};
  members: CompanyMembership[];
  onInvite: (input: {companyId: string; fullName: string; email: string; role: CompanyRole}) => boolean;
}) {
  const t = useTranslations('CompanyMembers');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CompanyRole | ''>('');
  const [errors, setErrors] = useState<Errors>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const nextErrors: Errors = {};
    if (!name.trim()) nextErrors.name = t('validation.nameRequired');
    if (!trimmedEmail) nextErrors.email = t('validation.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) nextErrors.email = t('validation.emailInvalid');
    else if (members.some((member) => member.companyId === company.id && member.email.trim().toLowerCase() === trimmedEmail.toLowerCase())) nextErrors.email = t('validation.emailDuplicate');
    if (!role) nextErrors.role = t('validation.roleRequired');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(`invite-member-${nextErrors.name ? 'name' : nextErrors.email ? 'email' : 'administrator'}`)?.focus();
      return;
    }
    if (!onInvite({companyId: company.id, fullName: name.trim(), email: trimmedEmail, role: role as CompanyRole})) {
      setErrors({email: t('validation.emailDuplicate')});
      document.getElementById('invite-member-email')?.focus();
    }
  }

  return <Drawer phase={phase} onClose={onClose} onExited={onExited} triggerRef={triggerRef} titleId="invite-member-title" descriptionId="invite-member-description" closeLabel={t('drawer.close')} panelClassName={styles.panel} contentClassName={styles.content}>
    <h2 id="invite-member-title">{t('drawer.title')}</h2>
    <p id="invite-member-description" className={styles.intro}>{t('drawer.description')}</p>
    <form noValidate onSubmit={submit} className={styles.form}>
      <Field id="invite-member-name" label={t('drawer.name')} required value={name} onChange={(event) => {setName(event.target.value); setErrors((current) => ({...current, name: undefined}));}} error={errors.name}/>
      <Field id="invite-member-email" label={t('drawer.email')} type="email" required value={email} onChange={(event) => {setEmail(event.target.value); setErrors((current) => ({...current, email: undefined}));}} error={errors.email}/>
      <Field id="invite-member-company" label={t('drawer.company')} value={company.name} readOnly required helperText={t('drawer.companyHelp')}/>
      <RoleSelector id="invite-member" label={t('drawer.role')} value={role} error={errors.role} onChange={(value) => {setRole(value); setErrors((current) => ({...current, role: undefined}));}}/>
      <div className={styles.notice}><AppIcon name="info" size={21}/><p><strong>{t('drawer.subscriptionNoteTitle')}</strong><span>{t('drawer.subscriptionNote')}</span><small>{t('drawer.demoNotice')}</small></p></div>
      <div className={styles.actions}><Button variant="secondary" onClick={onClose}>{t('drawer.cancel')}</Button><Button type="submit"><AppIcon name="send" size={18}/>{t('drawer.submit')}</Button></div>
    </form>
  </Drawer>;
}
