import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button, ButtonLink} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {planCatalog, type CompanyPlanId, type PlanDefinition} from './plan-catalog';
import styles from './PlanCards.module.css';

type Presentation =
  | {context: 'marketing'; featuredPlanId: string | null}
  | {context: 'upgrade'; currentPlanId?: CompanyPlanId; nextEligiblePlanId?: CompanyPlanId; trialLabel?: string; onAction: (planId: CompanyPlanId) => void};

/** Presentation only: no session, active-company or billing-state reads. */
export function PlanCards({locale, plans = planCatalog, ...presentation}: {locale: string; plans?: readonly PlanDefinition[]} & Presentation) {
  const t = useTranslations('CompanyBilling');
  const pricing = useTranslations('PlanCards');
  const language = locale === 'en' ? 'en' : 'ro';
  const displayed = [...plans].filter((plan) => presentation.context === 'upgrade' || plan.available).sort((a, b) => a.rank - b.rank);
  const current = presentation.context === 'upgrade' ? plans.find((plan) => plan.id === presentation.currentPlanId) : undefined;
  if (!displayed.length) return <Surface className={styles.empty} role="status">{pricing('empty')}</Surface>;
  return <div className={styles.cards} data-plan-context={presentation.context}>{displayed.map((plan) => {
    const isCurrent = presentation.context === 'upgrade' && presentation.currentPlanId === plan.id;
    const recommended = presentation.context === 'upgrade' && presentation.nextEligiblePlanId === plan.id;
    const featured = presentation.context === 'marketing' && presentation.featuredPlanId === plan.id;
    const eligible = current && plan.available && plan.rank > current.rank;
    return <Surface key={plan.id} className={styles.card} data-plan-id={plan.id} data-current={isCurrent || undefined} data-recommended={recommended || undefined} data-featured={featured || undefined}>
      {(recommended || featured) && <div className={styles.recommendation}>{featured ? pricing('featured') : t('upgrade.recommended')}</div>}
      <div className={styles.cardTop}><span className={styles.icon}><AppIcon name={plan.id === 'Starter' ? 'send' : plan.id === 'Professional' ? 'users' : 'building'} size={26}/></span>{isCurrent && <span className={styles.current}>{t('upgrade.current')}</span>}</div>
      <h3>{plan.name[language]}</h3><div className={styles.price}><strong>{plan.monthlyPriceEur} €</strong><span>{t('upgrade.period')}</span></div>
      <p className={styles.demoLabel}>{t('upgrade.demoPricing')}</p>
      {isCurrent && presentation.context === 'upgrade' && presentation.trialLabel && <span className={styles.trial}>{presentation.trialLabel}</span>}
      <ul><li><AppIcon name="check" size={18}/>{t('limits.members', {count: plan.seatLimit})}</li>{Object.entries(plan.capabilities).filter(([, enabled]) => enabled).map(([capability]) => <li key={capability}><AppIcon name="check" size={18}/>{t(`limits.${capability}` as 'limits.unlimitedDocuments')}</li>)}</ul>
      <div className={styles.action}>{presentation.context === 'marketing'
        ? <ButtonLink href="/onboarding" variant={featured ? 'primary' : 'secondary'}>{pricing('start')}</ButtonLink>
        : isCurrent ? <span className={styles.informational}>{t('upgrade.current')}</span>
          : eligible ? <Button variant={recommended ? 'primary' : 'secondary'} onClick={() => presentation.onAction(plan.id)}>{t('upgrade.action')}</Button>
            : <span className={styles.informational}>{t(plan.available ? 'upgrade.comparisonOnly' : 'upgrade.unavailable')}</span>}</div>
    </Surface>;
  })}</div>;
}
