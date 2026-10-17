import {setRequestLocale} from 'next-intl/server';
import {EmployeeDetailsPage} from '@/features/employees/EmployeeDetailsPage';

export default async function EmployeeDetailsRoute({params}: {params: Promise<{locale: string; employeeId: string}>}) {
  const {locale, employeeId} = await params;
  setRequestLocale(locale);
  // Dynamic route params retain encoded segments; resolve the exact stored ID once.
  let id = employeeId;
  try {id = decodeURIComponent(employeeId);} catch { /* Invalid encodings use the safe unavailable state. */ }
  return <EmployeeDetailsPage locale={locale} employeeId={id}/>;
}
