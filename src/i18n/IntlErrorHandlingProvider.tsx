'use client';

import {NextIntlClientProvider} from 'next-intl';
import type {ReactNode} from 'react';

export function IntlErrorHandlingProvider({children, locale}: {children: ReactNode; locale: string}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      onError={(error) => console.error(error)}
      getMessageFallback={({namespace, key}) => {
        const path = [namespace, key].filter(Boolean).join('.');
        if (process.env.NODE_ENV === 'development') {
          throw new Error(`Missing foundation translation: ${path}`);
        }
        return path;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
