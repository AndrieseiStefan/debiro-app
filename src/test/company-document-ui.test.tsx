import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {Field} from '@/components/ui/Field';
import {SelectField} from '@/components/ui/SelectField';
import {Button} from '@/components/ui/Button';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {SummaryMetricCard} from '@/features/dashboard/SummaryMetricCard';

vi.mock('@/i18n/navigation', () => ({Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));

describe('additive authenticated document presentation variants', () => {
  it('preserves default controls while compact fields retain read-only and validation semantics', () => {
    render(<><Field id="default" label="Default" defaultValue="Original"/><Field id="readonly" label="Read only" controlSize="compact" readOnly value="Prefilled"/>
      <SelectField id="type" label="Type" controlSize="compact" value="" required placeholder="Choose" error="Required" onChange={() => {}}><option value="tax">Tax</option></SelectField></>);
    expect(screen.getByRole('textbox', {name: 'Default'})).not.toHaveAttribute('data-size');
    const readonly = screen.getByRole('textbox', {name: 'Read only'});
    expect(readonly).toHaveAttribute('readonly'); expect(readonly).toHaveAttribute('data-size', 'compact');
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('data-empty', 'true'); expect(select).toHaveAttribute('data-size', 'compact');
    expect(select).toBeInvalid(); expect(select).toHaveAccessibleDescription('Required');
  });

  it('shares compact/table actions and document badges without changing default consumers', () => {
    render(<><Button>Default</Button><Button size="compact">Set documents</Button><Button size="icon" aria-label="Download">↓</Button>
      <StatusBadge tone="success">Default badge</StatusBadge><StatusBadge tone="warning" size="document">Document badge</StatusBadge><StatusBadge tone="danger" size="compact" indicator="none">Compact badge</StatusBadge></>);
    expect(screen.getByRole('button', {name: 'Default'})).not.toHaveAttribute('data-size');
    expect(screen.getByRole('button', {name: 'Set documents'})).toHaveAttribute('data-size', 'compact');
    expect(screen.getByRole('button', {name: 'Download'})).toHaveAccessibleName('Download');
    expect(screen.getByText('Default badge')).not.toHaveAttribute('data-size');
    expect(screen.getByText('Document badge')).toHaveAttribute('data-size', 'document');
    expect(screen.getByText('Compact badge').querySelector('[aria-hidden]')).toBeNull();
  });

  it('uses the document summary variant with real values and keeps the default Dashboard variant', () => {
    render(<><SummaryMetricCard title="Company total" value={5} note="Current documents" icon="file" tone="blue" variant="documents"/>
      <SummaryMetricCard title="Dashboard total" value={24} note="Current vendors" icon="users" tone="blue"/></>);
    expect(screen.getByRole('heading', {name: 'Company total'}).closest('[data-status]')).toHaveAttribute('data-status', 'total');
    expect(screen.getByRole('heading', {name: 'Dashboard total'}).closest('[data-status]')).toBeNull();
    expect(screen.getByText('5')).toBeVisible(); expect(screen.getByText('24')).toBeVisible();
  });
});
