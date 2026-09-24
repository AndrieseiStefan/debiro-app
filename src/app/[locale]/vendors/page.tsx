import {setRequestLocale} from 'next-intl/server';
import {VendorsListPage} from '@/features/vendors/VendorsListPage';
import {vendorsListFixture} from '@/features/vendors/fixtures';

export default async function VendorsRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <VendorsListPage locale={locale} view={vendorsListFixture} />;
}
