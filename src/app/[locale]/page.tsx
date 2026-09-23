import {setRequestLocale} from 'next-intl/server';
import {LandingPage} from '@/features/landing/LandingPage';
import {landingPreview} from '@/features/landing/fixtures';

export default async function HomePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <LandingPage locale={locale} preview={landingPreview} />;
}
