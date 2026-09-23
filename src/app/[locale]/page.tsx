import {getTranslations, setRequestLocale} from 'next-intl/server';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {PublicContainer} from '@/components/layout/PublicContainer';
import styles from './page.module.css';

export default async function PlaceholderPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Foundation');

  return (
    <main className={styles.page}>
      <PublicContainer>
        <div className={styles.content}>
          <BrandWordmark />
          <h1 className="text-page-title">{t('placeholderTitle')}</h1>
          <p className="text-body-secondary">{t('placeholderDescription')}</p>
        </div>
      </PublicContainer>
    </main>
  );
}
