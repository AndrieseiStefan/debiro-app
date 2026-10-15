'use client';

import {useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import type {MouseEvent} from 'react';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {PublicContainer} from '@/components/layout/PublicContainer';
import {ButtonLink} from '@/components/ui/Button';
import {getPathname, Link} from '@/i18n/navigation';
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
  helpLabel,
  showLogin = false,
  showPrimaryCta = false
}: {
  locale: string;
  localePath: '/' | '/onboarding' | '/login';
  navigation?: NavigationLabels;
  helpLabel?: string;
  showLogin?: boolean;
  showPrimaryCta?: boolean;
}) {
  const t = useTranslations('PublicHeader');
  const router = useRouter();
  const changeLocale = (event: MouseEvent<HTMLAnchorElement>, nextLocale: 'ro' | 'en') => {
    // Read the browser's current anchor at activation; no separate marketing navigation state.
    if (!navigation || !window.location.hash || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    // Resolve the canonical locale URL directly: the /ro → / redirect drops URL fragments.
    router.push(getPathname({href: `${localePath}${window.location.hash}`, locale: nextLocale}));
  };
  const hasAccountActions = showLogin || showPrimaryCta;
  const isHelpOnly = Boolean(helpLabel) && !navigation && !hasAccountActions;

  return (
    <header className={`${styles.siteHeader} ${navigation ? styles.marketingHeader : ''}`}>
      <PublicContainer className={`${styles.headerInner} ${hasAccountActions ? styles.accountHeader : ''} ${isHelpOnly ? styles.helpOnlyHeader : ''}`}>
        <Link className={styles.brandLink} href="/" aria-label="DEBIRO"><BrandWordmark /></Link>
        {navigation ? (
          <nav className={styles.mainNav} aria-label={navigation.label}>
            <a className={styles.navItem} href="#product">{navigation.product} <HeaderIcon name="chevron" size={12} /></a>
            <a className={styles.navItem} href="#solutions">{navigation.solutions} <HeaderIcon name="chevron" size={12} /></a>
            <a className={styles.navItem} href="#pricing">{navigation.pricing}</a>
            <a className={styles.navItem} href="#resources">{navigation.resources} <HeaderIcon name="chevron" size={12} /></a>
          </nav>
        ) : helpLabel ? (
          <button type="button" aria-disabled="true" className={styles.help}><HeaderIcon name="help" size={21} />{helpLabel}</button>
        ) : <span aria-hidden="true" />}
        <div className={styles.headerActions}>
          <nav className={styles.languageSwitch} aria-label={t('languageLabel')}>
            <Link href={localePath} locale="ro" onClick={(event) => changeLocale(event, 'ro')} aria-current={locale === 'ro' ? 'page' : undefined} className={locale === 'ro' ? styles.activeLocale : undefined}>RO</Link>
            <Link href={localePath} locale="en" onClick={(event) => changeLocale(event, 'en')} aria-current={locale === 'en' ? 'page' : undefined} className={locale === 'en' ? styles.activeLocale : undefined}>EN</Link>
          </nav>
          {hasAccountActions && <div className={styles.headerAccountActions}>
            {showLogin && <Link href="/login" className={styles.login}>{t('login')}</Link>}
            {showPrimaryCta && <ButtonLink href="/onboarding" className={styles.headerCta}>{t('tryFree')} <HeaderIcon name="arrow" size={17} /></ButtonLink>}
          </div>}
        </div>
      </PublicContainer>
    </header>
  );
}
