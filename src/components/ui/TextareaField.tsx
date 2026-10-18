import {forwardRef, type TextareaHTMLAttributes} from 'react';
import styles from './Field.module.css';

type TextareaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  controlSize?: 'compact';
};

/** Multiline counterpart of Field; labels, controls, errors and focus share the same treatment. */
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField({id, label, helperText, error, controlSize, required, className, 'aria-describedby': describedBy, ...props}, ref) {
  const helperId = helperText ? `${id}-help` : undefined, errorId = error ? `${id}-error` : undefined;
  return <div className={[styles.field, className].filter(Boolean).join(' ')}>
    <label className={styles.label} htmlFor={id}>{label}{required && <span aria-hidden="true" className={styles.required}> *</span>}</label>
    <textarea {...props} ref={ref} id={id} className={`${styles.input} ${styles.textarea}`} data-size={controlSize} required={required} aria-invalid={error ? true : undefined} data-invalid={error ? 'true' : undefined} aria-describedby={[describedBy, helperId, errorId].filter(Boolean).join(' ') || undefined}/>
    {helperText && <p className={styles.helper} id={helperId}>{helperText}</p>}
    {error && <p className={styles.error} id={errorId} role="alert">{error}</p>}
  </div>;
});
