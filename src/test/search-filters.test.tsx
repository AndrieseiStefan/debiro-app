import {useState} from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import {SearchInput} from '@/components/ui/SearchInput';
import {FilterPanel} from '@/components/ui/FilterPanel';
import {SelectField} from '@/components/ui/SelectField';

vi.mock('@/i18n/navigation', () => ({Link: () => null}));

function FiltersExample() {
  const [query, setQuery] = useState('needle');
  const [category, setCategory] = useState('');
  return <NextIntlClientProvider locale="en" messages={en}>
    <SearchInput label="Search rows" value={query} onChange={(event) => setQuery(event.target.value)}/>
    <FilterPanel activeCount={Number(Boolean(category))} onReset={() => setCategory('')}>
      <SelectField id="test-category" label="Category" placeholder="Choose category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="construction">Construction</option></SelectField>
    </FilterPanel>
    <button type="button">Outside</button>
  </NextIntlClientProvider>;
}

describe('shared search and filters', () => {
  it('labels native search, supports changes, and forwards disabled semantics', () => {
    const {rerender} = render(<SearchInput label="Search rows" placeholder="Search"/>);
    const input = screen.getByRole('searchbox', {name: 'Search rows'});
    fireEvent.change(input, {target: {value: 'Example'}});
    expect(input).toHaveValue('Example');
    expect(input.parentElement).toHaveAttribute('data-search-control');
    rerender(<SearchInput label="Search rows" disabled/>);
    expect(input).toBeDisabled();
    expect(input.parentElement).toHaveAttribute('data-disabled', 'true');
  });

  it('counts only filters, applies immediately, and resets without clearing the query', () => {
    render(<FiltersExample/>);
    const trigger = screen.getByRole('button', {name: 'Filter'});
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    const panel = screen.getByRole('dialog', {name: 'Filters'});
    expect(panel).toHaveFocus();
    const category = within(panel).getByRole('combobox', {name: 'Category'});
    expect(category).toHaveAttribute('data-empty', 'true');
    fireEvent.change(category, {target: {value: 'construction'}});
    expect(category).toHaveAttribute('data-empty', 'false');
    expect(trigger).toHaveTextContent('Filter (1)');
    fireEvent.click(within(panel).getByRole('button', {name: 'Reset'}));
    expect(category).toHaveValue('');
    expect(trigger).toHaveTextContent(/^Filter$/);
    expect(screen.getByRole('searchbox')).toHaveValue('needle');
    fireEvent.keyDown(panel, {key: 'Escape'});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('toggles, dismisses on outside interaction, and lets keyboard focus leave', () => {
    render(<FiltersExample/>);
    const trigger = screen.getByRole('button', {name: 'Filter'});
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', {name: 'Outside'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    screen.getByRole('combobox').focus();
    fireEvent.keyDown(screen.getByRole('combobox'), {key: 'Tab'});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps real default filter values distinct from empty select placeholders', () => {
    render(<SelectField id="all" label="Category" value="all" onChange={() => {}}><option value="all">All categories</option><option value="construction">Construction</option></SelectField>);
    expect(screen.getByRole('combobox')).toHaveAttribute('data-empty', 'false');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('combobox')).toHaveValue('all');
  });
});
