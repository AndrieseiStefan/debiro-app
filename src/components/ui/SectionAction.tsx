'use client';

import type {ComponentProps} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button, ButtonLink, type ButtonProps} from './Button';

type SectionActionProps =
  | {mode: 'expand'; expanded: boolean; onClick: ButtonProps['onClick']; disabled?: boolean; controls?: string}
  | {mode: 'navigate'; href: ComponentProps<typeof ButtonLink>['href']; children: React.ReactNode};

/** Promoted from Dashboard: common section treatment, distinct disclosure/link semantics. */
export function SectionAction(props: SectionActionProps) {
  const t = useTranslations('SectionActions');
  if (props.mode === 'navigate') return <ButtonLink variant="section" href={props.href}>{props.children}<AppIcon name="arrowRight" size={16}/></ButtonLink>;
  return <Button variant="section" aria-expanded={props.expanded} aria-controls={props.controls} disabled={props.disabled} onClick={props.onClick}>{t(props.expanded ? 'showLess' : 'viewAll')}<AppIcon name="chevronDown" size={16}/></Button>;
}
