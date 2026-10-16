'use client';

import {useTranslations} from 'next-intl';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {AppIcon} from '@/components/layout/AppIcon';
import {templateAccentStyle, type TemplateSource} from './template-accents';
import styles from './TemplateSources.module.css';

export function TemplateSourceLabels({sources, hasTemplateSource, locale}: {sources: TemplateSource[]; hasTemplateSource: boolean; locale: 'ro' | 'en'}) {
  const t = useTranslations('VendorTemplates');
  return <span className={styles.sources}>{sources.length ? sources.map((source) => <StatusBadge key={source.templateId} tone="neutral" indicator="none" size="source" className={styles.accent}
    style={templateAccentStyle(source.accentToken)} data-template-id={source.templateId} data-template-accent={source.accentToken ?? undefined}>{t('templateSource', {name: source.name[locale]})}</StatusBadge>)
    : <StatusBadge tone="neutral" indicator="none" size="source">{t(hasTemplateSource ? 'sourceUnavailable' : 'manualSource')}</StatusBadge>}</span>;
}

/** Existing applied-template chip semantics, sharing the source palette and Badge primitive. */
export function AppliedTemplateChip({name, accentToken, onRemove}: {name: string; accentToken: TemplateSource['accentToken']; onRemove: () => void}) {
  const t = useTranslations('VendorTemplates');
  return <StatusBadge tone="neutral" indicator="none" size="template" className={styles.accent} data-template-accent={accentToken ?? undefined} style={templateAccentStyle(accentToken)}>
    <span>{name}</span><button type="button" className={styles.remove} aria-label={t('removeAssociation', {name})} onClick={onRemove}><AppIcon name="close" size={14}/></button>
  </StatusBadge>;
}
