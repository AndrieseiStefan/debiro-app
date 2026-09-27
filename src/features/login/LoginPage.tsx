'use client';

import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {PageContainer} from '@/components/layout/PageContainer';
import {PublicHeader} from '@/components/layout/PublicHeader';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {Surface} from '@/components/ui/Surface';
import {Link, useRouter} from '@/i18n/navigation';
import {OnboardingIcon} from '@/features/onboarding/OnboardingIcon';
import type {LoginFixture} from './fixtures';
import styles from './LoginPage.module.css';

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginPage({locale, fixture}: {locale: string; fixture: LoginFixture}) {
  const t = useTranslations('Login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const emailError = emailTouched && (!email.trim() ? t('emailRequired') : !validEmail(email) ? t('emailInvalid') : undefined);
  const passwordError = passwordTouched && !password.trim() ? t('passwordRequired') : undefined;
  const canSubmit = validEmail(email) && Boolean(password.trim());

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!canSubmit) return;
    router.push(fixture.successPath);
  }

  return (
    <div className={styles.page}>
      <PublicHeader locale={locale} localePath="/login" helpLabel={t('help')} />
      <PageContainer>
        <main className={styles.mainGrid}>
          <section className={styles.promo} aria-labelledby="login-welcome">
            <p className={styles.tagline}>{t('taglineOne')}<br />{t('taglineTwo')}</p>
            <div className={styles.promoCopy}>
              <h1 id="login-welcome">{t('welcome')}</h1>
              <p className={styles.promoLead}>{t('welcomeDescription')}</p>
              <ul className={styles.benefits}>
                <li><OnboardingIcon name="check" size={34} />{t('benefitSuppliers')}</li>
                <li><OnboardingIcon name="check" size={34} />{t('benefitDocuments')}</li>
                <li><OnboardingIcon name="check" size={34} />{t('benefitCompliance')}</li>
              </ul>
            </div>
            <div className={styles.mountainArt} aria-hidden="true" />
            <p className={styles.handwriting}>{t('handwriting')}</p>
          </section>

          <section className={styles.loginArea} aria-label={t('areaLabel')}>
            <Surface className={styles.card}>
              <h2>{t('title')}</h2>
              <p className={styles.cardDescription}>{t('description')}</p>
              <form noValidate onSubmit={submit} className={styles.form}>
                <div className={styles.fieldShell}>
                  <Field id="login-email" name="email" type="email" label={t('email')} placeholder={t('emailPlaceholder')} autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setEmailTouched(true)} error={emailError || undefined} className={styles.loginField} />
                  <span className={styles.fieldIcon} aria-hidden="true"><OnboardingIcon name="mail" size={28} /></span>
                </div>
                <div className={styles.fieldShell}>
                  <Field id="login-password" name="password" type={passwordVisible ? 'text' : 'password'} label={t('password')} placeholder={t('passwordPlaceholder')} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => setPasswordTouched(true)} error={passwordError || undefined} className={styles.loginField} />
                  <span className={styles.fieldIcon} aria-hidden="true"><OnboardingIcon name="lock" size={28} /></span>
                  <button type="button" className={styles.passwordToggle} aria-label={passwordVisible ? t('hidePassword') : t('showPassword')} onClick={() => setPasswordVisible((visible) => !visible)}><OnboardingIcon name={passwordVisible ? 'eye' : 'eyeOff'} size={28} /></button>
                </div>
                <button type="button" className={styles.forgotPassword} aria-disabled="true">{t('forgotPassword')}</button>
                <Button type="submit" className={styles.submitButton} disabled={!canSubmit}>{t('submit')}<OnboardingIcon name="arrow" size={25} /></Button>
              </form>
              <div className={styles.separator}><span />{t('or')}<span /></div>
              <p className={styles.signup}>{t('noAccount')} <Link href="/onboarding">{t('startFree')}<OnboardingIcon name="arrow" size={25} /></Link></p>
            </Surface>
          </section>
        </main>
      </PageContainer>
    </div>
  );
}
