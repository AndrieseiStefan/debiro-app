import {notFound} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {DocumentReviewPage} from '@/features/document-review/DocumentReviewPage';
import {getDocumentReviewFixture} from '@/features/document-review/fixtures';
import {LocalDocumentReviewPage} from '@/features/document-review/LocalDocumentReviewPage';

export default async function DocumentReviewRoute({params}: {params: Promise<{locale: string; documentId: string}>}) {
  const {locale, documentId} = await params;
  setRequestLocale(locale);
  if (documentId.startsWith('local-document-')) return <LocalDocumentReviewPage locale={locale} documentId={documentId}/>;
  const view = getDocumentReviewFixture(documentId);
  if (!view) notFound();
  return <DocumentReviewPage locale={locale} view={view} />;
}
