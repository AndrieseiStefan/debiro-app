import {setRequestLocale} from 'next-intl/server';
import {MyInvitationsPage} from '@/features/profile/MyInvitationsPage';

export default async function MyInvitationsRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; setRequestLocale(locale);
  return <MyInvitationsPage locale={locale}/>;
}
