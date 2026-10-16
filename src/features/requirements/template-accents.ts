import type {CSSProperties} from 'react';
import {requirementTemplateScope} from './template-scope';
import type {LocalizedText, RequirementTemplate, RequirementTemplateScope} from './types';

export const templateAccentFamilies = ['blue', 'green', 'orange', 'violet', 'teal', 'rose', 'indigo', 'cyan'] as const;
export type TemplateAccentToken = typeof templateAccentFamilies[number] | `${typeof templateAccentFamilies[number]}-${'light' | 'deep'}`;
export const templateAccentTokens: readonly TemplateAccentToken[] = [...templateAccentFamilies,
  ...templateAccentFamilies.map((color) => `${color}-light` as const), ...templateAccentFamilies.map((color) => `${color}-deep` as const)];
export function validTemplateAccent(value: unknown): value is TemplateAccentToken {
  return templateAccentTokens.some((token) => token === value);
}

/** Allocate once on the company template, never from a rendered row's position or name. */
export function nextTemplateAccent(templates: {accentToken?: unknown}[]): TemplateAccentToken {
  const counts = templateAccentTokens.map((token) => templates.filter((template) => template.accentToken === token).length);
  return templateAccentTokens[counts.indexOf(Math.min(...counts))];
}

/** Pure legacy backfill; stable ID ordering is used only for initially unassigned templates. */
export function assignTemplateAccents<T extends {id: string; accentToken?: unknown}>(templates: T[]): (T & {accentToken: TemplateAccentToken})[] {
  const assigned = templates.filter((template) => validTemplateAccent(template.accentToken));
  const additions = new Map<string, TemplateAccentToken>();
  for (const template of templates.filter((item) => !validTemplateAccent(item.accentToken)).toSorted((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const accentToken = nextTemplateAccent(assigned);
    additions.set(template.id, accentToken); assigned.push({...template, accentToken});
  }
  return templates.map((template) => validTemplateAccent(template.accentToken) ? template as T & {accentToken: TemplateAccentToken} : {...template, accentToken: additions.get(template.id)!});
}

export type TemplateSource = {templateId: string; name: LocalizedText; accentToken: TemplateAccentToken | null};
/** Explicit owned associations only. The persisted ID order chooses the single row accent. */
export function resolveTemplateSources(templates: RequirementTemplate[], companyId: string, scope: RequirementTemplateScope, ids: unknown, names?: Record<string, LocalizedText>): TemplateSource[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id): id is string => typeof id === 'string'))].flatMap((id) => {
    const template = templates.find((item) => item.id === id && item.companyId === companyId && requirementTemplateScope(item) === scope);
    if (!template || typeof template.title?.ro !== 'string' || typeof template.title?.en !== 'string') return [];
    const snapshot = names?.[id];
    return [{templateId: id, name: typeof snapshot?.ro === 'string' && typeof snapshot?.en === 'string' ? snapshot : template.title,
      accentToken: validTemplateAccent(template.accentToken) ? template.accentToken : null}];
  });
}

export function templateAccentStyle(token: unknown): CSSProperties | undefined {
  if (!validTemplateAccent(token)) return undefined;
  const [family, shade] = token.split('-');
  return {'--template-accent': `var(--template-accent-${family})`, '--template-ink': `var(--template-ink-${family})`,
    '--template-row-weight': shade === 'light' ? '4%' : shade === 'deep' ? '8%' : '6%',
    '--template-badge-weight': shade === 'light' ? '10%' : shade === 'deep' ? '23%' : '16%'} as CSSProperties;
}
