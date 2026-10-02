import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import {DocumentReviewPage} from '@/features/document-review/DocumentReviewPage';
import {getDocumentReviewFixture} from '@/features/document-review/fixtures';
import {createLocalDocument} from '@/features/documents/created-documents';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/documents/construct-pro-tax-2024/review',
  Link: ({locale, href, ...props}: {locale?: string; href: string; children: React.ReactNode}) =>
    <a href={locale === 'en' ? `/en${href}` : href} {...props} />
}));

const fixture = getDocumentReviewFixture('construct-pro-tax-2024')!;

function renderReview(locale: 'ro' | 'en' = 'ro', isolated = false) {
  const document = isolated ? createLocalDocument({companyId: 'demo-company', vendorId: fixture.vendor.id, vendorName: fixture.vendor.name,
    vendorRegistrationNumber: fixture.vendor.registrationNumber, vendorRegistrationCode: fixture.vendor.registrationCode, documentName: {ro: 'Certificat fiscal', en: 'Tax certificate'},
    documentType: 'tax', filename: 'test.pdf', fileType: 'application/pdf', fileSize: 20, uploadedAt: '2025-01-15', createdAt: '2025-01-15T12:00:00Z', uploadedBy: fixture.user.fullName,
    expiresAt: null, extractionRequested: false, reviewRequired: false}) : undefined;
  return render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}><DocumentReviewPage locale={locale} view={document ? {...fixture, id: document.id} : fixture}/></NextIntlClientProvider>);
}

describe('document review', () => {
  it('resolves only the typed fixture ID', () => {
    expect(getDocumentReviewFixture(fixture.id)).toBe(fixture);
    expect(getDocumentReviewFixture('unknown')).toBeUndefined();
    expect(getDocumentReviewFixture('__proto__')).toBeUndefined();
  });

  it('renders the canonical sections, extracted values and active Documents item', () => {
    renderReview();
    expect(screen.getByRole('heading', {level: 1, name: 'Revizuiește documentul'})).toBeInTheDocument();
    expect(screen.getByRole('navigation', {name: 'Navigare în aplicație'}).getAttribute('aria-label')).toBe('Navigare în aplicație');
    expect(within(screen.getByRole('navigation', {name: 'Navigare în aplicație'})).getByText('Documente').closest('[aria-current]')).toHaveAttribute('aria-current', 'page');
    const breadcrumb = screen.getByRole('navigation', {name: 'Navigare pe pagină'});
    expect(breadcrumb).toHaveTextContent('DashboardDocumenteRevizuiește documentul');
    expect(within(breadcrumb).queryByText('Furnizori')).not.toBeInTheDocument();
    expect(within(breadcrumb).queryByText('Construct Pro SRL')).not.toBeInTheDocument();
    expect(within(breadcrumb).getByText('Revizuiește documentul')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('region', {name: 'Previzualizare document'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Date extrase de AI'})).toBeInTheDocument();
    expect(screen.getByLabelText(/Numele companiei/)).toHaveValue('Construct Pro SRL');
    expect(screen.getByText('Încredere 94%')).toBeInTheDocument();
    expect(screen.queryByText(/verificat din surse oficiale/i)).not.toBeInTheDocument();
    expect(fixture.file.sourcePage.width / fixture.file.sourcePage.height).toBeCloseTo(210 / 297, 8);
  });

  it('allows local editing, draft, rejection and human confirmation without verification', () => {
    renderReview('ro', true);
    fireEvent.change(screen.getByLabelText(/Numele companiei/), {target: {value: 'Construct Pro Actualizat SRL'}});
    expect(screen.getByLabelText(/Numele companiei/)).toHaveValue('Construct Pro Actualizat SRL');
    fireEvent.click(screen.getByRole('button', {name: 'Salvează ca draft'}));
    expect(screen.getByRole('status')).toHaveTextContent('Draft salvat local');
    fireEvent.click(screen.getByRole('button', {name: 'Respinge'}));
    expect(screen.getByRole('alertdialog', {name: 'Respinge documentul?'})).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: 'Anulează'}));
    fireEvent.click(screen.getByRole('button', {name: 'Confirmă și salvează'}));
    expect(screen.getByRole('status')).toHaveTextContent('Date confirmate de un om, local');
    expect(screen.getByRole('status')).toHaveTextContent('Nu au fost verificate din surse oficiale');
    expect(fixture.extraction.values.companyName).toBe('Construct Pro SRL');
    expect(screen.getByRole('button', {name: 'Confirmă și salvează'})).toBeDisabled();
  });

  it('associates missing and invalid date errors with fields', () => {
    renderReview();
    fireEvent.change(screen.getByLabelText(/Numele companiei/), {target: {value: ''}});
    fireEvent.change(screen.getByLabelText(/Dată expirare/), {target: {value: '31.02.2025'}});
    fireEvent.click(screen.getByRole('button', {name: 'Confirmă și salvează'}));
    expect(screen.getByLabelText(/Numele companiei/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Dată expirare/)).toHaveAttribute('aria-describedby', 'review-expiresAt-error');
    expect(screen.getByText('Folosește o dată validă în format ZZ.LL.AAAA.')).toBeInTheDocument();
  });

  it('renders equivalent English review copy and local confirmation', () => {
    renderReview('en', true);
    expect(screen.getByRole('heading', {level: 1, name: 'Review document'})).toBeInTheDocument();
    expect(screen.getByLabelText(/Company name/)).toHaveValue('Construct Pro SRL');
    fireEvent.click(screen.getByRole('button', {name: 'Confirm and save'}));
    expect(screen.getByRole('status')).toHaveTextContent('Human-confirmed locally');
    expect(screen.getByRole('status')).toHaveTextContent('not been checked against an authoritative source');
  });

  it('requires confirmation before rejection and prevents any further outcome', () => {
    renderReview('ro', true);
    fireEvent.click(screen.getByRole('button', {name: 'Respinge'}));
    const dialog = screen.getByRole('alertdialog', {name: 'Respinge documentul?'});
    expect(dialog).toHaveTextContent('Furnizorul va trebui să încarce un document nou pentru această cerință.');
    fireEvent.click(within(dialog).getByRole('button', {name: 'Respinge'}));
    expect(screen.getByRole('status')).toHaveTextContent('Document respins local');
    expect(screen.getByRole('button', {name: 'Confirmă și salvează'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Respinge'})).toBeDisabled();
  });
});
