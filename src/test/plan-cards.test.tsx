import {fireEvent, render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {PlanCards} from '@/features/company-settings/PlanCards';
import {marketingPlanConfig, planCatalog} from '@/features/company-settings/plan-catalog';

vi.mock('@/i18n/navigation', () => ({Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));

describe.each(['ro', 'en'] as const)('%s shared plan presentation', (locale) => {
  const messages = locale === 'ro' ? ro : en;
  it('uses the available ranked catalog and only explicit public emphasis without private subscription state', () => {
    const {container} = render(<NextIntlClientProvider locale={locale} messages={messages}><PlanCards locale={locale} context="marketing" plans={[...planCatalog].reverse()} featuredPlanId={marketingPlanConfig.featuredPlanId}/></NextIntlClientProvider>);
    expect(Array.from(container.querySelectorAll('[data-plan-id]'), (card) => card.getAttribute('data-plan-id'))).toEqual(['Starter', 'Professional', 'Business']);
    expect(container.querySelectorAll('[data-featured]')).toHaveLength(1);
    expect(container.querySelector('[data-featured]')).toHaveAttribute('data-plan-id', 'Professional');
    expect(container.querySelector('[data-current], [data-recommended]')).toBeNull();
    expect(container).not.toHaveTextContent(messages.CompanyBilling.upgrade.current);
    expect(container).not.toHaveTextContent('Trial');
    for (const link of screen.getAllByRole('link')) expect(link).toHaveAttribute('href', '/onboarding');
    for (const plan of planCatalog) expect(container).toHaveTextContent(`${plan.monthlyPriceEur} €`);
    expect(screen.getAllByText(messages.CompanyBilling.upgrade.demoPricing)).toHaveLength(3);
  });
  it.each(['missing', null, 'Professional'])('never substitutes a random featured plan when %s is missing/unavailable', (featuredPlanId) => {
    const {container} = render(<NextIntlClientProvider locale={locale} messages={messages}><PlanCards locale={locale} context="marketing" plans={planCatalog.map((plan) => ({...plan, available: plan.id !== 'Professional'}))} featuredPlanId={featuredPlanId}/></NextIntlClientProvider>);
    expect(container.querySelectorAll('[data-plan-id]')).toHaveLength(2);
    expect(container.querySelector('[data-featured]')).toBeNull();
  });
  it.each([{plans: []}, {plans: planCatalog.map((plan) => ({...plan, available: false}))}])('renders an honest empty state for an empty/unavailable catalog', ({plans}) => {
    const {container} = render(<NextIntlClientProvider locale={locale} messages={messages}><PlanCards locale={locale} context="marketing" plans={plans} featuredPlanId="Professional"/></NextIntlClientProvider>);
    expect(screen.getByRole('status')).toHaveTextContent(messages.PlanCards.empty);
    expect(container.querySelector('[data-plan-id], a, button')).toBeNull();
  });
  it('keeps upgrade current/trial/next state separate from marketing emphasis', () => {
    const action = vi.fn();
    const {container} = render(<NextIntlClientProvider locale={locale} messages={messages}><PlanCards locale={locale} context="upgrade" currentPlanId="Professional" nextEligiblePlanId="Business" trialLabel="Trial • 12" onAction={action}/></NextIntlClientProvider>);
    expect(container.querySelector('[data-current]')).toHaveAttribute('data-plan-id', 'Professional');
    expect(container.querySelector('[data-current]')).toHaveTextContent('Trial • 12');
    expect(container.querySelector('[data-recommended]')).toHaveAttribute('data-plan-id', 'Business');
    expect(container.querySelector('[data-featured]')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: messages.CompanyBilling.upgrade.action}));
    expect(action).toHaveBeenCalledExactlyOnceWith('Business');
  });
});
