import {render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import {DocumentsPage} from '@/features/documents/DocumentsPage';
import {documentsFixture} from '@/features/documents/fixtures';
import {getDocumentReviewFixture} from '@/features/document-review/fixtures';

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/documents',
  Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props} />
}));

describe('documents fixture and states', () => {
  it('keeps document ownership explicit and links only implemented review fixtures', () => {
    expect(new Set(documentsFixture.documents.map((document) => document.id)).size).toBe(documentsFixture.documents.length);
    const linked = documentsFixture.documents.filter((document) => document.reviewRoute);
    expect(linked).toHaveLength(1);
    for (const document of linked) {
      const review = getDocumentReviewFixture(document.id);
      expect(review).toBeDefined();
      expect(review?.vendor.id).toBe(document.vendorId);
      expect(review?.vendor.name).toBe(document.vendorName);
      expect(review?.file.name).toBe(document.filename);
      expect(document.reviewRoute).toBe(`/documents/${document.id}/review`);
    }
  });

  it('shows a distinct empty state when no documents exist', () => {
    render(<NextIntlClientProvider locale="ro" messages={ro}><DocumentsPage locale="ro" view={{...documentsFixture, documents: [], previousMonthCount: 0}} /></NextIntlClientProvider>);
    expect(screen.getByRole('heading', {level: 1, name: 'Documente'})).toBeVisible();
    expect(screen.getByText('Nu există documente')).toBeVisible();
    expect(screen.getByText('Documentele furnizorilor vor apărea aici când vor fi disponibile.')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
