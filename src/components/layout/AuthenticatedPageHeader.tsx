import type {ReactNode} from 'react';
import {AppIcon, type AppIconName} from './AppIcon';
import {Button, type ButtonProps} from '@/components/ui/Button';
import styles from './AuthenticatedPageHeader.module.css';

export function AuthenticatedPageHeader({context, title, titleId, description, supportingContent, actions}: {
  context: ReactNode;
  title: ReactNode;
  titleId: string;
  description: ReactNode;
  supportingContent?: ReactNode;
  actions?: ReactNode;
}) {
  return <section className={styles.header} aria-labelledby={titleId} data-supporting={supportingContent ? 'true' : undefined}>
    <div className={styles.context}>{context}</div>
    <div className={styles.body}>
      <div className={styles.copy}>
        <h1 id={titleId}>{title}</h1>
        <p>{description}</p>
      </div>
      {(supportingContent || actions) && <div className={styles.side}>
        {supportingContent && <div className={styles.supporting} data-page-header-support>{supportingContent}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>}
    </div>
  </section>;
}

export function AuthenticatedPagePrimaryAction({icon, children, ...props}: Omit<ButtonProps, 'variant' | 'className'> & {icon: AppIconName}) {
  return <Button {...props} variant="primary" className={styles.primaryAction} data-page-primary-action><AppIcon name={icon} size={24} />{children}</Button>;
}
