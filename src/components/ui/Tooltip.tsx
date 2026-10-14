'use client';

import {useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type RefObject} from 'react';
import {createPortal} from 'react-dom';
import styles from './Tooltip.module.css';

type TooltipTriggerProps = Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-describedby' | 'onFocus' | 'onBlur' | 'onPointerEnter' | 'onPointerLeave' | 'onClick'> & {ref: RefObject<HTMLButtonElement | null>};

/** A focusable button and portaled explanation, without a wrapper that changes control geometry. */
export function Tooltip({content, placement = 'bottom', children}: {content: string; placement?: 'bottom' | 'right'; children: (props: TooltipTriggerProps) => ReactNode}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({left: 0, top: 0});
  function show() {window.clearTimeout(closeTimer.current); setOpen(true);}
  function close() {window.clearTimeout(closeTimer.current); setOpen(false);}
  function leave() {
    window.clearTimeout(closeTimer.current);
    // Allow the pointer to cross the gap to the tooltip; focused controls keep their explanation.
    closeTimer.current = window.setTimeout(() => {if (document.activeElement !== trigger.current) setOpen(false);}, 100);
  }
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const anchor = trigger.current?.getBoundingClientRect();
      const panel = tooltip.current;
      if (!anchor || !panel) return;
      const gutter = 12, gap = 8;
      const {width, height} = panel.getBoundingClientRect();
      if (placement === 'right' && anchor.right + gap + width <= innerWidth - gutter) {
        setPosition({left: anchor.right + gap, top: Math.max(gutter, Math.min(anchor.top + (anchor.height - height) / 2, innerHeight - height - gutter))});
      } else {
        // Preserve the existing below/above collision fallback when the preferred side cannot fit.
        setPosition({left: Math.max(gutter, Math.min(anchor.left, innerWidth - width - gutter)), top: anchor.bottom + gap + height <= innerHeight - gutter ? anchor.bottom + gap : Math.max(gutter, anchor.top - height - gap)});
      }
    }
    function outside(event: PointerEvent) {if (event.target instanceof Node && !trigger.current?.contains(event.target) && !tooltip.current?.contains(event.target)) setOpen(false);}
    function escape(event: KeyboardEvent) {if (event.key === 'Escape') {window.clearTimeout(closeTimer.current); setOpen(false);}}
    place();
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);
    };
  }, [open, content, placement]);

  return <>
    {children({ref: trigger, 'aria-describedby': open ? id : undefined, onFocus: show, onBlur: close, onPointerEnter: show, onPointerLeave: leave, onClick: show})}
    {open && createPortal(<div id={id} ref={tooltip} role="tooltip" className={styles.tooltip} style={position} onPointerEnter={show} onPointerLeave={leave}>{content}</div>, document.body)}
  </>;
}
