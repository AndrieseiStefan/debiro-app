import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {OnboardingPage} from '@/features/onboarding/OnboardingPage';
import {onboardingFixture} from '@/features/onboarding/fixtures';
import {getActiveCompany, readCompanyState} from '@/features/companies/company-state';
import {companyCountries, companyIndustries, companySizes} from '@/features/companies/company-options';

vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn()})}));
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({push: vi.fn()}),
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
  it('binds company fields from the form on completion, excluding personal and temporary configuration', () => {
    const before = readCompanyState();
    renderOnboarding('ro');
    fireEvent.change(screen.getByLabelText(/^Numele companiei/), {target: {value: 'Onboard SRL'}});
    fireEvent.change(screen.getByLabelText(/^CUI \/ Cod fiscal/), {target: {value: `RO${crypto.randomUUID()}`}});
    fireEvent.change(screen.getByLabelText(/^Industria/), {target: {value: 'construction'}});
    fireEvent.change(screen.getByLabelText(/^Țara/), {target: {value: 'FR'}});
    expect(screen.getByLabelText(/^Industria/).querySelectorAll('option')).toHaveLength(Object.keys(companyIndustries).length);
    expect(screen.getByLabelText(/^Mărimea companiei/).querySelectorAll('option')).toHaveLength(Object.keys(companySizes).length);
    expect(screen.getByLabelText(/^Țara/).querySelectorAll('option')).toHaveLength(Object.keys(companyCountries).length);
    fireEvent.click(screen.getByRole('button', {name: 'Continuă'}));
    expect(readCompanyState()).toBe(before);
    fireEvent.click(screen.getByRole('button', {name: 'Configurează mai târziu'}));
    fireEvent.click(screen.getByRole('button', {name: 'Intră în Dashboard'}));
    const company = getActiveCompany(readCompanyState())!.company;
    expect(company).toMatchObject({name: 'Onboard SRL', industry: 'construction', companySize: '11-50', country: 'FR'});
    expect(company).not.toHaveProperty('administratorName');
    expect(company).not.toHaveProperty('email');
    expect(company).not.toHaveProperty('password');
    expect(company).not.toHaveProperty('selectedRequirements');
  });
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
