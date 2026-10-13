import {setRequestLocale} from 'next-intl/server';
import {MyProfilePage} from '@/features/profile/MyProfilePage';

export default async function MyProfileRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; setRequestLocale(locale);
  return <MyProfilePage locale={locale}/>;
}
