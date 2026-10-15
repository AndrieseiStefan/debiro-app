import {setRequestLocale} from 'next-intl/server';
import {EmployeesComingSoonPage} from '@/features/company-documents/EmployeesComingSoonPage';

export default async function EmployeesRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <EmployeesComingSoonPage locale={locale}/>;
}
