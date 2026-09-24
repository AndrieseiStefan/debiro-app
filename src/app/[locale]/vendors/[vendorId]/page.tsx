import {notFound} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {VendorDetailsPage} from '@/features/vendors/VendorDetailsPage';
import {getVendorDetailsFixture} from '@/features/vendors/detail-fixtures';

export default async function VendorDetailsRoute({params}: {params: Promise<{locale: string; vendorId: string}>}) {
  const {locale, vendorId} = await params;
  setRequestLocale(locale);
  const view = getVendorDetailsFixture(vendorId);
  if (!view) notFound();
  return <VendorDetailsPage locale={locale} view={view} />;
}
