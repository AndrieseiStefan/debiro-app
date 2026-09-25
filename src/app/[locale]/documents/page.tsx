import {setRequestLocale} from 'next-intl/server';
import {DocumentsPage} from '@/features/documents/DocumentsPage';
import {documentsFixture} from '@/features/documents/fixtures';

export default async function DocumentsRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <DocumentsPage locale={locale} view={documentsFixture} />;
}
