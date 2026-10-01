'use client';

import {forwardRef, type ButtonHTMLAttributes} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from './Button';
import styles from './FilterPanel.module.css';

export const FilterTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {activeCount: number}>(function FilterTrigger({activeCount, className, ...props}, ref) {
  const t = useTranslations('DataFilters');
  return <Button {...props} ref={ref} variant="secondary" className={[styles.trigger, className].filter(Boolean).join(' ')}>
    <AppIcon name="filter" size={18}/>{t('trigger')}{activeCount > 0 ? ` (${activeCount})` : ''}
  </Button>;
});
