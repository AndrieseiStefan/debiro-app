import {fireEvent, render, screen} from '@testing-library/react';
import {useState} from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import {SectionAction} from '@/components/ui/SectionAction';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';

vi.mock('@/i18n/navigation', () => ({Link: ({href, ...props}: {href: string}) => <a href={href} {...props}/>}));

function Disclosure({disabled = false}) {
  const [expanded, setExpanded] = useState(false);
  return <SectionAction mode="expand" expanded={expanded} disabled={disabled} controls="section-rows" onClick={() => setExpanded(!expanded)}/>;
}

describe.each(['ro', 'en'] as const)('%s shared section action', (locale) => {
  const messages = locale === 'ro' ? ro : en;
  it('derives canonical disclosure labels/aria state from expansion without becoming a link', () => {
    render(<NextIntlClientProvider locale={locale} messages={messages}><Disclosure/></NextIntlClientProvider>);
    const button = screen.getByRole('button', {name: messages.SectionActions.viewAll});
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'section-rows');
    expect(button.querySelector('svg')).toHaveAttribute('width', '16');
    expect(button.querySelector('path')).toHaveAttribute('d', 'm5 9 7 7 7-7');
    fireEvent.click(button);
    expect(button).toHaveAccessibleName(messages.SectionActions.showLess);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(button);
    expect(button).toHaveAccessibleName(messages.SectionActions.viewAll);
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('retains native disabled semantics and does not expand', () => {
    render(<NextIntlClientProvider locale={locale} messages={messages}><Disclosure disabled/></NextIntlClientProvider>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled(); fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
  it('retains destination copy, link semantics and a right arrow for navigation', () => {
    const label = locale === 'ro' ? 'Vezi toate documentele' : 'View all documents';
    render(<NextIntlClientProvider locale={locale} messages={messages}><SectionAction mode="navigate" href="/documents?attention=1">{label}</SectionAction></NextIntlClientProvider>);
    const link = screen.getByRole('link', {name: label});
    expect(link).toHaveAttribute('href', '/documents?attention=1');
    expect(link).not.toHaveAttribute('aria-expanded');
    expect(link.querySelector('svg path')).toHaveAttribute('d', 'M4 12h16');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
