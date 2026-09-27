'use client';

import {useRef, useState, type FormEvent, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/i18n/navigation';
import {PageContainer} from '@/components/layout/PageContainer';
import {PublicHeader} from '@/components/layout/PublicHeader';
import {Button} from '@/components/ui/Button';
import {Divider} from '@/components/ui/Divider';
import {Field} from '@/components/ui/Field';
import {Surface} from '@/components/ui/Surface';
import {OnboardingIcon} from './OnboardingIcon';
import type {OnboardingFixture} from './fixtures';
import styles from './OnboardingPage.module.css';

const stepIds = ['company', 'requirements', 'suppliers'] as const;
const requirementIds = ['registration', 'tax', 'insurance', 'fireSafety', 'iso'] as const;
type RequirementId = (typeof requirementIds)[number];
type SupplierRow = {id: number; name: string; email: string};

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function RequirementsStep({template, onTemplateChange, selected, onToggle, onContinue}: {
  template: 'construction' | 'general';
  onTemplateChange: (value: 'construction' | 'general') => void;
  selected: RequirementId[];
  onToggle: (id: RequirementId) => void;
  onContinue: () => void;
}) {
  const t = useTranslations('Onboarding');
  return <>
    <h1 id="onboarding-heading">{t('requirements.heading')}</h1>
    <p className={styles.lead}>{t('requirements.lead')}</p>
    <div className={styles.optionalStepBody}>
      <Surface className={styles.formCard}>
        <div className={styles.cardHeading}>
          <span className={styles.cardIcon}><OnboardingIcon name="file" size={23} /></span>
          <span><h2>{t('requirements.templateHeading')}</h2><p>{t('requirements.templateDescription')}</p></span>
        </div>
        <div className={styles.templateOptions} role="radiogroup" aria-label={t('requirements.templateHeading')}>
          {(['construction', 'general'] as const).map((id) => <label className={styles.templateOption} data-selected={template === id} key={id}>
            <input type="radio" name="requirement-template" value={id} checked={template === id} onChange={() => onTemplateChange(id)} />
            <span className={styles.templateIcon}><OnboardingIcon name={id === 'construction' ? 'helmet' : 'file'} size={24} /></span>
            <span className={styles.templateCopy}><strong>{t(`requirements.templates.${id}.title`)}</strong><small>{t(`requirements.templates.${id}.description`)}</small></span>
            {id === 'construction' && <span className={styles.recommendedBadge}>{t('requirements.recommended')}</span>}
            {id === 'general' && <OnboardingIcon name="chevron" size={16} />}
          </label>)}
        </div>
      </Surface>
      <Surface className={styles.formCard}>
        <div className={styles.cardHeading}>
          <span className={styles.cardIcon}><OnboardingIcon name="file" size={23} /></span>
          <span><h2>{t('requirements.documentsHeading')}</h2><p>{t('requirements.documentsDescription')}</p></span>
        </div>
        <div className={styles.requirementList} aria-label={t('requirements.documentsHeading')}>
          {requirementIds.map((id, index) => <label className={styles.requirementRow} key={id}>
            <input type="checkbox" checked={selected.includes(id)} onChange={() => onToggle(id)} />
            <OnboardingIcon name="file" size={20} />
            <span className={styles.requirementName}>{t(`requirements.documents.${id}`)}</span>
            <span className={styles.requirementBadge} data-required={index < 3}>{t(index < 3 ? 'requirements.required' : 'requirements.optional')}</span>
            <span className={styles.requirementInfo} title={t('requirements.documentInfo')}><OnboardingIcon name="info" size={18} /></span>
          </label>)}
        </div>
        <p className={styles.stepInfo}><OnboardingIcon name="info" size={22} /><span>{t('requirements.noteBefore')} <span className={styles.infoEmphasis}>{t('requirements.noteSection')}</span>.</span></p>
      </Surface>
      <div className={styles.optionalActions}>
        <button type="button" className={styles.skipAction} onClick={onContinue}>{t('requirements.skip')}</button>
        <div className={styles.optionalSubmit}><Button type="button" className={styles.continueButton} onClick={onContinue}>{t('continue')}<OnboardingIcon name="arrow" size={20} /></Button><span>{t('requirements.stepCount')}</span></div>
      </div>
    </div>
  </>;
}

function SuppliersStep({rows, onAdd, onUpdate, onRemove, onSkip, onFinish, submitted}: {
  rows: SupplierRow[];
  onAdd: () => void;
  onUpdate: (id: number, field: 'name' | 'email', value: string) => void;
  onRemove: (id: number) => void;
  onSkip: () => void;
  onFinish: (event: FormEvent<HTMLFormElement>) => void;
  submitted: boolean;
}) {
  const t = useTranslations('Onboarding');
  return <>
    <h1 id="onboarding-heading">{t('suppliers.heading')}</h1>
    <p className={styles.lead}>{t('suppliers.lead')}</p>
    <form noValidate onSubmit={onFinish} className={`${styles.optionalStepBody} ${styles.supplierStepBody}`}>
      <Surface className={styles.formCard}>
        <div className={styles.cardHeading}>
          <span className={styles.cardIcon}><OnboardingIcon name="users" size={23} /></span>
          <span><h2>{t('suppliers.invitesHeading')}</h2><p>{t('suppliers.invitesDescription')}</p></span>
        </div>
        <div className={styles.supplierRows}>
          {rows.length === 0 && <p className={styles.emptySuppliers}>{t('suppliers.empty')}</p>}
          {rows.map((row) => {
            const populated = Boolean(row.name.trim() || row.email.trim());
            const nameError = submitted && populated && !row.name.trim();
            const emailError = submitted && populated && !validEmail(row.email);
            const ready = Boolean(row.name.trim()) && validEmail(row.email);
            return <div className={styles.supplierRow} key={row.id}>
              <div className={styles.supplierField}>
                <label htmlFor={`supplier-name-${row.id}`}>{t('suppliers.name')}<span className={styles.required}> *</span></label>
                <input id={`supplier-name-${row.id}`} value={row.name} onChange={(event) => onUpdate(row.id, 'name', event.target.value)} aria-invalid={nameError || undefined} aria-describedby={nameError ? `supplier-name-error-${row.id}` : undefined} />
                {nameError && <small id={`supplier-name-error-${row.id}`} role="alert">{t('suppliers.nameError')}</small>}
              </div>
              <div className={styles.supplierField}>
                <label htmlFor={`supplier-email-${row.id}`}>{t('suppliers.email')}<span className={styles.required}> *</span></label>
                <div className={styles.supplierEmail}><OnboardingIcon name="mail" size={18} /><input id={`supplier-email-${row.id}`} type="email" value={row.email} onChange={(event) => onUpdate(row.id, 'email', event.target.value)} aria-invalid={emailError || undefined} aria-describedby={emailError ? `supplier-email-error-${row.id}` : undefined} /></div>
                {emailError && <small id={`supplier-email-error-${row.id}`} role="alert">{t('suppliers.emailError')}</small>}
              </div>
              <div className={styles.supplierStatus}><span>{t('suppliers.status')}</span><strong data-ready={ready}><OnboardingIcon name={ready ? 'send' : 'info'} size={16} />{t(ready ? 'suppliers.ready' : 'suppliers.incomplete')}</strong></div>
              <button type="button" className={styles.removeSupplier} aria-label={t('suppliers.remove', {name: row.name || t('suppliers.unnamed')})} onClick={() => onRemove(row.id)}><OnboardingIcon name="trash" size={18} /></button>
            </div>;
          })}
        </div>
        <button type="button" className={styles.addSupplier} onClick={onAdd}><OnboardingIcon name="plus" size={22} />{t('suppliers.add')}</button>
        <p className={styles.stepInfo}><OnboardingIcon name="info" size={22} /><span>{t('suppliers.noteBefore')} <span className={styles.infoEmphasis}>{t('suppliers.noteSection')}</span>.</span></p>
      </Surface>
      <div className={styles.optionalActions}>
        <button type="button" className={styles.skipAction} onClick={onSkip}>{t('suppliers.skip')}</button>
        <div className={styles.optionalSubmit}><Button type="submit" className={styles.continueButton}>{t('suppliers.finish')}<OnboardingIcon name="arrow" size={20} /></Button><span>{t('suppliers.stepCount')}</span></div>
      </div>
    </form>
  </>;
}

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
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [template, setTemplate] = useState<'construction' | 'general'>('construction');
  const [selectedRequirements, setSelectedRequirements] = useState<RequirementId[]>([...fixture.requirementIds]);
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>(fixture.suppliers.map((supplier) => ({...supplier})));
  const [suppliersSubmitted, setSuppliersSubmitted] = useState(false);
  const nextSupplierId = useRef(fixture.suppliers.length + 1);
  const [password, setPassword] = useState<string>(fixture.password);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const passwordChecks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep(2);
  }

  function toggleRequirement(id: RequirementId) {
    setSelectedRequirements((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function chooseTemplate(value: 'construction' | 'general') {
    setTemplate(value);
    setSelectedRequirements(value === 'construction' ? [...fixture.requirementIds] : ['registration', 'tax']);
  }

  function updateSupplier(id: number, field: 'name' | 'email', value: string) {
    setSupplierRows((current) => current.map((row) => row.id === id ? {...row, [field]: value} : row));
  }

  function finishOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuppliersSubmitted(true);
    const populatedRows = supplierRows.filter((row) => row.name.trim() || row.email.trim());
    if (populatedRows.some((row) => !row.name.trim() || !validEmail(row.email))) return;
    router.push('/dashboard');
  }

  return (
    <div className={styles.page}>
      <PublicHeader locale={locale} localePath="/onboarding" helpLabel={t('help')} />
      <PageContainer>
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
            <ol className={styles.progress} aria-label={t('progressLabel')} data-step={step}>
              {stepIds.map((stepId, index) => (
                <li key={stepId} aria-current={index + 1 === step ? 'step' : undefined} className={index + 1 === step ? styles.currentProgress : index + 1 < step ? styles.completedProgress : undefined}>
                  {step === 3 && index === 1 ? <button type="button" className={styles.completedStepButton} onClick={() => setStep(2)}><span className={styles.progressNumber}><OnboardingIcon name="check" size={19} /></span><span>{t(`steps.${stepId}.title`)}</span></button> : <><span className={styles.progressNumber}>{index + 1 < step ? <OnboardingIcon name="check" size={19} /> : index + 1}</span><span>{t(`steps.${stepId}.title`)}</span></>}
                </li>
              ))}
            </ol>
            <Divider />

            <div className={styles.contentGrid}>
              <div className={styles.formColumn}>
                {step === 1 ? <>
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
                </> : step === 2 ? <RequirementsStep template={template} onTemplateChange={chooseTemplate} selected={selectedRequirements} onToggle={toggleRequirement} onContinue={() => setStep(3)} /> : <SuppliersStep rows={supplierRows} onAdd={() => {setSupplierRows((current) => [...current, {id: nextSupplierId.current++, name: '', email: ''}]);}} onUpdate={updateSupplier} onRemove={(id) => setSupplierRows((current) => current.filter((row) => row.id !== id))} onSkip={() => router.push('/dashboard')} onFinish={finishOnboarding} submitted={suppliersSubmitted} />}
              </div>

              <aside className={styles.rightRail} aria-label={t('guidanceLabel')}>
                <div className={styles.quoteCard}>
                  <p className={styles.quote}><span aria-hidden="true">“</span>{t(step === 1 ? 'quote' : step === 2 ? 'requirements.quote' : 'suppliers.quote')}<span aria-hidden="true">”</span></p>
                  <div className={styles.quoteIllustration} data-step={step} aria-hidden="true">
                    <div className={styles.paper}>
                      <span className={styles.paperRow}><i /><b /></span>
                      <span className={styles.paperRow}><i /><b /></span>
                      <span className={styles.paperRow}><i /><b /></span>
                    </div>
                    <span className={styles.personBubble}><OnboardingIcon name="user" size={28} /></span>
                    {step === 3 && <><span className={`${styles.companyBubble} ${styles.companyBubbleLeft}`}><OnboardingIcon name="building" size={26} /></span><span className={`${styles.companyBubble} ${styles.companyBubbleRight}`}><OnboardingIcon name="building" size={26} /></span></>}
                  </div>
                  <p className={styles.quoteHandwriting}>{t(step === 3 ? 'suppliers.quoteHandwriting' : 'quoteHandwriting')}</p>
                </div>

                <ol className={styles.stepDetails} aria-label={t('stepsLabel')}>
                  {stepIds.map((stepId, index) => (
                    <li key={stepId}>
                      <Surface className={`${styles.stepCard} ${index + 1 === step ? styles.activeStepCard : ''} ${index + 1 < step ? styles.completedStepCard : ''}`}>
                        <span className={styles.stepNumber}>{index + 1 < step ? <OnboardingIcon name="check" size={20} /> : index + 1}</span>
                        <span><strong>{t(`steps.${stepId}.title`)}</strong><small>{t(`steps.${stepId}.description`)}</small></span>
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
      </PageContainer>
    </div>
  );
}
