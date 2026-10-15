import {setRequestLocale} from 'next-intl/server';
import {CompanyDocumentsPage} from '@/features/company-documents/CompanyDocumentsPage';

export default async function CompanyDocumentsRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <CompanyDocumentsPage locale={locale}/>;
}
