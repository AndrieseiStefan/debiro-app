import '@fontsource-variable/inter/wght.css';
import '@/styles/globals.css';
import {hasLocale, NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import type {ReactNode} from 'react';
import {IntlErrorHandlingProvider} from '@/i18n/IntlErrorHandlingProvider';
import {routing} from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <IntlErrorHandlingProvider locale={locale}>{children}</IntlErrorHandlingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
