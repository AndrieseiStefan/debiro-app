import {notFound} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {VendorDetailsPage} from '@/features/vendors/VendorDetailsPage';
import {LocalVendorDetailsPage} from '@/features/vendors/LocalVendorDetailsPage';
import {getVendorDetailsFixture} from '@/features/vendors/detail-fixtures';
import {vendorsListFixture} from '@/features/vendors/fixtures';

export default async function VendorDetailsRoute({params, searchParams}: {params: Promise<{locale: string; vendorId: string}>; searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const {locale, vendorId} = await params;
  setRequestLocale(locale);
  const view = getVendorDetailsFixture(vendorId);
  const query = await searchParams;
  const selection = {documentId: typeof query.document === 'string' ? query.document : undefined, documentAction: typeof query.documentAction === 'string' ? query.documentAction : undefined};
  if (vendorId.startsWith('local-')) return <LocalVendorDetailsPage locale={locale} vendorId={vendorId} context={{user: vendorsListFixture.user, organization: vendorsListFixture.organization, notificationCount: vendorsListFixture.notificationCount}} {...selection}/>;
  if (!view) notFound();
  return <VendorDetailsPage locale={locale} view={view} {...selection}/>;
}
