'use client';

import {useCallback, useRef, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {Drawer, DrawerHeader} from '@/components/ui/Drawer';
import {Field} from '@/components/ui/Field';
import {TextareaField} from '@/components/ui/TextareaField';
import {Avatar} from '@/components/ui/Avatar';
import {Surface} from '@/components/ui/Surface';
import {Button} from '@/components/ui/Button';
import {Tooltip} from '@/components/ui/Tooltip';
import {AppIcon} from '@/components/layout/AppIcon';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {employeeAccess, getEmployee, useEmployeeState} from './employees-state';
import {employeeName} from './projections';
import {validateReminderDraft, validReminderRecipient, type EmployeeReminderDraft, type EmployeeReminderErrors} from './reminder-draft';
import shared from '@/features/company-documents/CompanyShareDrawer.module.css';
import formStyles from '@/features/vendors/AddVendorDrawer.module.css';
import styles from './Employees.module.css';

export function EmployeeReminderDrawer({companyId, employeeId, onClose, onEditEmployee}: {companyId: string; employeeId: string; onClose: () => void; onEditEmployee: () => void}) {
  const t = useTranslations('EmployeeReminder'), people = useTranslations('Employees'), documents = useTranslations('EmployeeDocuments'), common = useTranslations('DocumentManagement');
  const companies = useCompanyState(); useEmployeeState();
  const company = getActiveCompany(companies), employee = getEmployee(companyId, employeeId);
  const [draft, setDraft] = useState<EmployeeReminderDraft>(() => ({subject: t('defaultSubject', {company: company?.company.name ?? ''}), message: ''}));
  const [errors, setErrors] = useState<EmployeeReminderErrors>({}), [phase, setPhase] = useState<'open' | 'closing'>('open');
  const trigger = useRef<HTMLElement | null>(typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const form = useRef<HTMLFormElement>(null), editAfterClose = useRef(false);
  const close = useCallback(() => {setDraft({subject: '', message: ''}); setErrors({}); setPhase('closing');}, [setDraft, setErrors, setPhase]);
  const finish = () => {onClose(); if (editAfterClose.current) requestAnimationFrame(() => {if (employeeAccess(companyId).manage && getEmployee(companyId, employeeId)) onEditEmployee();});};
  function update(key: keyof EmployeeReminderDraft, value: string) {setDraft((current) => ({...current, [key]: value})); setErrors((current) => ({...current, [key]: undefined}));}
  function validateField(key: keyof EmployeeReminderDraft) {
    const result = validateReminderDraft(draft);
    if (key === 'subject') setDraft((current) => ({...current, subject: result.draft.subject}));
    setErrors((current) => ({...current, [key]: result.errors[key]}));
  }
  function validateForm(event: FormEvent) {
    event.preventDefault();
    if (phase === 'closing' || !employeeAccess(companyId).manage || !getEmployee(companyId, employeeId)) return;
    const result = validateReminderDraft(draft); setDraft(result.draft); setErrors(result.errors);
    if (Object.keys(result.errors).length) requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }
  // Composition is independent of employee documents, but never of company/personnel authorization.
  if (companies.activeCompanyId !== companyId || !employeeAccess(companyId, companies).manage || !employee || employee.companyId !== companyId) return null;
  const recipientInvalid = !validReminderRecipient(employee.email);
  const send = <Tooltip content={t('sendUnavailable')} layer="drawer">{(props) => <Button {...props} aria-disabled="true" onKeyDown={(event) => {if (['Enter', ' '].includes(event.key)) event.preventDefault();}}><AppIcon name="send" size={19}/>{t('send')}</Button>}</Tooltip>;
  return <Drawer phase={phase} onClose={close} onExited={finish} triggerRef={trigger} titleId="employee-reminder-title" descriptionId="employee-reminder-description" closeLabel={common('close')} contentClassName={shared.content}>
    <DrawerHeader titleId="employee-reminder-title" title={documents('sendReminder')}/>
    <p id="employee-reminder-description" className={formStyles.intro}>{t('description')}</p>
    <form ref={form} noValidate onSubmit={validateForm} className={styles.form}>
      {recipientInvalid && <div className={shared.invalid} role="alert"><span>{t('invalidRecipient')}</span><Button variant="secondary" onClick={() => {editAfterClose.current = true; close();}}>{people('edit')}</Button></div>}
      <Surface role="region" aria-labelledby="employee-reminder-recipient" className={`${styles.formSection} ${styles.reminderRecipient}`}>
        <p id="employee-reminder-recipient" className="text-label">{t('recipient')}</p>
        <div className={styles.reminderIdentity}><Avatar initials={`${employee.firstName[0]}${employee.lastName[0]}`}/><div className={shared.documentCopy}>
          <strong>{employeeName(employee)}</strong>
          <small className={styles.reminderEmail}><AppIcon name="mail" size={16}/><span>{employee.email || t('noEmail')}</span></small>
        </div></div>
      </Surface>
      <Field id="employee-reminder-subject" controlSize="compact" label={t('subject')} required maxLength={150} value={draft.subject} onChange={(event) => update('subject', event.target.value)} onBlur={() => validateField('subject')} error={errors.subject && t(`errors.${errors.subject}`)} disabled={phase === 'closing'}/>
      <TextareaField id="employee-reminder-message" controlSize="compact" label={t('message')} required maxLength={5000} value={draft.message} placeholder={t('messagePlaceholder')} onChange={(event) => update('message', event.target.value)} onBlur={() => validateField('message')} error={errors.message && t(`errors.${errors.message}`)} disabled={phase === 'closing'}/>
      <div className={`${formStyles.actions} ${styles.actions}`}><Button variant="secondary" onClick={close}>{common('cancel')}</Button>{send}</div>
    </form>
  </Drawer>;
}
