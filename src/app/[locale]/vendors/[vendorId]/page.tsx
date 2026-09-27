import {notFound} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {VendorDetailsPage} from '@/features/vendors/VendorDetailsPage';
import {LocalVendorDetailsPage} from '@/features/vendors/LocalVendorDetailsPage';
import {getVendorDetailsFixture} from '@/features/vendors/detail-fixtures';
import {vendorsListFixture} from '@/features/vendors/fixtures';

export default async function VendorDetailsRoute({params}: {params: Promise<{locale: string; vendorId: string}>}) {
  const {locale, vendorId} = await params;
  setRequestLocale(locale);
  const view = getVendorDetailsFixture(vendorId);
  if (vendorId.startsWith('local-')) return <LocalVendorDetailsPage locale={locale} vendorId={vendorId} context={{user: vendorsListFixture.user, organization: vendorsListFixture.organization, notificationCount: vendorsListFixture.notificationCount}}/>;
  if (!view) notFound();
  return <VendorDetailsPage locale={locale} view={view} />;
}
