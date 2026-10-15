'use client';

import {useTranslations} from 'next-intl';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {AppIcon} from '@/components/layout/AppIcon';
import {EmptyState} from '@/components/ui/EmptyState';
import {Surface} from '@/components/ui/Surface';

export function EmployeesComingSoonPage({locale}: {locale: string}) {
  const t = useTranslations('CompanyDocuments');
  const app = useTranslations('AppShell');
  return <AuthenticatedAppShell locale={locale} currentPath="/company/employees" organizationName="" userName="" userInitials="">
    <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs root={{label: app('navigation.company')}} items={[{label: app('navigation.employees')}]} label={t('breadcrumbLabel')}/>} title={app('navigation.employees')} titleId="employees-title" description={app('navigationComingSoon')}/>
    <Surface><EmptyState icon={<AppIcon name="users" size={28}/>} title={app('navigationComingSoon')} description={t('employeesComingSoon')}/></Surface>
  </AuthenticatedAppShell>;
}
