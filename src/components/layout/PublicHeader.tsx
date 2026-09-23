import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {PublicContainer} from '@/components/layout/PublicContainer';
import {Button} from '@/components/ui/Button';
import {Link} from '@/i18n/navigation';
import styles from './PublicHeader.module.css';

type NavigationLabels = {
  label: string;
  product: string;
  solutions: string;
  pricing: string;
  resources: string;
};

function HeaderIcon({name, size}: {name: 'arrow' | 'chevron' | 'help'; size: number}) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'help' ? 1.9 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {name === 'arrow' && <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>}
      {name === 'chevron' && <path d="m6 9 6 6 6-6" />}
      {name === 'help' && <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.7 2.7 0 0 1 5.1 1.2c0 1.8-2.6 2.2-2.6 4M12 17h.01" /></>}
    </svg>
  );
}

export function PublicHeader({
  locale,
  localePath,
  navigation,
  helpLabel
}: {
  locale: string;
  localePath: '/' | '/onboarding';
  navigation?: NavigationLabels;
  helpLabel?: string;
}) {
  const t = useTranslations('PublicHeader');

  return (
    <header className={styles.siteHeader}>
      <PublicContainer className={styles.headerInner}>
        <Link className={styles.brandLink} href="/" aria-label="DEBIRO"><BrandWordmark /></Link>
        {navigation ? (
          <nav className={styles.mainNav} aria-label={navigation.label}>
            <button type="button" aria-disabled="true" className={styles.navItem}>{navigation.product} <HeaderIcon name="chevron" size={12} /></button>
            <button type="button" aria-disabled="true" className={styles.navItem}>{navigation.solutions} <HeaderIcon name="chevron" size={12} /></button>
            <a className={styles.navItem} href="#preturi">{navigation.pricing}</a>
            <button type="button" aria-disabled="true" className={styles.navItem}>{navigation.resources} <HeaderIcon name="chevron" size={12} /></button>
          </nav>
        ) : helpLabel ? (
          <button type="button" aria-disabled="true" className={styles.help}><HeaderIcon name="help" size={21} />{helpLabel}</button>
        ) : <span aria-hidden="true" />}
        <div className={styles.headerActions}>
          <nav className={styles.languageSwitch} aria-label={t('languageLabel')}>
            <Link href={localePath} locale="ro" aria-current={locale === 'ro' ? 'page' : undefined} className={locale === 'ro' ? styles.activeLocale : undefined}>RO</Link>
            <Link href={localePath} locale="en" aria-current={locale === 'en' ? 'page' : undefined} className={locale === 'en' ? styles.activeLocale : undefined}>EN</Link>
          </nav>
          <div className={styles.headerAccountActions}>
            <button type="button" aria-disabled="true" className={styles.login}>{t('login')}</button>
            <Button aria-disabled="true" className={styles.headerCta}>{t('tryFree')} <HeaderIcon name="arrow" size={17} /></Button>
          </div>
        </div>
      </PublicContainer>
    </header>
  );
}
