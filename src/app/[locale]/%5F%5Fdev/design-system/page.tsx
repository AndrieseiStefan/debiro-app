import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {PublicContainer} from '@/components/layout/PublicContainer';
import {Button} from '@/components/ui/Button';
import {Divider} from '@/components/ui/Divider';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {Field} from '@/components/ui/Field';
import {LoadingBlock} from '@/components/ui/LoadingBlock';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import {isDesignPreviewAvailable} from '@/lib/development';
import styles from './page.module.css';

export default async function DesignSystemPreview({params}: {params: Promise<{locale: string}>}) {
  if (!isDesignPreviewAvailable()) notFound();
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Foundation');

  return (
    <main className={styles.preview}>
      <PublicContainer>
        <div className={styles.stack}>
          <header className={styles.intro}>
            <BrandWordmark />
            <div>
              <h1 className="text-page-title">{t('previewTitle')}</h1>
              <p className="text-body-secondary">{t('previewDescription')}</p>
            </div>
          </header>

          <Surface>
            <div className={styles.section}>
              <h2 className="text-section-title">{t('typography')}</h2>
              <p className="text-display">{t('previewTitle')}</p>
              <p className="text-card-title">{t('previewDescription')}</p>
              <p className="text-body-secondary">{t('fieldHelper')}</p>
              <p className="text-caption">{t('fieldHelper')}</p>
            </div>
          </Surface>

          <Surface>
            <div className={styles.section}>
              <h2 className="text-section-title">{t('actions')}</h2>
              <div className={styles.row}>
                <Button>{t('primaryAction')}</Button>
                <Button variant="secondary">{t('secondaryAction')}</Button>
                <Button variant="ghost">{t('textAction')}</Button>
                <Button variant="destructive">{t('dangerAction')}</Button>
                <Button disabled>{t('disabledAction')}</Button>
                <Button loading loadingLabel={t('loadingLabel')}>{t('loadingAction')}</Button>
              </div>
            </div>
          </Surface>

          <Surface>
            <div className={styles.section}>
              <h2 className="text-section-title">{t('fields')}</h2>
              <div className={styles.fieldGrid}>
                <Field id="preview-field" label={t('fieldLabel')} helperText={t('fieldHelper')} required />
                <Field id="preview-error" label={t('fieldLabel')} error={t('fieldError')} />
                <Field id="preview-disabled" label={t('fieldLabel')} disabled />
                <Field id="preview-readonly" label={t('fieldLabel')} readOnly value={t('fieldHelper')} />
              </div>
            </div>
          </Surface>

          <Surface>
            <div className={styles.section}>
              <h2 className="text-section-title">{t('statuses')}</h2>
              <div className={styles.row}>
                <StatusBadge tone="success">{t('statusSuccess')}</StatusBadge>
                <StatusBadge tone="warning">{t('statusWarning')}</StatusBadge>
                <StatusBadge tone="danger">{t('statusDanger')}</StatusBadge>
                <StatusBadge tone="neutral">{t('statusNeutral')}</StatusBadge>
                <StatusBadge tone="info">{t('statusInfo')}</StatusBadge>
              </div>
            </div>
          </Surface>

          <Divider />

          <section className={styles.section}>
            <h2 className="text-section-title">{t('asyncStates')}</h2>
            <div className={styles.stateGrid}>
              <Surface><LoadingBlock label={t('loadingLabel')} /></Surface>
              <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
              <ErrorState
                title={t('errorTitle')}
                description={t('errorDescription')}
                retryAction={<Button variant="secondary">{t('retry')}</Button>}
              />
            </div>
          </section>
        </div>
      </PublicContainer>
    </main>
  );
}
