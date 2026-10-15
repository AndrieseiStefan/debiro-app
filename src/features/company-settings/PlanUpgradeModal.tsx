'use client';

import {useCallback, useEffect, useRef, useState, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {Modal} from '@/components/ui/Modal';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {AppIcon} from '@/components/layout/AppIcon';
import {upgradeCompanyPlan} from '@/features/companies/company-state';
import {companyPlan, nextCompanyPlan, type CompanyPlanId} from './plan-catalog';
import {PlanCards} from './PlanCards';
import type {CompanySettingsViewModel} from './types';
import styles from './PlanUpgradeModal.module.css';

export function PlanUpgradeModal({company, locale, onClose, onSaved, triggerRef}: {company: CompanySettingsViewModel['company']; locale: string; onClose: () => void; onSaved: () => void; triggerRef: RefObject<HTMLButtonElement | null>}) {
  const t = useTranslations('CompanyBilling');
  const [expectedPlan] = useState(company.subscription.plan);
  const [target, setTarget] = useState<CompanyPlanId | null>(null);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  // Release the nested confirmation before closing its parent and restoring body scrolling.
  useEffect(() => {if (saved) onSaved();}, [saved, onSaved]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const cancel = useCallback(() => setTarget(null), []);
  const current = companyPlan(company.subscription.plan), next = nextCompanyPlan(company.subscription.plan);
  const language = locale === 'en' ? 'en' : 'ro';
  return <Modal onClose={onClose} titleId="plan-upgrade-title" descriptionId="plan-upgrade-description" className={styles.panel} blurred initialFocusRef={closeRef} fallbackFocusRef={triggerRef}>
    <button ref={closeRef} type="button" className={styles.close} aria-label={t('editor.close')} onClick={onClose}><AppIcon name="close" size={23}/></button>
    <header className={styles.header}><span className={styles.icon}><AppIcon name="crown" size={32}/></span><div><h2 id="plan-upgrade-title">{t('upgradePlan')}</h2><p id="plan-upgrade-description">{t('upgrade.description')}</p></div></header>
    {!current && <p role="alert">{t('upgrade.failure')}</p>}
    <PlanCards locale={locale} context="upgrade" currentPlanId={current?.id} nextEligiblePlanId={next?.id} trialLabel={company.subscription.status === 'trialing' ? t('trialDays', {count: company.subscription.trialDaysRemaining}) : undefined} onAction={(planId) => {setError(false); setTarget(planId);}}/>
    {error && <p className={styles.failure} role="alert">{t('upgrade.failure')}</p>}
    <footer className={styles.footer}><AppIcon name="info" size={22}/><p>{t('upgrade.demoNotice')}</p></footer>
    {target && <ConfirmationDialog icon="crown" confirmVariant="primary" title={t('upgrade.confirmTitle')} description={t('upgrade.confirmDescription', {currentPlan: companyPlan(expectedPlan)?.name[language] ?? expectedPlan, targetPlan: companyPlan(target)!.name[language]})} cancelLabel={t('editor.cancel')} confirmLabel={t('upgrade.confirmAction')} onCancel={cancel} onConfirm={() => {const result = upgradeCompanyPlan(company.id, expectedPlan, target); setTarget(null); if (result.ok) setSaved(true); else setError(true);}} backgroundSelector="[role='dialog'][aria-labelledby='plan-upgrade-title']"/>}
  </Modal>;
}
