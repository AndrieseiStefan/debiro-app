import {setRequestLocale} from 'next-intl/server';
import {RequirementsPage} from '@/features/requirements/RequirementsPage';
import {requirementsFixture} from '@/features/requirements/fixtures';

export default async function RequirementsRoute({params, searchParams}: {params: Promise<{locale: string}>; searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  return <RequirementsPage locale={locale} view={requirementsFixture} templateId={typeof query.template === 'string' ? query.template : undefined}/>;
}
