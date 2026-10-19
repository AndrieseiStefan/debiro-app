import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';

vi.mock('@/i18n/navigation', () => ({Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));

describe('PageHeader optional copy reservation', () => {
  it('keeps the default heading/description structure and semantics unchanged', () => {
    const {container} = render(<AuthenticatedPageHeader context="Dashboard" title="Current title" titleId="page-title" description="Current description"/>);
    const title = screen.getByRole('heading', {name: 'Current title', level: 1});
    expect(title.nextElementSibling).toHaveTextContent('Current description');
    expect(container.querySelector('[data-copy]')).toBeNull();
    expect(Array.from(title.parentElement!.children, (element) => element.tagName)).toEqual(['H1', 'P']);
  });

  it('reserves complete title/description pairs without duplicate accessible headings or text', () => {
    const {container} = render(<AuthenticatedPageHeader context="Dashboard" title="Current title" titleId="page-title" description="Current description" reserveCopy={[{title: 'A longer possible title', description: 'A longer possible description'}]}/>);
    const title = screen.getByRole('heading', {name: 'Current title', level: 1});
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(title.nextElementSibling).toHaveTextContent('Current description');
    const reserved = container.querySelector('[data-copy]');
    expect(reserved).toHaveAttribute('data-copy', 'A longer possible title');
    expect(reserved?.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true');
    expect(container.textContent).toBe('DashboardCurrent titleCurrent description');
  });
});
