import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Tooltip} from '@/components/ui/Tooltip';

afterEach(() => {vi.restoreAllMocks(); vi.unstubAllGlobals();});

describe.each(['hover', 'focus'] as const)('Tooltip %s placement', (interaction) => {
  it.each([
    {name: 'right, vertically centered', placement: 'right', anchor: [100, 100, 140, 48], viewport: [1024, 768], expected: [248, 105]},
    {name: 'right, clamped at top', placement: 'right', anchor: [100, 0, 140, 20], viewport: [1024, 768], expected: [248, 12]},
    {name: 'right, clamped at bottom', placement: 'right', anchor: [100, 740, 140, 20], viewport: [1024, 768], expected: [248, 718]},
    {name: 'right collision falls below', placement: 'right', anchor: [250, 100, 100, 36], viewport: [375, 768], expected: [163, 144]},
    {name: 'right and bottom collision falls above', placement: 'right', anchor: [250, 740, 100, 20], viewport: [375, 768], expected: [163, 694]},
    {name: 'default placement remains below', placement: undefined, anchor: [100, 100, 140, 48], viewport: [1024, 768], expected: [100, 156]}
  ] as const)('$name', ({placement, anchor, viewport, expected}) => {
    vi.stubGlobal('innerWidth', viewport[0]); vi.stubGlobal('innerHeight', viewport[1]);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.tagName === 'BUTTON' ? new DOMRect(...anchor) : new DOMRect(0, 0, 200, 38);
    });
    render(<Tooltip content="In progress · Coming soon" placement={placement}>{(props) => <button {...props}>Reports</button>}</Tooltip>);
    const trigger = screen.getByRole('button');
    if (interaction === 'hover') fireEvent.pointerEnter(trigger); else act(() => trigger.focus());
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).not.toHaveAttribute('data-layer');
    expect(tooltip).toHaveStyle({left: `${expected[0]}px`, top: `${expected[1]}px`});
    expect(trigger).toHaveAccessibleDescription('In progress · Coming soon');
  });
});

it('opts into the drawer layer without changing the trigger or accessible explanation', () => {
  render(<Tooltip content="Sending unavailable" layer="drawer">{(props) => <button {...props} aria-disabled="true">Send Email</button>}</Tooltip>);
  const trigger = screen.getByRole('button'); act(() => trigger.focus());
  expect(screen.getByRole('tooltip')).toHaveAttribute('data-layer', 'drawer');
  expect(trigger).toHaveAccessibleDescription('Sending unavailable');
  expect(trigger).toHaveAttribute('aria-disabled', 'true');
});
