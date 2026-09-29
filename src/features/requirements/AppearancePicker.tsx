'use client';

import {useId, useLayoutEffect, useRef, useState, type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {appearanceColors, appearanceIcons, iconNames, validColorKey, validIconKey, type Appearance} from './appearance';
import styles from './AppearancePicker.module.css';

export function AppearanceIcon({appearance, size = 'normal'}: {appearance: Appearance; size?: 'small' | 'normal' | 'list' | 'large'}) {
  return <span className={styles.preview} data-color={validColorKey(appearance.iconColorKey)} data-size={size} aria-hidden="true">
    <AppIcon name={iconNames[validIconKey(appearance.iconKey)]} size={size === 'large' ? 30 : size === 'small' ? 21 : 24}/>
  </span>;
}

export function AppearancePicker({appearance, onChange, label, variant = 'field'}: {
  appearance: Appearance;
  onChange: (next: Appearance) => void;
  label: string;
  variant?: 'field' | 'icon';
}) {
  const t = useTranslations('Requirements.appearance');
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({left: 12, top: 12, width: 288, maxHeight: 320});

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const gutter = 12;
      const width = Math.min(288, window.innerWidth - gutter * 2);
      const left = Math.max(gutter, Math.min(rect.left, window.innerWidth - width - gutter));
      const height = Math.min(365, window.innerHeight - gutter * 2);
      const top = rect.bottom + 8 + height <= window.innerHeight - gutter
        ? rect.bottom + 8 : Math.max(gutter, rect.top - height - 8);
      setPosition({left, top, width, maxHeight: Math.max(120, window.innerHeight - top - gutter)});
    }
    function outside(event: PointerEvent) {
      if (!(event.target instanceof Node) || trigger.current?.contains(event.target) || panel.current?.contains(event.target)) return;
      setOpen(false);
    }
    place();
    panel.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({preventScroll: true});
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.key === 'Escape') {event.preventDefault(); setOpen(false); trigger.current?.focus({preventScroll: true});}
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
    if (event.shiftKey && document.activeElement === controls[0]) {event.preventDefault(); controls.at(-1)?.focus();}
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) {event.preventDefault(); controls[0]?.focus();}
  }

  return <span className={styles.anchor}>
    <button ref={trigger} type="button" className={styles.trigger} data-variant={variant} aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((value) => !value)}>
      <AppearanceIcon appearance={appearance} size={variant === 'icon' ? 'large' : 'small'}/>
      {variant === 'field' && <span>{t('change')}</span>}
    </button>
    {open && createPortal(<div ref={panel} id={id} role="dialog" aria-label={t('popoverTitle')} className={styles.panel} style={position} onKeyDown={onPanelKeyDown}>
      <div className={styles.section}><h3>{t('icon')}</h3><div className={styles.iconGrid}>
        {appearanceIcons.map((key) => <button type="button" key={key} aria-label={t(`icons.${key}`)} aria-pressed={appearance.iconKey === key} title={t(`icons.${key}`)} onClick={() => onChange({...appearance, iconKey: key})}><AppIcon name={iconNames[key]} size={22}/></button>)}
      </div></div>
      <div className={styles.section}><h3>{t('color')}</h3><div className={styles.colorGrid}>
        {appearanceColors.map((key) => <button type="button" key={key} className={styles.swatch} data-color={key} aria-label={t(`colors.${key}`)} aria-pressed={appearance.iconColorKey === key} title={t(`colors.${key}`)} onClick={() => onChange({...appearance, iconColorKey: key})}>{appearance.iconColorKey === key && <AppIcon name="check" size={15}/>}</button>)}
      </div></div>
    </div>, document.body)}
  </span>;
}
