'use client';

import {useTranslations} from 'next-intl';
import {useId} from 'react';
import {AppIcon} from '@/components/layout/AppIcon';
import {SelectField} from './SelectField';
import styles from './Pagination.module.css';

/** Same previous/page/next and page-size pattern as the existing authenticated tables. */
export function Pagination({page, pageCount, pageSize, total, onPage, onPageSize}: {
  page: number; pageCount: number; pageSize: number; total: number; onPage: (page: number) => void; onPageSize: (size: number) => void;
}) {
  const t = useTranslations('DataPagination');
  const id = useId();
  const pages = Array.from({length: pageCount}, (_, index) => index + 1).filter((number) => number === 1 || number === pageCount || Math.abs(number - page) <= 1);
  return <div className={styles.footer}>
    <div className={styles.size}><span>{t('show')}</span><SelectField id={id} label={t('pageSize')} value={String(pageSize)} controlSize="compact" onChange={(event) => onPageSize(Number(event.target.value))}>{[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}</SelectField><span>{t('ofTotal', {count: total})}</span></div>
    <nav className={styles.pages} aria-label={t('pagination')}>
      <button type="button" aria-label={t('previousPage')} disabled={page === 1} onClick={() => onPage(page - 1)}><AppIcon name="chevronRight" size={16} className={styles.previous}/></button>
      {pages.map((number, index) => <span key={number}>{index > 0 && number - pages[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}<button type="button" aria-label={t('pageNumber', {page: number})} aria-current={number === page ? 'page' : undefined} onClick={() => onPage(number)}>{number}</button></span>)}
      <button type="button" aria-label={t('nextPage')} disabled={page === pageCount} onClick={() => onPage(page + 1)}><AppIcon name="chevronRight" size={16}/></button>
    </nav>
  </div>;
}
