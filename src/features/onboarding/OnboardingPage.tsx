'use client';

import {useState, type FormEvent, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {Button} from '@/components/ui/Button';
import {Divider} from '@/components/ui/Divider';
import {Field} from '@/components/ui/Field';
import {Surface} from '@/components/ui/Surface';
import {Link} from '@/i18n/navigation';
import {OnboardingIcon} from './OnboardingIcon';
import type {OnboardingFixture} from './fixtures';
import styles from './OnboardingPage.module.css';

const stepIds = ['company', 'requirements', 'suppliers'] as const;

function SelectionField({id, label, value, icon}: {id: string; label: string; value: string; icon?: ReactNode}) {
  return (
    <div className={styles.selectField}>
      <label htmlFor={id}>{label}<span aria-hidden="true" className={styles.required}> *</span></label>
      <div className={styles.selectWrap}>
        {icon && <span className={styles.selectLeading} aria-hidden="true">{icon}</span>}
        <select id={id} name={id} defaultValue={value} required>
          <option value={value}>{value}</option>
        </select>
        <OnboardingIcon name="chevron" size={16} />
      </div>
    </div>
  );
}

export function OnboardingPage({locale, fixture}: {locale: string; fixture: OnboardingFixture}) {
  const t = useTranslations('Onboarding');
  const [password, setPassword] = useState<string>(fixture.password);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const passwordChecks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // This E1 screen has no next-step or persistence contract yet.
    event.preventDefault();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="DEBIRO">
          <BrandWordmark />
          <span>{t('brandTaglineOne')}<br />{t('brandTaglineTwo')}</span>
        </Link>
        <div className={styles.headerRight}>
          <nav className={styles.languageSwitch} aria-label={t('languageLabel')}>
            <Link href="/onboarding" locale="ro" aria-current={locale === 'ro' ? 'page' : undefined} className={locale === 'ro' ? styles.activeLocale : undefined}>RO</Link>
            <Link href="/onboarding" locale="en" aria-current={locale === 'en' ? 'page' : undefined} className={locale === 'en' ? styles.activeLocale : undefined}>EN</Link>
          </nav>
          <span className={styles.headerDivider} aria-hidden="true" />
          <button type="button" aria-disabled="true" className={styles.help}><OnboardingIcon name="help" size={21} />{t('help')}</button>
        </div>
      </header>

      <main className={styles.mainGrid}>
        <aside className={styles.introPanel} aria-labelledby="intro-heading">
          <div className={styles.introContent}>
            <p className={styles.introEyebrow}>{t('welcomeEyebrow')}</p>
            <h2 id="intro-heading">{t('introTitle')}</h2>
            <p className={styles.introDescription}>{t('introDescription')}</p>
            <ul className={styles.benefits}>
              <li><span className={styles.benefitIcon}><OnboardingIcon name="shield" size={24} /></span><span><strong>{t('benefits.riskTitle')}</strong><small>{t('benefits.riskDescription')}</small></span></li>
              <li><span className={styles.benefitIcon}><OnboardingIcon name="bolt" size={24} /></span><span><strong>{t('benefits.efficiencyTitle')}</strong><small>{t('benefits.efficiencyDescription')}</small></span></li>
              <li><span className={styles.benefitIcon}><OnboardingIcon name="users" size={24} /></span><span><strong>{t('benefits.growthTitle')}</strong><small>{t('benefits.growthDescription')}</small></span></li>
            </ul>
          </div>
          <p className={styles.introHandwriting}>{t('introHandwriting')}</p>
          <div className={styles.mountainArt} aria-hidden="true" />
        </aside>

        <section className={styles.workspace} aria-labelledby="onboarding-heading">
          <ol className={styles.progress} aria-label={t('progressLabel')}>
            {stepIds.map((step, index) => (
              <li key={step} aria-current={index === 0 ? 'step' : undefined} className={index === 0 ? styles.currentProgress : undefined}>
                <span className={styles.progressNumber}>{index + 1}</span>
                <span>{t(`steps.${step}.title`)}</span>
              </li>
            ))}
          </ol>
          <Divider />

          <div className={styles.contentGrid}>
            <div className={styles.formColumn}>
              <h1 id="onboarding-heading">{t('heading')}</h1>
              <p className={styles.lead}>{t('lead')}</p>

              <form onSubmit={handleSubmit} className={styles.form}>
                <Surface className={styles.formCard}>
                  <div className={styles.cardHeading}>
                    <span className={styles.cardIcon}><OnboardingIcon name="file" size={23} /></span>
                    <span><h2>{t('companySectionTitle')}</h2><p>{t('companySectionDescription')}</p></span>
                  </div>
                  <div className={styles.fieldsGrid}>
                    <div className={styles.fullField}>
                      <Field id="company-name" name="companyName" label={t('companyName')} defaultValue={fixture.companyName} required className={styles.onboardingField} />
                      <span className={styles.example}>{t('companyExample')}</span>
                    </div>
                    <SelectionField id="industry" label={t('industry')} value={t('industryValue')} icon={<OnboardingIcon name="user" size={18} />} />
                    <SelectionField id="company-size" label={t('companySize')} value={t('companySizeValue')} icon={<OnboardingIcon name="users" size={18} />} />
                    <Field id="tax-id" name="taxId" label={t('taxId')} defaultValue={fixture.taxId} required className={styles.onboardingField} />
                    <SelectionField id="country" label={t('country')} value={t('countryValue')} icon={<span className={styles.countryFlag}>🇷🇴</span>} />
                  </div>
                </Surface>

                <Surface className={styles.formCard}>
                  <div className={styles.cardHeading}>
                    <span className={styles.cardIcon}><OnboardingIcon name="user" size={23} /></span>
                    <span><h2>{t('administratorSectionTitle')}</h2><p>{t('administratorSectionDescription')}</p></span>
                  </div>
                  <div className={styles.fieldsGrid}>
                    <Field id="administrator-name" name="administratorName" label={t('fullName')} defaultValue={fixture.administratorName} required className={styles.onboardingField} />
                    <div className={styles.iconField}>
                      <Field id="administrator-email" name="email" type="email" label={t('email')} defaultValue={fixture.email} required className={styles.onboardingField} />
                      <span aria-hidden="true"><OnboardingIcon name="mail" size={17} /></span>
                    </div>
                    <div className={`${styles.fullField} ${styles.iconField} ${styles.passwordField}`}>
                      <Field id="administrator-password" name="password" type={passwordVisible ? 'text' : 'password'} label={t('password')} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}" autoComplete="new-password" aria-describedby="password-requirements" required className={styles.onboardingField} />
                      <span aria-hidden="true"><OnboardingIcon name="lock" size={17} /></span>
                      <button type="button" className={styles.revealPassword} aria-label={passwordVisible ? t('hidePassword') : t('showPassword')} onClick={() => setPasswordVisible((visible) => !visible)}><OnboardingIcon name={passwordVisible ? 'eye' : 'eyeOff'} size={19} /></button>
                    </div>
                  </div>
                  <ul id="password-requirements" className={styles.passwordChecks} aria-label={t('passwordRulesLabel')}>
                    {(['length', 'uppercase', 'digit', 'special'] as const).map((rule, index) => (
                      <li key={rule} className={passwordChecks[index] ? styles.met : undefined}><span><OnboardingIcon name="check" size={11} /></span>{t(`passwordRules.${rule}`)}</li>
                    ))}
                  </ul>
                </Surface>

                <label className={styles.terms}>
                  <input name="terms" type="checkbox" required defaultChecked={fixture.acceptedTerms} />
                  <span>{t('termsBefore')} <button type="button" aria-disabled="true" className={styles.legalLink}>{t('termsLink')}</button> {t('termsBetween')} <button type="button" aria-disabled="true" className={styles.legalLink}>{t('privacyLink')}</button> {t('termsAfter')}</span>
                </label>
                <div className={styles.submitArea}>
                  <Button type="submit" className={styles.continueButton}>{t('continue')}<OnboardingIcon name="arrow" size={20} /></Button>
                  <span>{t('stepCount')}</span>
                </div>
              </form>
            </div>

            <aside className={styles.rightRail} aria-label={t('guidanceLabel')}>
              <div className={styles.quoteCard}>
                <p className={styles.quote}><span aria-hidden="true">“</span>{t('quote')}<span aria-hidden="true">”</span></p>
                <div className={styles.quoteIllustration} aria-hidden="true">
                  <div className={styles.paper}>
                    <span className={styles.paperRow}><i /><b /></span>
                    <span className={styles.paperRow}><i /><b /></span>
                    <span className={styles.paperRow}><i /><b /></span>
                  </div>
                  <span className={styles.personBubble}><OnboardingIcon name="user" size={28} /></span>
                </div>
                <p className={styles.quoteHandwriting}>{t('quoteHandwriting')}</p>
              </div>

              <ol className={styles.stepDetails} aria-label={t('stepsLabel')}>
                {stepIds.map((step, index) => (
                  <li key={step}>
                    <Surface className={`${styles.stepCard} ${index === 0 ? styles.activeStepCard : ''}`}>
                      <span className={styles.stepNumber}>{index + 1}</span>
                      <span><strong>{t(`steps.${step}.title`)}</strong><small>{t(`steps.${step}.description`)}</small></span>
                    </Surface>
                  </li>
                ))}
              </ol>
              <Surface className={styles.securityCard}>
                <span className={styles.securityIcon}><OnboardingIcon name="lock" size={25} /></span>
                <span><strong>{t('securityTitle')}</strong><small>{t('securityDescription')}</small></span>
              </Surface>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
