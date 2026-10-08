import {setRequestLocale} from 'next-intl/server';
import {CompanyProfilePage} from '@/features/company-settings/CompanyProfilePage';

export default async function CompanyProfileRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <CompanyProfilePage locale={locale}/>;
}
