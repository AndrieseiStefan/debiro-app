import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {PublicContainer} from '@/components/layout/PublicContainer';
import {Button} from '@/components/ui/Button';
import {Link} from '@/i18n/navigation';
import {DashboardPreview} from './DashboardPreview';
import {LandingIcon} from './LandingIcon';
import type {LandingPreview} from './types';
import styles from './LandingPage.module.css';

const features = [
  {id: 'invite', icon: 'users', number: '01'},
  {id: 'extract', icon: 'file', number: '02'},
  {id: 'remind', icon: 'bell', number: '03'}
] as const;

export function LandingPage({locale, preview}: {locale: string; preview: LandingPreview}) {
  const t = useTranslations('Landing');

  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <PublicContainer className={styles.headerInner}>
          <Link className={styles.brandLink} href="/" aria-label="DEBIRO">
            <BrandWordmark />
          </Link>
          <nav className={styles.mainNav} aria-label={t('navigationLabel')}>
            <button type="button" aria-disabled="true" className={styles.navItem}>{t('navProduct')} <LandingIcon name="chevron" size={12} /></button>
            <button type="button" aria-disabled="true" className={styles.navItem}>{t('navSolutions')} <LandingIcon name="chevron" size={12} /></button>
            <a className={styles.navItem} href="#preturi">{t('navPricing')}</a>
            <button type="button" aria-disabled="true" className={styles.navItem}>{t('navResources')} <LandingIcon name="chevron" size={12} /></button>
          </nav>
          <div className={styles.headerActions}>
            <nav className={styles.languageSwitch} aria-label={t('languageLabel')}>
              <Link href="/" locale="ro" aria-current={locale === 'ro' ? 'page' : undefined} className={locale === 'ro' ? styles.activeLocale : undefined}>RO</Link>
              <Link href="/" locale="en" aria-current={locale === 'en' ? 'page' : undefined} className={locale === 'en' ? styles.activeLocale : undefined}>EN</Link>
            </nav>
            <button type="button" aria-disabled="true" className={styles.login}>{t('login')}</button>
            <Button aria-disabled="true" className={styles.headerCta}>{t('tryFree')} <LandingIcon name="arrow" size={17} /></Button>
          </div>
        </PublicContainer>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="landing-heading">
          <div className={styles.heroClouds} aria-hidden="true" />
          <PublicContainer className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{t('heroEyebrow')}</p>
              <h1 id="landing-heading" className={styles.heroTitle}>
                <span>{t('heroTitleOne')}</span>{' '}
                <span>{t('heroTitleTwo')}</span>{' '}
                <span className={styles.heroTitleBlue}>{t('heroTitleThree')}</span>
              </h1>
              <p className={styles.heroDescription}>{t('heroDescription')}</p>
              <div className={styles.heroActions}>
                <Button aria-disabled="true" className={styles.heroCta}>{t('tryFree')} <LandingIcon name="arrow" size={22} /></Button>
                <button type="button" aria-disabled="true" className={styles.videoButton}>
                  <span className={styles.playDisc}><LandingIcon name="play" size={20} /></span>
                  <span><strong>{t('watchHow')}</strong><small>{t('videoDuration')}</small></span>
                </button>
              </div>
              <ul className={styles.benefits}>
                <li><span className={styles.benefitCheck}><LandingIcon name="check" size={11} /></span>{t('benefitCard')}</li>
                <li><span className={styles.benefitCheck}><LandingIcon name="check" size={11} /></span>{t('benefitSetup')}</li>
                <li><span className={styles.benefitCheck}><LandingIcon name="check" size={11} /></span>{t('benefitSupport')}</li>
              </ul>
            </div>
            <div className={styles.heroVisual}>
              <DashboardPreview preview={preview} locale={locale} />
              <p className={styles.heroHandwriting}>{t('heroHandwriting')}</p>
            </div>
          </PublicContainer>
        </section>

        <section className={styles.features} aria-labelledby="feature-heading">
          <PublicContainer>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionEyebrow}>{t('featuresEyebrow')}</p>
              <h2 id="feature-heading">{t('featuresHeading')}</h2>
              <p>{t('featuresDescription')}</p>
            </div>
            <div className={styles.featureGrid}>
              {features.map((feature) => (
                <article className={styles.featureCard} key={feature.id}>
                  <div className={`${styles.featureIcon} ${styles[feature.id]}`}><LandingIcon name={feature.icon} size={30} /></div>
                  <div className={styles.featureText}>
                    <h3>{t(`features.${feature.id}.title`)}</h3>
                    <span className={styles.featureNumber} aria-hidden="true">{feature.number}</span>
                    <p>{t(`features.${feature.id}.description`)}</p>
                    <button type="button" aria-disabled="true" className={styles.learnMore}>{t('learnMore')} <LandingIcon name="arrow" size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          </PublicContainer>
        </section>

        <section className={styles.proof} aria-label={t('proofLabel')}>
          <PublicContainer className={styles.proofInner}>
            <div className={styles.partners}>
              <p className={styles.sectionEyebrow}>{t('trustEyebrow')}</p>
              <div className={styles.partnerLogos} aria-label={t('partnerLabel')}>
                {preview.partners.map((partner, index) => (
                  <span className={`${styles.partner} ${styles[`partner${index}`]}`} key={partner}>
                    <span className={styles.partnerSymbol} aria-hidden="true">{['✿', '◒', '✦', '⌂', '⬡', '◢'][index]}</span>
                    <span>{partner}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.stats}>
              <div className={styles.stat}><span className={styles.statIcon}><LandingIcon name="users" size={22} /></span><strong>500+</strong><span>{t('statSuppliers')}</span></div>
              <div className={styles.stat}><span className={styles.statIcon}><LandingIcon name="clock" size={22} /></span><strong>98%</strong><span>{t('statOnTime')}</span></div>
              <div className={styles.stat}><span className={styles.statIcon}><LandingIcon name="chart" size={22} /></span><strong>3x</strong><span>{t('statLessTime')}</span></div>
              <div className={styles.stat}><span className={styles.statIcon}><LandingIcon name="heart" size={22} /></span><strong>99%</strong><span>{t('statHappy')}</span></div>
            </div>
          </PublicContainer>
        </section>

        <section id="preturi" className={styles.pricing} aria-labelledby="pricing-heading">
          <div className={styles.pricingClouds} aria-hidden="true" />
          <PublicContainer className={styles.pricingInner}>
            <span className={styles.pricingIcon}><LandingIcon name="tag" size={32} /></span>
            <div className={styles.pricingCopy}>
              <p className={styles.sectionEyebrow}>{t('pricingEyebrow')}</p>
              <h2 id="pricing-heading">{t('pricingHeading')}</h2>
              <p>{t('pricingDescription')}</p>
            </div>
            <button type="button" aria-disabled="true" className={styles.pricingButton}>{t('viewPlans')} <LandingIcon name="arrow" size={18} /></button>
            <div className={styles.mountains} aria-hidden="true"><span /><span /><span /><span /></div>
            <p className={styles.pricingHandwriting}>{t('pricingHandwriting')}</p>
          </PublicContainer>
        </section>
      </main>
    </div>
  );
}
