import type {InputHTMLAttributes} from 'react';
import styles from './Field.module.css';

export type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
};

export function Field({
  id,
  label,
  helperText,
  error,
  required,
  className,
  'aria-describedby': describedBy,
  ...inputProps
}: FieldProps) {
  const helperId = helperText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const descriptionIds = [describedBy, helperId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span aria-hidden="true" className={styles.required}> *</span>}
      </label>
      <input
        {...inputProps}
        id={id}
        className={styles.input}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionIds}
        data-invalid={error ? 'true' : undefined}
      />
      {helperText && <p className={styles.helper} id={helperId}>{helperText}</p>}
      {error && <p className={styles.error} id={errorId} role="alert">{error}</p>}
    </div>
  );
}
