import {setRequestLocale} from 'next-intl/server';
import {RequirementsPage} from '@/features/requirements/RequirementsPage';
import {requirementsFixture} from '@/features/requirements/fixtures';

export default async function RequirementsRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <RequirementsPage locale={locale} view={requirementsFixture} />;
}
