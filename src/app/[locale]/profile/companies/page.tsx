import {setRequestLocale} from 'next-intl/server';
import {MyCompaniesPage} from '@/features/companies/MyCompaniesPage';

export default async function MyCompaniesRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <MyCompaniesPage locale={locale}/>;
}
