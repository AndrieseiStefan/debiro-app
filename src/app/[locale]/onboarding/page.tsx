import {setRequestLocale} from 'next-intl/server';
import {OnboardingPage} from '@/features/onboarding/OnboardingPage';
import {onboardingFixture} from '@/features/onboarding/fixtures';

export default async function OnboardingRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <OnboardingPage locale={locale} fixture={onboardingFixture} />;
}
