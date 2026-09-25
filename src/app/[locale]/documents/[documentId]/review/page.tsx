import {notFound} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {DocumentReviewPage} from '@/features/document-review/DocumentReviewPage';
import {getDocumentReviewFixture} from '@/features/document-review/fixtures';

export default async function DocumentReviewRoute({params}: {params: Promise<{locale: string; documentId: string}>}) {
  const {locale, documentId} = await params;
  setRequestLocale(locale);
  const view = getDocumentReviewFixture(documentId);
  if (!view) notFound();
  return <DocumentReviewPage locale={locale} view={view} />;
}
