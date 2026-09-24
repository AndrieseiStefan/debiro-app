import {setRequestLocale} from 'next-intl/server';
import {DashboardPage} from '@/features/dashboard/DashboardPage';
import {dashboardFixture} from '@/features/dashboard/fixtures';

export default async function DashboardRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <DashboardPage locale={locale} view={dashboardFixture} />;
}
