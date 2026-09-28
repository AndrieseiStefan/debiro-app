import {setRequestLocale} from 'next-intl/server';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {MembersAccessPage} from '@/features/company-settings/MembersAccessPage';

export default async function CompanyMembersRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <MembersAccessPage locale={locale} view={companySettingsFixture}/>;
}
