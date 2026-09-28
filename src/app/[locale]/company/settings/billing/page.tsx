import {setRequestLocale} from 'next-intl/server';
import {CompanyBillingPage} from '@/features/company-settings/CompanyBillingPage';
import {companySettingsFixture} from '@/features/company-settings/fixtures';

export default async function CompanyBillingRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <CompanyBillingPage locale={locale} view={companySettingsFixture}/>;
}
