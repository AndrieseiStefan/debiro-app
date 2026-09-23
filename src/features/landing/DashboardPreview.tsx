import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {LandingIcon, type IconName} from './LandingIcon';
import type {LandingPreview} from './types';
import styles from './DashboardPreview.module.css';

const previewNav: Array<{key: string; icon: IconName}> = [
  {key: 'dashboard', icon: 'home'},
  {key: 'suppliers', icon: 'users'},
  {key: 'documents', icon: 'file'},
  {key: 'requirements', icon: 'shield'},
  {key: 'notifications', icon: 'bell'},
  {key: 'reports', icon: 'chart'},
  {key: 'settings', icon: 'gear'}
];

export function DashboardPreview({preview, locale}: {preview: LandingPreview; locale: string}) {
  const t = useTranslations('Landing.dashboard');

  return (
    <figure className={styles.frame} role="img" aria-label={t('previewLabel')}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <BrandWordmark />
          <span>{t('taglineOne')}<br />{t('taglineTwo')}</span>
        </div>
        <div className={styles.sideNav}>
          {previewNav.map(({key, icon}) => (
            <div className={`${styles.sideNavItem} ${key === 'dashboard' ? styles.selected : ''}`} key={key}>
              <LandingIcon name={icon} size={13} /><span>{t(`nav.${key}`)}</span>
              {key === 'notifications' && <b className={styles.notificationCount}>3</b>}
            </div>
          ))}
        </div>
        <div className={styles.demoAccount}>
          <span className={styles.accountDot}><LandingIcon name="users" size={12} /></span>
          <span><strong>Demo Company SRL</strong><small>Andrei Popascu</small></span>
          <LandingIcon name="chevron" size={11} />
        </div>
      </div>

      <div className={styles.workspace}>
        <div className={styles.topbar}>
          <div className={styles.search}><LandingIcon name="search" size={11} /><span>{t('search')}</span><kbd>⌘ K</kbd></div>
          <div className={styles.topbarRight}><LandingIcon name="bell" size={13} /><span className={styles.localePill}>{locale.toUpperCase()}</span><span className={styles.avatar}>AP</span><LandingIcon name="chevron" size={10} /></div>
        </div>

        <div className={styles.dashboardBody}>
          <div className={styles.welcomeRow}>
            <div className={styles.welcome}>
              <span className={styles.welcomeEyebrow}>{t('welcomeEyebrow')}</span>
              <strong>{t('welcomeTitle')}</strong>
              <small>{t('welcomeDescription', {count: preview.supplierCount})}</small>
            </div>
            <div className={styles.welcomeNotice}><span><LandingIcon name="target" size={16} /></span><b>{t('compliantPartners')}<br />{t('riskFreeGrowth')}</b></div>
            <span className={styles.addSupplier}><LandingIcon name="plus" size={12} /> {t('addSupplier')}</span>
          </div>

          <div className={styles.metricGrid}>
            <div className={styles.metric}><span className={`${styles.metricIcon} ${styles.blue}`}><LandingIcon name="users" size={14} /></span><span><small>{t('totalSuppliers')}</small><strong>{preview.supplierCount}</strong><em className={styles.greenText}>{t('monthChange')}</em></span><LandingIcon name="chevron" size={10} /></div>
            <div className={styles.metric}><span className={`${styles.metricIcon} ${styles.green}`}><LandingIcon name="check" size={14} /></span><span><small>{t('inOrder')}</small><strong>{preview.compliantCount}</strong><em className={styles.greenText}>67% {t('ofTotal')}</em></span><LandingIcon name="chevron" size={10} /></div>
            <div className={styles.metric}><span className={`${styles.metricIcon} ${styles.yellow}`}><LandingIcon name="clock" size={14} /></span><span><small>{t('needsAttention')}</small><strong>{preview.attentionCount}</strong><em className={styles.yellowText}>21% {t('ofTotal')}</em></span><LandingIcon name="chevron" size={10} /></div>
            <div className={styles.metric}><span className={`${styles.metricIcon} ${styles.red}`}>×</span><span><small>{t('noncompliant')}</small><strong>{preview.noncompliantCount}</strong><em className={styles.redText}>13% {t('ofTotal')}</em></span><LandingIcon name="chevron" size={10} /></div>
          </div>

          <div className={styles.lowerGrid}>
            <div className={styles.documentPanel}>
              <div className={styles.panelHeader}><strong><LandingIcon name="file" size={12} />{t('documentsAttention')}</strong><span>{t('viewAll')} →</span></div>
              <div className={styles.table}>
                <div className={styles.tableHeader}><span>{t('supplier')}</span><span>{t('document')}</span><span>{t('status')}</span><span>{t('expiryDate')}</span><span>{t('actions')}</span></div>
                {preview.documents.map((document) => (
                  <div className={styles.tableRow} key={document.supplier}>
                    <span>{document.supplier}</span><span>{locale === 'en' ? document.nameEn : document.name}</span>
                    <span><b className={`${styles.status} ${styles[document.status]}`}>{t(`statusLabels.${document.status}`)}</b></span>
                    <span className={document.status === 'expired' ? styles.redText : document.status === 'expiring' ? styles.yellowText : ''}>{locale === 'en' ? document.dateEn : document.date}</span>
                    <span className={styles.ellipsis}>⋮</span>
                  </div>
                ))}
              </div>
              <div className={styles.documentNotice}><span>❕ {t('urgentDocuments')}</span><b>{t('checkAndUpdate')} →</b></div>
            </div>

            <div className={styles.sidePanels}>
              <div className={styles.statusPanel}>
                <div className={styles.panelHeader}><strong><LandingIcon name="gear" size={12} />{t('supplierStatus')}</strong><span>{t('viewDetails')} →</span></div>
                <div className={styles.statusContent}>
                  <div className={styles.donut}><div><strong>{preview.supplierCount}</strong><small>{t('suppliersLower')}</small></div></div>
                  <div className={styles.legend}>
                    <span><i className={styles.greenDot} />{t('inOrder')} <b>{preview.compliantCount}</b><em>67%</em></span>
                    <span><i className={styles.yellowDot} />{t('needsAttention')} <b>{preview.attentionCount}</b><em>21%</em></span>
                    <span><i className={styles.redDot} />{t('noncompliant')} <b>{preview.noncompliantCount}</b><em>13%</em></span>
                    <span><i className={styles.grayDot} />{t('missingDocuments')} <b>0</b><em>0%</em></span>
                  </div>
                </div>
              </div>
              <div className={styles.activityPanel}>
                <div className={styles.panelHeader}><strong><LandingIcon name="file" size={12} />{t('recentActivity')}</strong><span>{t('viewAll')} →</span></div>
                {preview.activities.map((activity) => (
                  <div className={styles.activity} key={`${activity.kind}-${activity.supplier}`}>
                    <span className={`${styles.activityIcon} ${styles[activity.kind]}`}><LandingIcon name={activity.kind === 'added' ? 'users' : activity.kind === 'expiring' ? 'clock' : 'file'} size={10} /></span>
                    <span><strong>{t(`activity.${activity.kind}`)}</strong><small>{activity.supplier}{activity.detail ? ` – ${locale === 'en' ? activity.detailEn : activity.detail}` : ''}</small></span>
                    <em>{locale === 'en' ? activity.timeEn : activity.time}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
