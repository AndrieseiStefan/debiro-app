'use client';

import {useRef, useState} from 'react';
import {Field} from '@/components/ui/Field';
import menu from '@/components/ui/RowActionMenu.module.css';
import styles from './Employees.module.css';

/** Feature-local composition of Field and the established listbox/menu keyboard pattern. */
export function EmployeeSuggestionField({id, label, value, onChange, options, onSelect, error, helperText, required, disabled}: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  options: {id: string; label: string}[]; onSelect: (id: string) => void;
  error?: string; helperText?: string; required?: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const index = active < options.length ? active : -1;
  const expanded = open && !disabled && options.length > 0;
  function choose(key: string) {onSelect(key); setOpen(false); setActive(-1);}
  return <div ref={root} className={styles.combobox} onBlur={(event) => {if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);}} onKeyDown={(event) => {
    if (event.key === 'Escape' && expanded) {event.preventDefault(); event.stopPropagation(); setOpen(false); return;}
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      if (options.length) {const next = index < 0 ? event.key === 'ArrowDown' ? 0 : options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length; setActive(next); root.current?.querySelectorAll('[role="option"]')[next]?.scrollIntoView?.({block: 'nearest'});}
    } else if (event.key === 'Enter' && open && index >= 0) {event.preventDefault(); choose(options[index].id);}
    else if (event.key === 'Tab') setOpen(false);
  }}>
    <Field controlSize="compact" id={id} label={label} required={required} disabled={disabled} role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={expanded} aria-controls={expanded ? `${id}-options` : undefined} aria-activedescendant={expanded && index >= 0 ? `${id}-option-${index}` : undefined}
      autoComplete="off" value={value} onFocus={() => {setOpen(true); setActive(-1);}} onChange={(event) => {onChange(event.target.value); setOpen(true); setActive(-1);}} error={error} helperText={helperText}/>
    {expanded && <div id={`${id}-options`} role="listbox" aria-label={label} className={`${menu.rowMenu} ${styles.suggestions}`}>
      {options.map((option, position) => <button type="button" key={option.id} id={`${id}-option-${position}`} role="option" aria-selected={index === position} tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option.id)}>{option.label}</button>)}
    </div>}
  </div>;
}
