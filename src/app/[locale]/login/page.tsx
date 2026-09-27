import {setRequestLocale} from 'next-intl/server';
import {LoginPage} from '@/features/login/LoginPage';
import {loginFixture} from '@/features/login/fixtures';

export default async function LoginRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <LoginPage locale={locale} fixture={loginFixture} />;
}
