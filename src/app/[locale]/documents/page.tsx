import {setRequestLocale} from 'next-intl/server';
import {DocumentsPage} from '@/features/documents/DocumentsPage';
import {documentsFixture} from '@/features/documents/fixtures';

export default async function DocumentsRoute({params, searchParams}: {params: Promise<{locale: string}>; searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  return <DocumentsPage locale={locale} view={documentsFixture} documentId={typeof query.document === 'string' ? query.document : undefined} documentAction={typeof query.documentAction === 'string' ? query.documentAction : undefined}/>;
}
