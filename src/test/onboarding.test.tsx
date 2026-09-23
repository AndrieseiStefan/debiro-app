import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {OnboardingPage} from '@/features/onboarding/OnboardingPage';
import {onboardingFixture} from '@/features/onboarding/fixtures';

vi.mock('@/i18n/navigation', () => ({
  Link: ({locale, href, ...props}: {locale?: string; href: string; children: React.ReactNode}) =>
    <a href={locale === 'en' ? `/en${href}` : href} {...props} />
}));

function renderOnboarding(locale: 'ro' | 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}>
      <OnboardingPage locale={locale} fixture={onboardingFixture} />
    </NextIntlClientProvider>
  );
}

describe('onboarding page', () => {
  it('renders the canonical Romanian first step with text-only DEBIRO branding', () => {
    renderOnboarding('ro');
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Hai să configurăm contul companiei tale');
    const brand = screen.getByRole('link', {name: 'DEBIRO'});
    expect(brand).toHaveTextContent('DEBIRO');
    expect(brand.querySelector('img,svg')).toBeNull();
    expect(screen.getByLabelText(/^Numele companiei/)).toBeRequired();
    expect(screen.getByLabelText(/^Industria/)).toBeRequired();
    expect(screen.getByLabelText(/^Mărimea companiei/)).toBeRequired();
    expect(screen.getByLabelText(/^CUI \/ Cod fiscal/)).toBeRequired();
    expect(screen.getByLabelText(/^Țara/)).toBeRequired();
    expect(screen.getByLabelText(/^Nume complet/)).toBeRequired();
    expect(screen.getByLabelText(/^Adresă de email/)).toBeRequired();
    expect(screen.getByLabelText(/^Parolă/)).toBeRequired();
    expect(screen.getByRole('button', {name: 'Continuă'})).toBeVisible();
    const progress = screen.getByRole('list', {name: 'Progres configurare'});
    expect(within(progress).getByText('Date companie').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(within(progress).getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders equivalent English copy and switches password visibility locally', () => {
    renderOnboarding('en');
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent("Let's set up your company account");
    expect(screen.getByRole('button', {name: 'Continue'})).toBeVisible();
    expect(screen.getByRole('link', {name: 'RO'})).toHaveAttribute('href', '/onboarding');
    const password = screen.getByLabelText(/^Password\s*\*?$/) as HTMLInputElement;
    expect(password.type).toBe('password');
    fireEvent.click(screen.getByRole('button', {name: 'Show password'}));
    expect(password.type).toBe('text');
    fireEvent.click(screen.getByRole('button', {name: 'Hide password'}));
    expect(password.type).toBe('password');
  });
});
