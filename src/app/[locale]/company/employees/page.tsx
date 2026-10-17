import {setRequestLocale} from 'next-intl/server';
import {EmployeesPage} from '@/features/employees/EmployeesPage';

export default async function EmployeesRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <EmployeesPage locale={locale}/>;
}
