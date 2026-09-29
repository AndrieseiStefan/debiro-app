import {forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode} from 'react';
import {Link} from '@/i18n/navigation';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children,
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled,
  type = 'button',
  className,
  ...props
}: ButtonProps, ref) {
  return (
    <button
      {...props}
      ref={ref}
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
});

export function ButtonLink({children, variant = 'primary', className, ...props}: ComponentProps<typeof Link> & {variant?: ButtonVariant}) {
  return (
    <Link {...props} className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}>
      <span className={styles.content}>{children}</span>
    </Link>
  );
}
