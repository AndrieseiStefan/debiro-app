'use client';

import {useTranslations} from 'next-intl';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {ButtonLink} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {employeeWorkspace, useEmployeeState} from './employees-state';
import {departmentName, employeeName} from './projections';
import styles from './Employees.module.css';

export function EmployeeDetailsPage({locale, employeeId}: {locale: string; employeeId: string}) {
  const t = useTranslations('Employees'), app = useTranslations('AppShell');
  const companyId = getActiveCompany(useCompanyState())?.company.id ?? '';
  const workspace = employeeWorkspace(companyId, useEmployeeState()), employee = workspace.employees.find((item) => item.id === employeeId);
  return <AuthenticatedAppShell locale={locale} currentPath={`/company/employees/${employeeId}`} organizationName="" userName="" userInitials="">
    {employee ? <>
      <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs root={{label: app('navigation.company')}} items={[{label: t('title'), href: '/company/employees'}, {label: employeeName(employee)}]} label={t('breadcrumbLabel')}/>} title={employeeName(employee)} titleId="employee-title" description={employee.jobTitle}/>
      <Surface className={styles.details}><dl>{(['email', 'phone', 'department', 'hireDate', 'status'] as const).map((field) => <div key={field}><dt>{t(field)}</dt><dd>{field === 'department' ? departmentName(workspace, employee) || '—' : field === 'status' ? t(employee.employmentStatus) : field === 'hireDate' ? employee.hireDate.split('-').reverse().join('.') : employee[field] || '—'}</dd></div>)}</dl></Surface>
      <Surface className={styles.details}><EmptyState title={t('notConfigured')} description={t('documentsDeferred')}/></Surface>
    </> : <Surface><ErrorState title={t('employeeUnavailable')} description={t('errors.unavailable')} retryAction={<ButtonLink href="/company/employees" variant="secondary">{t('back')}</ButtonLink>}/></Surface>}
  </AuthenticatedAppShell>;
}
