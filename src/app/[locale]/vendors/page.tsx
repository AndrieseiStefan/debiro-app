import {setRequestLocale} from 'next-intl/server';
import {VendorsListPage} from '@/features/vendors/VendorsListPage';
import {vendorsListFixture} from '@/features/vendors/fixtures';
import {vendorComplianceFilter} from '@/features/vendors/compliance-filter';

export default async function VendorsRoute({params, searchParams}: {params: Promise<{locale: string}>; searchParams: Promise<{status?: string | string[]}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const status = vendorComplianceFilter((await searchParams).status);
  return <VendorsListPage key={status} locale={locale} view={vendorsListFixture} initialStatus={status} />;
}
