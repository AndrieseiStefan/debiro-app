import {forwardRef, type ReactNode} from 'react';
import {AppIcon, type AppIconName} from './AppIcon';
import {Button, type ButtonProps} from '@/components/ui/Button';
import styles from './AuthenticatedPageHeader.module.css';

export function AuthenticatedPageHeader({context, title, titleId, subtitle, description, supportingContent, actions, className, reserveCopy}: {
  context: ReactNode;
  title: ReactNode;
  titleId: string;
  subtitle?: ReactNode;
  description: ReactNode;
  supportingContent?: ReactNode;
  actions?: ReactNode;
  className?: string;
  reserveCopy?: readonly {title: string; description: string}[];
}) {
  const copy = <><h1 id={titleId}>{title}</h1>{subtitle && <span className={styles.subtitle}>{subtitle}</span>}<p>{description}</p></>;
  return <section className={[styles.header, className].filter(Boolean).join(' ')} aria-labelledby={titleId} data-supporting={supportingContent ? 'true' : undefined}>
    <div className={styles.context}>{context}</div>
    <div className={styles.body}>
      <div className={[styles.copy, reserveCopy?.length ? styles.copyReserved : ''].filter(Boolean).join(' ')}>
        {reserveCopy?.length ? <>
          <div className={styles.reservation} aria-hidden="true">{reserveCopy.map((candidate, index) => <span key={index}><span className={styles.reservedTitle} data-copy={candidate.title}/><span className={styles.reservedDescription} data-copy={candidate.description}/></span>)}</div>
          <div>{copy}</div>
        </> : copy}
      </div>
      {(supportingContent || actions) && <div className={styles.side}>
        {supportingContent && <div className={styles.supporting} data-page-header-support>{supportingContent}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>}
    </div>
  </section>;
}

export const AuthenticatedPagePrimaryAction = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant' | 'className'> & {icon: AppIconName}>(function AuthenticatedPagePrimaryAction({icon, children, ...props}, ref) {
  return <Button {...props} ref={ref} variant="primary" className={styles.primaryAction} data-page-primary-action><AppIcon name={icon} size={24} />{children}</Button>;
});
