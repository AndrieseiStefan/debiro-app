import {setRequestLocale} from 'next-intl/server';
import {NotificationsPage} from '@/features/notifications/NotificationsPage';
import {notificationsFixture} from '@/features/notifications/fixtures';

export default async function NotificationsRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <NotificationsPage locale={locale} view={notificationsFixture} />;
}
