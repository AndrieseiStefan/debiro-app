import {render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {LandingPage} from '@/features/landing/LandingPage';
import {landingPreview} from '@/features/landing/fixtures';

vi.mock('@/i18n/navigation', () => ({
  Link: ({locale, href, ...props}: {locale?: string; href: string; children: React.ReactNode}) =>
    <a href={locale === 'en' ? '/en' : href} {...props} />
}));

describe('landing page', () => {
  it('renders the canonical Romanian heading, primary CTA, navigation and text-only brand', () => {
    render(<NextIntlClientProvider locale="ro" messages={ro}><LandingPage locale="ro" preview={landingPreview} /></NextIntlClientProvider>);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Toate documentele furnizorilor tăi, într-un singur loc.');
    expect(within(screen.getByRole('navigation', {name: 'Navigare principală'})).getByText('Prețuri')).toBeVisible();
    expect(screen.getAllByRole('button', {name: /Încearcă gratuit/}).length).toBeGreaterThan(0);
    const brand = screen.getByRole('link', {name: 'DEBIRO'});
    expect(brand).toHaveTextContent(/^DEBIRO$/);
    expect(brand.querySelector('img,svg')).toBeNull();
    expect(document.body).not.toHaveTextContent('debiro');
  });

  it('renders faithful English landing copy', () => {
    render(<NextIntlClientProvider locale="en" messages={en}><LandingPage locale="en" preview={landingPreview} /></NextIntlClientProvider>);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent("All your suppliers' documents, in one place.");
    expect(screen.getByRole('navigation', {name: 'Main navigation'})).toBeVisible();
    expect(document.body).not.toHaveTextContent('debiro');
  });
});
