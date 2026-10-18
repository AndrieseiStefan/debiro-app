'use client';

import {useCallback, useRef, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {Drawer, DrawerHeader} from '@/components/ui/Drawer';
import {Field} from '@/components/ui/Field';
import {SelectField} from '@/components/ui/SelectField';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {AppIcon} from '@/components/layout/AppIcon';
import {normalizeDocumentName} from '@/features/requirements/catalog';
import {reviewDateToIso} from '@/features/documents/created-documents';
import {useCompanyState} from '@/features/companies/company-state';
import {createEmployee, employeeAccess, employeeWorkspace, getEmployee, updateEmployee, useEmployeeState} from './employees-state';
import {employeeInput} from './employee-form';
import {jobTitleSuggestions} from './projections';
import {EmployeeSuggestionField} from './EmployeeSuggestionField';
import type {EmployeeErrors} from './types';
import styles from './Employees.module.css';
import formStyles from '@/features/vendors/AddVendorDrawer.module.css';

export function EmployeeDrawer({companyId, employeeId, onClose, onSuccess}: {companyId: string; employeeId?: string; onClose: () => void; onSuccess: (kind: 'added' | 'updated', employeeId: string) => void}) {
  const t = useTranslations('Employees'), common = useTranslations('DocumentManagement');
  const companies = useCompanyState(), snapshot = useEmployeeState(), workspace = employeeWorkspace(companyId, snapshot);
  const [original] = useState(() => employeeId ? getEmployee(companyId, employeeId) : null);
  const [input, setInput] = useState(() => employeeInput(original ?? undefined));
  const [hireDate, setHireDate] = useState(() => input.hireDate ? input.hireDate.split('-').reverse().join('.') : '');
  const [departmentQuery, setDepartmentQuery] = useState(() => workspace.departments.find((item) => item.id === original?.departmentId)?.name ?? '');
  const [errors, setErrors] = useState<EmployeeErrors>({}), [failure, setFailure] = useState('');
  const [phase, setPhase] = useState<'open' | 'closing'>('open');
  const submitting = useRef(false), form = useRef<HTMLFormElement>(null);
  const trigger = useRef<HTMLElement | null>(typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const close = useCallback(() => setPhase('closing'), []);
  const access = employeeAccess(companyId), unavailable = workspace.error || Boolean(employeeId && !getEmployee(companyId, employeeId));
  function update<Key extends keyof typeof input>(key: Key, value: typeof input[Key]) {setInput((current) => ({...current, [key]: value})); setErrors((current) => ({...current, [key]: undefined})); setFailure('');}
  function submit(event: FormEvent) {
    event.preventDefault(); if (submitting.current) return;
    if (departmentQuery.trim() && input.department.kind === 'none') {setErrors({department: 'department'}); requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('#employee-department')?.focus()); return;}
    submitting.current = true;
    const values = {...input, hireDate: reviewDateToIso(hireDate) ?? ''};
    const result = employeeId ? updateEmployee(companyId, employeeId, values) : createEmployee(companyId, values);
    if (!result.ok) {
      setErrors(result.errors ?? {}); setFailure(result.reason === 'validation' ? '' : result.reason); submitting.current = false;
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus()); return;
    }
    onSuccess(employeeId ? 'updated' : 'added', result.employee.id); close();
  }
  if (companies.activeCompanyId !== companyId || !access.visible) return null;
  const departmentOptions = workspace.departments.filter((item) => normalizeDocumentName(item.name).includes(normalizeDocumentName(departmentQuery))).map((item) => ({id: item.id, label: item.name}));
  if (departmentQuery.trim() && !workspace.departments.some((item) => item.name.toLowerCase() === departmentQuery.trim().toLowerCase())) departmentOptions.push({id: 'new', label: t('createDepartment', {name: departmentQuery.trim()})});
  departmentOptions.unshift({id: 'none', label: t('noDepartment')});
  const disabled = !access.manage || unavailable || phase === 'closing';
  const error = (key: keyof EmployeeErrors) => errors[key] ? t(`errors.${errors[key]}`) : undefined;
  return <Drawer phase={phase} onClose={close} onExited={onClose} triggerRef={trigger} titleId="employee-drawer-title" descriptionId="employee-drawer-description" closeLabel={common('close')} panelClassName={styles.drawer} contentClassName={styles.drawerContent}>
    <DrawerHeader titleId="employee-drawer-title" title={t(employeeId ? 'edit' : 'add')}/>
    <p id="employee-drawer-description" className={formStyles.intro}>{t(employeeId ? 'editDescription' : 'drawerDescription')}</p>
    <form ref={form} noValidate onSubmit={submit} className={styles.form}>
      <Surface className={styles.formSection}><h3><AppIcon name="userPlus" size={22}/>{t('personalInformation')}</h3>
        <div className={styles.formGrid}>
          <Field controlSize="compact" id="employee-firstName" label={t('firstName')} required disabled={disabled} value={input.firstName} onChange={(event) => update('firstName', event.target.value)} error={error('firstName')}/>
          <Field controlSize="compact" id="employee-lastName" label={t('lastName')} required disabled={disabled} value={input.lastName} onChange={(event) => update('lastName', event.target.value)} error={error('lastName')}/>
          <Field controlSize="compact" id="employee-email" label={t('email')} type="email" required disabled={disabled} value={input.email} onChange={(event) => update('email', event.target.value)} error={error('email')}/>
          <Field controlSize="compact" id="employee-phone" label={t('phone')} type="tel" disabled={disabled} value={input.phone} onChange={(event) => update('phone', event.target.value)} error={error('phone')}/>
        </div>
      </Surface>
      <Surface className={styles.formSection}><h3><AppIcon name="briefcase" size={22}/>{t('professionalDetails')}</h3>
        <div className={styles.formGrid}>
          <EmployeeSuggestionField id="employee-jobTitle" label={t('jobTitle')} required disabled={disabled} value={input.jobTitle} onChange={(value) => update('jobTitle', value)} options={jobTitleSuggestions(workspace, input.jobTitle).map((title) => ({id: title, label: title}))} onSelect={(title) => update('jobTitle', title)} error={error('jobTitle')} helperText={t('jobTitleHelp')}/>
          <EmployeeSuggestionField id="employee-department" label={t('department')} disabled={disabled} value={departmentQuery} onChange={(value) => {setDepartmentQuery(value); update('department', {kind: 'none'});}} options={departmentOptions} onSelect={(id) => {
            if (id === 'none') {setDepartmentQuery(''); update('department', {kind: 'none'});}
            else if (id === 'new') {setDepartmentQuery(departmentQuery.trim()); update('department', {kind: 'new', name: departmentQuery.trim()});}
            else {const department = workspace.departments.find((item) => item.id === id); if (department) {setDepartmentQuery(department.name); update('department', {kind: 'existing', id});}}
          }} error={error('department')} helperText={input.department.kind === 'new' ? t('departmentPending') : t('departmentHelp')}/>
          <Field controlSize="compact" id="employee-hireDate" label={t('hireDate')} required disabled={disabled} value={hireDate} placeholder={t('datePlaceholder')} onChange={(event) => {setHireDate(event.target.value); setErrors((current) => ({...current, hireDate: undefined}));}} error={error('hireDate')}/>
          <SelectField controlSize="compact" id="employee-status" label={t('status')} required disabled={disabled} value={input.employmentStatus} onChange={(event) => update('employmentStatus', event.target.value as 'active' | 'inactive')} error={error('employmentStatus')}><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option></SelectField>
        </div>
      </Surface>
      {(failure || unavailable || !access.manage) && <p role="alert" tabIndex={-1} className={formStyles.error}>{t(`errors.${failure || (!access.manage ? 'access' : 'unavailable')}`)}</p>}
      <div className={`${formStyles.actions} ${styles.actions}`} data-edit-employee-actions={employeeId ? true : undefined}><Button variant="secondary" onClick={close}>{common('cancel')}</Button><Button type="submit" disabled={disabled}><AppIcon name={employeeId ? 'check' : 'plus'} size={20}/>{t(employeeId ? 'save' : 'add')}</Button></div>
    </form>
  </Drawer>;
}
