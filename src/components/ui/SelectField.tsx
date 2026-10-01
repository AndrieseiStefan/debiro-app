import {type ReactNode, type SelectHTMLAttributes} from 'react';
import {AppIcon} from '@/components/layout/AppIcon';
import styles from './Field.module.css';

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  children: ReactNode;
  error?: string;
  controlSize?: 'compact';
};

export function SelectField({id, label, placeholder, value, children, error, required, className, controlSize, 'aria-describedby': describedBy, ...selectProps}: SelectFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const descriptionIds = [describedBy, errorId].filter(Boolean).join(' ') || undefined;

  return <div className={[styles.field, className].filter(Boolean).join(' ')}>
    <label className={styles.label} htmlFor={id}>{label}{required && <span aria-hidden="true" className={styles.required}> *</span>}</label>
    <span className={styles.selectWrap}>
      <select {...selectProps} id={id} className={[styles.input, styles.select].join(' ')} value={value} required={required} data-empty={value === ''} data-size={controlSize} aria-invalid={error ? true : undefined} aria-describedby={descriptionIds} data-invalid={error ? 'true' : undefined}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {children}
      </select>
      <AppIcon name="chevronDown" size={17} className={styles.selectIcon}/>
    </span>
    {error && <p className={styles.error} id={errorId} role="alert">{error}</p>}
  </div>;
}
