import {render, screen} from '@testing-library/react';
import {NextIntlClientProvider, useTranslations} from 'next-intl';
import {describe, expect, it} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';

function Message() {
  const t = useTranslations('Foundation');
  return <span>{t('placeholderTitle')}</span>;
}

function keys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' ? keys(child as Record<string, unknown>, path) : [path];
  });
}

describe('foundation localization', () => {
  it('renders Romanian and English through next-intl', () => {
    const {rerender} = render(
      <NextIntlClientProvider locale="ro" messages={ro}><Message /></NextIntlClientProvider>
    );
    expect(screen.getByText(ro.Foundation.placeholderTitle)).toBeVisible();
    rerender(<NextIntlClientProvider locale="en" messages={en}><Message /></NextIntlClientProvider>);
    expect(screen.getByText(en.Foundation.placeholderTitle)).toBeVisible();
  });

  it('keeps the committed foundation catalog keys aligned', () => {
    expect(keys(ro).sort()).toEqual(keys(en).sort());
  });
});
