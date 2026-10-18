'use client';

import {useCallback, useRef, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {Drawer, DrawerHeader} from '@/components/ui/Drawer';
import {Field} from '@/components/ui/Field';
import {TextareaField} from '@/components/ui/TextareaField';
import {Button} from '@/components/ui/Button';
import {Tooltip} from '@/components/ui/Tooltip';
import {AppIcon} from '@/components/layout/AppIcon';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {employeeAccess, getEmployee, useEmployeeState} from './employees-state';
import {employeeName} from './projections';
import {validateReminderDraft, validReminderRecipient, type EmployeeReminderDraft, type EmployeeReminderErrors} from './reminder-draft';
import shared from '@/features/company-documents/CompanyShareDrawer.module.css';
import controls from '@/features/vendors/InviteVendorDrawer.module.css';

export function EmployeeReminderDrawer({companyId, employeeId, onClose, onEditEmployee}: {companyId: string; employeeId: string; onClose: () => void; onEditEmployee: () => void}) {
  const t = useTranslations('EmployeeReminder'), people = useTranslations('Employees'), documents = useTranslations('EmployeeDocuments'), common = useTranslations('DocumentManagement');
  const companies = useCompanyState(); useEmployeeState();
  const company = getActiveCompany(companies), employee = getEmployee(companyId, employeeId);
  const [draft, setDraft] = useState<EmployeeReminderDraft>(() => ({subject: t('defaultSubject', {company: company?.company.name ?? ''}), message: ''}));
  const [errors, setErrors] = useState<EmployeeReminderErrors>({}), [preview, setPreview] = useState<EmployeeReminderDraft | null>(null), [phase, setPhase] = useState<'open' | 'closing'>('open');
  const trigger = useRef<HTMLElement | null>(typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const form = useRef<HTMLFormElement>(null), previewRef = useRef<HTMLElement>(null), subjectRef = useRef<HTMLInputElement>(null), editAfterClose = useRef(false);
  const close = useCallback(() => {setDraft({subject: '', message: ''}); setPreview(null); setErrors({}); setPhase('closing');}, [setDraft, setPreview, setErrors, setPhase]);
  const finish = () => {onClose(); if (editAfterClose.current) requestAnimationFrame(() => {if (employeeAccess(companyId).manage && getEmployee(companyId, employeeId)) onEditEmployee();});};
  function update(key: keyof EmployeeReminderDraft, value: string) {setDraft((current) => ({...current, [key]: value})); setErrors((current) => ({...current, [key]: undefined}));}
  function showPreview(event: FormEvent) {
    event.preventDefault();
    if (phase === 'closing' || !employeeAccess(companyId).manage || !getEmployee(companyId, employeeId)) return;
    const result = validateReminderDraft(draft); setErrors(result.errors);
    if (Object.keys(result.errors).length) requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    else {setDraft(result.draft); setPreview(result.draft); requestAnimationFrame(() => previewRef.current?.focus());}
  }
  // Composition is independent of employee documents, but never of company/personnel authorization.
  if (companies.activeCompanyId !== companyId || !employeeAccess(companyId, companies).manage || !employee || employee.companyId !== companyId) return null;
  const recipientInvalid = !validReminderRecipient(employee.email);
  const recipient = <><p>{employeeName(employee)}</p><p>{employee.email || t('noEmail')}</p></>;
  const send = <Tooltip content={t('sendUnavailable')} layer="drawer">{(props) => <Button {...props} aria-disabled="true" onKeyDown={(event) => {if (['Enter', ' '].includes(event.key)) event.preventDefault();}}><AppIcon name="send" size={19}/>{t('send')}</Button>}</Tooltip>;
  return <Drawer phase={phase} onClose={close} onExited={finish} triggerRef={trigger} titleId="employee-reminder-title" descriptionId="employee-reminder-description" closeLabel={common('close')} contentClassName={shared.content}>
    <DrawerHeader titleId="employee-reminder-title" title={documents('sendReminder')}/>
    <p id="employee-reminder-description" className={controls.intro}>{t('description')}</p>
    <form ref={form} noValidate onSubmit={showPreview} className={shared.form}>
      {recipientInvalid && <div className={shared.invalid} role="alert"><span>{t('invalidRecipient')}</span><Button variant="secondary" onClick={() => {editAfterClose.current = true; close();}}>{people('edit')}</Button></div>}
      {preview ? <section ref={previewRef} tabIndex={-1} className={shared.preview} aria-labelledby="employee-reminder-preview">
        <h3 id="employee-reminder-preview">{t('preview')}</h3>
        <dl><div><dt>{t('recipient')}</dt><dd>{recipient}</dd></div><div><dt>{t('subject')}</dt><dd>{preview.subject}</dd></div></dl>
        <strong>{t('message')}</strong><p className={shared.message}>{preview.message}</p>
      </section> : <>
        <section className={shared.preview} aria-labelledby="employee-reminder-recipient"><h3 id="employee-reminder-recipient">{t('recipient')}</h3>{recipient}</section>
        <Field ref={subjectRef} id="employee-reminder-subject" controlSize="compact" label={t('subject')} required maxLength={150} value={draft.subject} onChange={(event) => update('subject', event.target.value)} error={errors.subject && t(`errors.${errors.subject}`)} disabled={phase === 'closing'}/>
        <TextareaField id="employee-reminder-message" controlSize="compact" label={t('message')} required maxLength={5000} value={draft.message} placeholder={t('messagePlaceholder')} onChange={(event) => update('message', event.target.value)} error={errors.message && t(`errors.${errors.message}`)} disabled={phase === 'closing'}/>
      </>}
      <p className={controls.demoNote}>{t('note')}</p>
      <div className={shared.actions} data-wrap="content">{preview ? <Button variant="secondary" onClick={() => {setPreview(null); requestAnimationFrame(() => subjectRef.current?.focus());}}>{t('back')}</Button> : <><Button variant="secondary" onClick={close}>{common('cancel')}</Button><Button type="submit" variant="secondary" disabled={phase === 'closing'}><AppIcon name="eye" size={19}/>{t('preview')}</Button></>}{send}</div>
    </form>
  </Drawer>;
}
