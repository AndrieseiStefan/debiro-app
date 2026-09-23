import type {ButtonHTMLAttributes, ReactNode} from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
};

export function Button({
  children,
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled,
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={loading ? (loadingLabel ?? props['aria-label']) : props['aria-label']}
    >
      {loading && <span aria-hidden="true" className={styles.spinner} />}
      <span className={styles.content}>{children}</span>
    </button>
  );
}
