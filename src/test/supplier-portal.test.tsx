import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {SupplierUploadPortalPage} from '@/features/supplier-portal/SupplierUploadPortalPage';
import {getSupplierPortalFixture} from '@/features/supplier-portal/fixtures';

vi.mock('@/i18n/navigation', () => ({
  Link: ({locale, href, ...props}: {locale?: string; href: string; children: React.ReactNode}) =>
    <a href={locale === 'en' ? `/en${href}` : href} {...props} />
}));

function renderPortal(locale: 'ro' | 'en' = 'ro') {
  const view = getSupplierPortalFixture('demo-construct-pro');
  if (!view) throw new Error('Missing portal fixture');
  return render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}><SupplierUploadPortalPage locale={locale} view={view}/></NextIntlClientProvider>);
}

describe('supplier upload portal', () => {
  it('resolves only its known token and renders external supplier sections in Romanian', () => {
    expect(getSupplierPortalFixture('unknown')).toBeUndefined();
    expect(getSupplierPortalFixture('__proto__')).toBeUndefined();
    renderPortal();
    expect(screen.getByRole('heading', {level: 1, name: 'Încarcă documentele companiei tale'})).toBeVisible();
    expect(screen.getByRole('region', {name: 'Detaliile solicitării'})).toHaveTextContent('Construct Pro SRL');
    expect(screen.getByRole('heading', {name: 'Documente solicitate (4)'})).toBeVisible();
    expect(screen.getByText('2 din 4 finalizate')).toBeVisible();
    expect(screen.getByRole('progressbar', {name: 'Progresul documentelor'})).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getAllByText('Încărcat')).toHaveLength(2);
    expect(screen.getByText('În așteptare')).toBeVisible();
    expect(screen.getByText('Lipsește')).toBeVisible();
    expect(screen.getByRole('heading', {name: 'Încărcare securizată'})).toBeVisible();
    expect(screen.getByRole('heading', {name: 'Ai nevoie de ajutor?'})).toBeVisible();
    expect(screen.queryByRole('navigation', {name: 'Navigare în aplicație'})).not.toBeInTheDocument();
  });

  it('renders English and keeps locale links on the same fixture token', () => {
    renderPortal('en');
    expect(screen.getByRole('heading', {level: 1, name: 'Upload your company documents'})).toBeVisible();
    expect(screen.getByRole('heading', {name: 'Requested documents (4)'})).toBeVisible();
    const language = screen.getByRole('navigation', {name: 'Language'});
    expect(within(language).getByRole('link', {name: 'RO'})).toHaveAttribute('href', '/upload/demo-construct-pro');
    expect(within(language).getByRole('link', {name: 'EN'})).toHaveAttribute('href', '/en/upload/demo-construct-pro');
  });

  it('validates a file and shows local-only selection without changing server progress', () => {
    renderPortal();
    const fileInput = screen.getByLabelText('Încarcă document pentru Certificat fiscal') as HTMLInputElement;
    fireEvent.change(fileInput, {target: {files: [new File(['bad'], 'notes.txt', {type: 'text/plain'})]}});
    expect(screen.getByRole('alert')).toHaveTextContent('Alege un fișier PDF, JPG sau PNG.');
    expect(fileInput).toHaveAttribute('aria-invalid', 'true');
    const largeFile = new File(['a'], 'tax.pdf', {type: 'application/pdf'});
    Object.defineProperty(largeFile, 'size', {value: 10 * 1024 * 1024 + 1});
    fireEvent.change(fileInput, {target: {files: [largeFile]}});
    expect(screen.getByRole('alert')).toHaveTextContent('Fișierul trebuie să aibă cel mult 10 MB.');
    fireEvent.change(fileInput, {target: {files: [new File(['demo'], 'tax.pdf', {type: 'application/pdf'})]}});
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('tax.pdf')).toBeVisible();
    expect(screen.getByText('Selectat local')).toBeVisible();
    expect(screen.getByText('Fișierul este selectat doar în acest browser. Nu a fost încărcat sau trimis.')).toBeVisible();
    expect(screen.getByRole('progressbar', {name: 'Progresul documentelor'})).toHaveAttribute('aria-valuenow', '2');
  });
});
