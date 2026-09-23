import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {StatusBadge} from '@/components/ui/StatusBadge';

describe('foundation primitives', () => {
  it('renders button content and activates on click', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continue</Button>);
    fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('uses native disabled behavior and blocks activation', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Continue</Button>);
    const button = screen.getByRole('button', {name: 'Continue'});
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('blocks repeated activation while loading', () => {
    const onClick = vi.fn();
    render(<Button loading loadingLabel="Loading" onClick={onClick}>Continue</Button>);
    const button = screen.getByRole('button', {name: 'Loading'});
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('associates a required label, helper, and semantic error with its input', () => {
    render(<Field id="email" label="Email" helperText="Work address" error="Invalid address" required />);
    const input = screen.getByRole('textbox', {name: /Email/});
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('id', 'email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Work address Invalid address');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid address');
  });

  it('passes disabled and readonly field states to the native input', () => {
    const {rerender} = render(<Field id="name" label="Name" disabled />);
    expect(screen.getByRole('textbox', {name: 'Name'})).toBeDisabled();
    rerender(<Field id="name" label="Name" readOnly value="Example" />);
    expect(screen.getByRole('textbox', {name: 'Name'})).toHaveAttribute('readonly');
  });

  it('renders only the approved plain uppercase brand text', () => {
    const {container} = render(<BrandWordmark />);
    expect(screen.getByText('DEBIRO')).toBeVisible();
    expect(container.querySelector('img, svg')).toBeNull();
  });

  it('exposes the requested visual status category alongside text', () => {
    render(<StatusBadge tone="warning">Expiră curând</StatusBadge>);
    expect(screen.getByText('Expiră curând')).toHaveAttribute('data-tone', 'warning');
  });
});
