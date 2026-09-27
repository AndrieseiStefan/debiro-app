'use client';

import {useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {EmptyState} from '@/components/ui/EmptyState';
import {Link} from '@/i18n/navigation';
import {toVendorDetailsView, useCreatedVendors} from './created-vendors';
import {VendorDetailsPage} from './VendorDetailsPage';
import type {VendorsListViewModel} from './types';

const subscribeToNothing = () => () => {};

export function LocalVendorDetailsPage({locale, vendorId, context}: {
  locale: string;
  vendorId: string;
  context: Pick<VendorsListViewModel, 'user' | 'organization' | 'notificationCount'>;
}) {
  const t = useTranslations('VendorDetails');
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const vendor = useCreatedVendors().find((item) => item.id === vendorId);
  if (!hydrated) return null;
  if (!vendor) return <AuthenticatedAppShell locale={locale} currentPath={`/vendors/${vendorId}`} organizationName={context.organization.name} userName={context.user.fullName} userInitials={context.user.initials} notificationCount={context.notificationCount}>
    <EmptyState title={t('localVendorUnavailable')} action={<Link href="/vendors">{t('backToVendors')}</Link>}/>
  </AuthenticatedAppShell>;
  return <VendorDetailsPage locale={locale} view={toVendorDetailsView(vendor, context)}/>;
}
